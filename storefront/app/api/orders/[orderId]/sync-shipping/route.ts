import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyShipmentStatus } from "@/lib/notifications";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { formatAccurateEdd, getShiprocketOrder } from "@/lib/shiprocket";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_NUMBER_PATTERN = /^ZUC-[A-Z0-9-]{6,40}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const isAuthorized = await isAuthorizedAdminOrInternal(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Admin or secret key required." }, { status: 401 });
    }

    const { orderId } = await params;
    if (!UUID_PATTERN.test(orderId) && !ORDER_NUMBER_PATTERN.test(orderId)) {
      return NextResponse.json({ error: "Invalid order identifier" }, { status: 400 });
    }
    const db = supabaseAdmin();

    const orderQuery = db
      .from("orders")
      .select("*");
    const { data: order, error: orderError } = UUID_PATTERN.test(orderId)
      ? await orderQuery.eq("id", orderId).maybeSingle()
      : await orderQuery.eq("order_number", orderId).maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.shiprocket_order_id) {
      return NextResponse.json({ error: "Order does not have a linked Shiprocket Order ID" }, { status: 400 });
    }

    let srData: Record<string, unknown>;
    try {
      srData = await getShiprocketOrder(String(order.shiprocket_order_id)) as Record<string, unknown>;
    } catch (error) {
      console.error("Shiprocket order sync failed:", error);
      return NextResponse.json({ error: "Shiprocket is temporarily unavailable. Please retry shortly." }, { status: 502 });
    }
    const nestedData = srData.data;
    const orderData = nestedData && typeof nestedData === "object"
      ? nestedData as Record<string, unknown>
      : srData;
    const shipments = Array.isArray(orderData.shipments) ? orderData.shipments : [orderData.shipment ?? {}];
    const latestShipment = shipments[0] && typeof shipments[0] === "object"
      ? shipments[0] as Record<string, unknown>
      : {};

    const awb = latestShipment.awb ?? latestShipment.awb_code ?? orderData.awb_code ?? order.tracking_awb;
    const courier = latestShipment.courier ?? latestShipment.courier_name ?? orderData.courier_name ?? order.courier_name;
    const rawStatus = latestShipment.current_status ?? orderData.status ?? "Processing";
    const trackingUrl = awb ? `https://shiprocket.co/tracking/${awb}` : order.tracking_url;
    const rawEdd = latestShipment.edd ?? latestShipment.expected_date ?? orderData.edd ?? orderData.expected_date;
    const accurateEdd = formatAccurateEdd(rawEdd);

    const isNewlyDispatched = Boolean(awb && !order.tracking_awb);

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (awb) update.tracking_awb = awb;
    if (courier) update.courier_name = courier;
    if (trackingUrl) update.tracking_url = trackingUrl;
    if (accurateEdd) update.estimated_delivery_window = accurateEdd;
    if (rawStatus) {
      const s = String(rawStatus).toLowerCase();
      if (s.includes("delivered")) update.status = "delivered";
      else if (s.includes("out for delivery")) update.status = "out_for_delivery";
      else if (s.includes("shipped") || s.includes("transit") || s.includes("picked") || awb) update.status = "shipped";
    }

    await db.from("orders").update(update).eq("id", order.id);

    if (isNewlyDispatched) {
      await notifyShipmentStatus(order.id, "Dispatched & In Transit").catch((err) => {
        console.error("Auto-sync dispatch notification error:", err);
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.order_number,
      shiprocketStatus: rawStatus,
      trackingAwb: awb,
      courierName: courier,
      trackingUrl,
      notified: isNewlyDispatched,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

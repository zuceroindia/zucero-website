import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyShipmentStatus } from "@/lib/notifications";

const SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external";
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getShiprocketToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) throw new Error("Shiprocket API credentials are not configured");

  const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Shiprocket auth failed (${response.status})`);
  const data = await response.json();
  cachedToken = { value: data.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return data.token;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const db = supabaseAdmin();

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("*")
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.shiprocket_order_id) {
      return NextResponse.json({ error: "Order does not have a linked Shiprocket Order ID" }, { status: 400 });
    }

    const authToken = await getShiprocketToken();
    const srResponse = await fetch(`${SHIPROCKET_API_BASE}/orders/show/${order.shiprocket_order_id}`, {
      headers: { authorization: `Bearer ${authToken}` },
      cache: "no-store",
    });

    if (!srResponse.ok) {
      const errText = await srResponse.text().catch(() => "");
      return NextResponse.json({ error: `Shiprocket API error (${srResponse.status}): ${errText}` }, { status: 502 });
    }

    const srData = await srResponse.json();
    const orderData = srData.data ?? srData;
    const shipments = Array.isArray(orderData.shipments) ? orderData.shipments : [orderData.shipment ?? {}];
    const latestShipment = shipments[0] || {};

    const awb = latestShipment.awb ?? latestShipment.awb_code ?? orderData.awb_code ?? order.tracking_awb;
    const courier = latestShipment.courier ?? latestShipment.courier_name ?? orderData.courier_name ?? order.courier_name;
    const rawStatus = latestShipment.current_status ?? orderData.status ?? "Processing";
    const trackingUrl = awb ? `https://shiprocket.co/tracking/${awb}` : order.tracking_url;

    const isNewlyDispatched = Boolean(awb && !order.tracking_awb);

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (awb) update.tracking_awb = awb;
    if (courier) update.courier_name = courier;
    if (trackingUrl) update.tracking_url = trackingUrl;
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

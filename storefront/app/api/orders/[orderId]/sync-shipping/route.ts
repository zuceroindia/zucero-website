import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyShipmentStatus } from "@/lib/notifications";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import {
  findShiprocketOrdersByChannelOrderId,
  formatAccurateEdd,
  getShiprocketOrder,
} from "@/lib/shiprocket";
import { extractShiprocketSnapshot, mapShiprocketStatus } from "@/lib/shipping-status";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_NUMBER_PATTERN = /^ZUC-[A-Z0-9-]{6,40}$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function candidateOrders(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload.map(record);
  const root = record(payload);
  if (Array.isArray(root.data)) return root.data.map(record);
  const nested = record(root.data);
  if (Array.isArray(nested.data)) return nested.data.map(record);
  return [];
}

function previousIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    if (!(await isAuthorizedAdminOrInternal(request))) {
      return NextResponse.json({ error: "Unauthorized. Admin or secret key required." }, { status: 401 });
    }

    const { orderId } = await params;
    if (!UUID_PATTERN.test(orderId) && !ORDER_NUMBER_PATTERN.test(orderId)) {
      return NextResponse.json({ error: "Invalid order identifier" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const orderQuery = db.from("orders").select("*");
    const { data: order, error: orderError } = UUID_PATTERN.test(orderId)
      ? await orderQuery.eq("id", orderId).maybeSingle()
      : await orderQuery.eq("order_number", orderId).maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.shiprocket_order_id) {
      return NextResponse.json({ error: "Order does not have a linked Shiprocket Order ID" }, { status: 400 });
    }

    let resolvedShiprocketOrderId = String(order.shiprocket_order_id);
    let cloneDetected = false;
    const cloneUpdate: Record<string, unknown> = {};

    try {
      const lookup = await findShiprocketOrdersByChannelOrderId(String(order.order_number));
      const candidates = candidateOrders(lookup)
        .filter((item) => text(item.id || item.order_id))
        .sort((a, b) => Number(text(b.id || b.order_id)) - Number(text(a.id || a.order_id)));

      const latest = candidates[0];
      const latestId = latest ? text(latest.id || latest.order_id) : "";

      if (latestId && latestId !== resolvedShiprocketOrderId) {
        cloneDetected = true;
        const oldIds = previousIds(order.shiprocket_previous_order_ids);
        if (!oldIds.includes(resolvedShiprocketOrderId)) oldIds.push(resolvedShiprocketOrderId);
        resolvedShiprocketOrderId = latestId;
        cloneUpdate.shiprocket_order_id = latestId;
        cloneUpdate.shiprocket_previous_order_ids = oldIds;
        cloneUpdate.shiprocket_clone_count = Number(order.shiprocket_clone_count || 0) + 1;
        cloneUpdate.shiprocket_cloned_at = new Date().toISOString();
      }
    } catch (lookupError) {
      console.warn("Shiprocket clone reconciliation lookup failed:", lookupError);
    }

    let srData: Record<string, unknown>;
    try {
      srData = await getShiprocketOrder(resolvedShiprocketOrderId) as Record<string, unknown>;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Shiprocket is temporarily unavailable";
      await db.from("orders").update({
        ...cloneUpdate,
        last_shiprocket_sync_at: new Date().toISOString(),
        shiprocket_sync_error: detail.slice(0, 500),
      }).eq("id", order.id);
      console.error("Shiprocket order sync failed:", error);
      return NextResponse.json({ error: "Shiprocket is temporarily unavailable. Please retry shortly." }, { status: 502 });
    }

    const snapshot = extractShiprocketSnapshot(srData);
    const awb = snapshot.awb || order.tracking_awb;
    const courier = snapshot.courier || order.courier_name;
    const rawStatus = snapshot.rawStatus || order.shipment_status || order.status || "Processing";
    const trackingUrl = snapshot.trackingUrl || (awb ? `https://shiprocket.co/tracking/${awb}` : order.tracking_url);
    const accurateEdd = formatAccurateEdd(snapshot.edd);
    const shipmentId = snapshot.shipmentId || order.shiprocket_shipment_id;
    const status = mapShiprocketStatus(rawStatus, Boolean(awb));

    const statusUpdatedAt = new Date().toISOString();
    const isNewlyDispatched = Boolean(awb && !order.tracking_awb);
    const statusChanged = String(rawStatus) !== String(order.shipment_status || "");

    const update: Record<string, unknown> = {
      ...cloneUpdate,
      status,
      shipment_status: String(rawStatus),
      shipment_status_updated_at: statusUpdatedAt,
      last_shiprocket_sync_at: statusUpdatedAt,
      shiprocket_sync_error: null,
      updated_at: statusUpdatedAt,
      shiprocket_order_id: resolvedShiprocketOrderId,
    };

    if (awb) update.tracking_awb = awb;
    if (courier) update.courier_name = courier;
    if (trackingUrl) update.tracking_url = trackingUrl;
    if (accurateEdd) update.estimated_delivery_window = accurateEdd;
    if (shipmentId) update.shiprocket_shipment_id = shipmentId;

    const { error: updateError } = await db.from("orders").update(update).eq("id", order.id);
    if (updateError) {
      throw new Error(`Could not save live Shiprocket status: ${updateError.message}`);
    }

    if (isNewlyDispatched || statusChanged || cloneDetected) {
      const label = cloneDetected
        ? `Shiprocket order recreated · ${String(rawStatus)}`
        : String(rawStatus);
      await notifyShipmentStatus(order.id, label).catch((err) => {
        console.error("Shiprocket status notification error:", err);
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.order_number,
      status,
      shiprocketStatus: rawStatus,
      trackingAwb: awb || null,
      courierName: courier || null,
      trackingUrl: trackingUrl || null,
      estimatedDeliveryWindow: accurateEdd || order.estimated_delivery_window || null,
      shiprocketOrderId: resolvedShiprocketOrderId,
      cloneDetected,
      lastSyncedAt: statusUpdatedAt,
      notified: isNewlyDispatched || statusChanged || cloneDetected,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

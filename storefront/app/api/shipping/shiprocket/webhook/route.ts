import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyShipmentStatus } from "@/lib/notifications";
import { formatAccurateEdd } from "@/lib/shiprocket";
import { displayShippingStatus, mapShiprocketStatus } from "@/lib/shipping-status";

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

type ShippingOrder = {
  id: string;
  order_number: string;
  shiprocket_order_id?: string | null;
  shiprocket_shipment_id?: string | null;
  shiprocket_clone_count?: number | null;
  shiprocket_previous_order_ids?: unknown;
};

function previousIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

export async function POST(request: Request) {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET?.trim();
  const url = new URL(request.url);

  const supplied = request.headers.get("x-zucero-webhook-secret")
    ?? request.headers.get("x-api-key")
    ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? url.searchParams.get("secret")
    ?? url.searchParams.get("token");

  if (secret && supplied !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = record(await request.json().catch(() => ({})));
    const dataObj = Object.keys(record(payload.data)).length
      ? record(payload.data)
      : Object.keys(record(payload.shipment)).length
        ? record(payload.shipment)
        : payload;

    const awb = text(
      dataObj.awb ??
      dataObj.awb_code ??
      dataObj.AWB ??
      dataObj.tracking_number ??
      payload.awb ??
      payload.awb_code
    );
    const shiprocketOrderId = text(
      dataObj.sr_order_id ??
      dataObj.shiprocket_order_id ??
      payload.sr_order_id ??
      payload.shiprocket_order_id
    );
    const shipmentId = text(
      dataObj.shipment_id ??
      dataObj.id ??
      payload.shipment_id
    );
    const merchantOrderId = text(
      dataObj.order_id ??
      dataObj.order_number ??
      dataObj.channel_order_id ??
      payload.order_id ??
      payload.order_number ??
      payload.channel_order_id
    );
    const rawStatus = text(
      dataObj.current_status ??
      dataObj.shipment_status ??
      dataObj.status ??
      dataObj.current_status_id ??
      payload.current_status ??
      payload.shipment_status ??
      payload.status
    ) || (awb ? "Dispatched" : "Shipment updated");
    const courier = text(
      dataObj.courier_name ??
      dataObj.courier ??
      dataObj.courier_company_name ??
      payload.courier_name ??
      payload.courier
    );
    const trackingUrl = text(
      dataObj.tracking_url ??
      dataObj.track_url ??
      payload.tracking_url
    ) || (awb ? `https://shiprocket.co/tracking/${awb}` : "");
    const edd = text(
      dataObj.edd ??
      dataObj.expected_date ??
      dataObj.etd ??
      payload.edd ??
      payload.expected_date
    );
    const accurateEdd = formatAccurateEdd(edd);

    const db = supabaseAdmin();
    let order: ShippingOrder | null = null;

    if (awb) {
      const { data } = await db.from("orders").select("*").eq("tracking_awb", awb).maybeSingle();
      order = data as ShippingOrder | null;
    }
    if (!order && shiprocketOrderId) {
      const { data } = await db.from("orders").select("*").eq("shiprocket_order_id", shiprocketOrderId).maybeSingle();
      order = data as ShippingOrder | null;
    }
    if (!order && merchantOrderId) {
      const { data } = await db.from("orders").select("*").eq("order_number", merchantOrderId).maybeSingle();
      order = data as ShippingOrder | null;
    }

    if (!order) {
      return NextResponse.json({
        received: true,
        matched: false,
        merchantOrderId: merchantOrderId || null,
        shiprocketOrderId: shiprocketOrderId || null,
      });
    }

    const status = mapShiprocketStatus(rawStatus, Boolean(awb));
    const statusUpdatedAt = new Date().toISOString();
    const update: Record<string, unknown> = {
      status,
      shipment_status: rawStatus,
      shipment_status_updated_at: statusUpdatedAt,
      last_shiprocket_sync_at: statusUpdatedAt,
      shiprocket_sync_error: null,
      updated_at: statusUpdatedAt,
    };

    if (awb) update.tracking_awb = awb;
    if (courier) update.courier_name = courier;
    if (trackingUrl) update.tracking_url = trackingUrl;
    if (accurateEdd) update.estimated_delivery_window = accurateEdd;
    if (shipmentId) update.shiprocket_shipment_id = shipmentId;

    const existingShiprocketOrderId = order.shiprocket_order_id ? String(order.shiprocket_order_id) : "";
    const cloneDetected = Boolean(
      shiprocketOrderId &&
      existingShiprocketOrderId &&
      shiprocketOrderId !== existingShiprocketOrderId &&
      merchantOrderId &&
      merchantOrderId === order.order_number
    );

    if (shiprocketOrderId) {
      update.shiprocket_order_id = shiprocketOrderId;
    }

    if (cloneDetected) {
      const ids = previousIds(order.shiprocket_previous_order_ids);
      if (!ids.includes(existingShiprocketOrderId)) ids.push(existingShiprocketOrderId);
      update.shiprocket_previous_order_ids = ids;
      update.shiprocket_clone_count = Number(order.shiprocket_clone_count || 0) + 1;
      update.shiprocket_cloned_at = statusUpdatedAt;
    }

    const { error } = await db.from("orders").update(update).eq("id", order.id);
    if (error) throw new Error(`Could not save shipment update: ${error.message}`);

    const display = displayShippingStatus(rawStatus);
    await notifyShipmentStatus(
      order.id,
      cloneDetected ? `Shiprocket order recreated · ${display}` : display
    ).catch((notificationError) => {
      console.error("Shipment notification failed", notificationError);
    });

    return NextResponse.json({
      received: true,
      matched: true,
      orderNumber: order.order_number,
      status,
      shipmentStatus: rawStatus,
      cloneDetected,
      shiprocketOrderId: shiprocketOrderId || existingShiprocketOrderId || null,
    });
  } catch (error) {
    console.error("Shiprocket webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyShipmentStatus } from "@/lib/notifications";
import { formatAccurateEdd } from "@/lib/shiprocket";

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

type ShippingOrder = { id: string; shiprocket_order_id?: string | null };

function normalizeStatus(value: string) {
  const status = value.toLowerCase();
  if (status.includes("delivered")) return "delivered";
  if (status.includes("out for delivery") || status.includes("out_for_delivery")) return "out_for_delivery";
  if (status.includes("rto") || status.includes("return")) return "rto";
  if (status.includes("cancel")) return "cancelled";
  if (status.includes("undelivered") || status.includes("exception") || status.includes("ndr")) return "delivery_exception";
  if (status.includes("shipped") || status.includes("in transit") || status.includes("in_transit") || status.includes("picked")) return "shipped";
  return "processing";
}

function displayStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
      : Object.keys(record(payload.shipment)).length ? record(payload.shipment) : payload;

    const awb = text(dataObj.awb ?? dataObj.awb_code ?? dataObj.AWB ?? dataObj.tracking_number ?? payload.awb ?? payload.awb_code);
    const shiprocketOrderId = text(dataObj.sr_order_id ?? dataObj.shiprocket_order_id ?? payload.sr_order_id ?? payload.shiprocket_order_id);
    const merchantOrderId = text(dataObj.order_id ?? dataObj.order_number ?? dataObj.channel_order_id ?? payload.order_id ?? payload.order_number ?? payload.channel_order_id);
    const rawStatus = text(dataObj.current_status ?? dataObj.shipment_status ?? dataObj.status ?? dataObj.current_status_id ?? payload.current_status ?? payload.shipment_status ?? payload.status) || (awb ? "Dispatched" : "Shipment updated");
    const courier = text(dataObj.courier_name ?? dataObj.courier ?? dataObj.courier_company_name ?? payload.courier_name ?? payload.courier);
    const trackingUrl = text(dataObj.tracking_url ?? dataObj.track_url ?? payload.tracking_url) || (awb ? `https://shiprocket.co/tracking/${awb}` : "");
    const edd = text(dataObj.edd ?? dataObj.expected_date ?? dataObj.etd ?? payload.edd ?? payload.expected_date);
    const accurateEdd = formatAccurateEdd(edd);

    const db = supabaseAdmin();
    let order: ShippingOrder | null = null;
    if (awb) {
      const { data } = await db.from("orders").select("*").eq("tracking_awb", awb).maybeSingle();
      order = data;
    }
    if (!order && shiprocketOrderId) {
      const { data } = await db.from("orders").select("*").eq("shiprocket_order_id", shiprocketOrderId).maybeSingle();
      order = data;
    }
    if (!order && merchantOrderId) {
      const { data } = await db.from("orders").select("*").eq("order_number", merchantOrderId).maybeSingle();
      order = data;
    }

    if (!order) return NextResponse.json({ received: true, matched: false });

    const status = normalizeStatus(rawStatus);
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (awb) update.tracking_awb = awb;
    if (courier) update.courier_name = courier;
    if (trackingUrl) update.tracking_url = trackingUrl;
    if (accurateEdd) update.estimated_delivery_window = accurateEdd;
    if (shiprocketOrderId && !order.shiprocket_order_id) update.shiprocket_order_id = shiprocketOrderId;

    const { error } = await db.from("orders").update(update).eq("id", order.id);
    if (error) throw new Error(`Could not save shipment update: ${error.message}`);

    await notifyShipmentStatus(order.id, displayStatus(rawStatus)).catch((notificationError) => {
      console.error("Shipment notification failed", notificationError);
    });

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    console.error("Shiprocket webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatAccurateEdd, trackAwb } from "@/lib/shiprocket";

function titleStatus(value: string | null | undefined) {
  const status = (value ?? "processing").replaceAll("_", " ").trim();
  return status.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type TrackingPayload = Record<string, unknown> & {
  tracking_data?: Record<string, unknown>;
  shipment_track?: Record<string, unknown> | Array<Record<string, unknown>>;
};
type OrderRow = Record<string, unknown> & { id: string; order_number: string; status?: string; tracking_awb?: string; courier_name?: string; tracking_url?: string; estimated_delivery_window?: string; invoice_number?: string; shipping_address?: Record<string, unknown> };
type ItemRow = Record<string, unknown> & { order_id: string };

function extractTracking(payload: TrackingPayload) {
  const data = (payload.tracking_data ?? payload) as TrackingPayload;
  const firstTrack = Array.isArray(data.shipment_track) ? data.shipment_track[0] : data.shipment_track;
  const value = (...candidates: unknown[]) => candidates.find((candidate) => typeof candidate === "string") as string | undefined;
  const status = value(firstTrack?.current_status, data.current_status, data.shipment_status, data.track_status) ?? null;
  const courier = value(firstTrack?.courier_name, data.courier_name, data.courier) ?? null;
  const url = value(data.track_url, data.tracking_url) ?? null;
  const edd = value(firstTrack?.edd, data.expected_date, data.edd) ?? null;
  return { status, courier, url, edd };
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Please sign in to view your orders." }, { status: 401 });

  const db = supabaseAdmin();
  const { data: orders, error } = await db
    .from("orders")
    .select("id,order_number,status,payment_status,currency,subtotal_paise,tax_paise,shipping_paise,total_paise,shiprocket_order_id,shiprocket_shipment_id,tracking_awb,courier_name,tracking_url,shipping_address,created_at,estimated_delivery_window,invoice_number")
    .eq("customer_email", email)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load your orders." }, { status: 500 });

  const orderRows = (orders ?? []) as OrderRow[];
  const ids = orderRows.map((order) => order.id);
  const { data: items } = ids.length
    ? await db.from("order_items").select("order_id,sku,product_name,variant_label,quantity,unit_price_paise,line_total_paise").in("order_id", ids)
    : { data: [] as ItemRow[] };

  const itemRows = (items ?? []) as ItemRow[];
  const enriched = await Promise.all(orderRows.map(async (order) => {
    let liveStatus: string | null = null;
    let liveCourier: string | null = null;
    let liveTrackingUrl: string | null = null;
    let accurateDelivery: string | null = null;

    if (order.tracking_awb) {
      try {
        const tracking = extractTracking(await trackAwb(order.tracking_awb));
        liveStatus = tracking.status;
        liveCourier = tracking.courier;
        liveTrackingUrl = tracking.url;
        if (tracking.edd) {
          accurateDelivery = formatAccurateEdd(tracking.edd);
        }

        const update: Record<string, string> = {};
        if (liveCourier && !order.courier_name) update.courier_name = liveCourier;
        if (liveTrackingUrl && !order.tracking_url) update.tracking_url = liveTrackingUrl;
        if (accurateDelivery && order.estimated_delivery_window !== accurateDelivery) {
          update.estimated_delivery_window = accurateDelivery;
        }
        if (Object.keys(update).length) await db.from("orders").update(update).eq("id", order.id);
      } catch (trackingError) {
        console.warn("Customer live tracking refresh failed", trackingError);
      }
    }

    const isShipped = Boolean(
      order.tracking_awb ||
      ["shipped", "delivered", "out_for_delivery"].includes(String(liveStatus || order.status).toLowerCase())
    );

    const addr = order.shipping_address ?? {};
    const deliveryWindow = isShipped
      ? (accurateDelivery || order.estimated_delivery_window || addr.estimated_delivery_window || "Shipment in transit (5–7 days)")
      : "5–7 days";
    const invoiceNum = order.invoice_number || addr.invoice_number || `INV-${order.order_number}`;

    return {
      ...order,
      estimated_delivery_window: deliveryWindow,
      invoice_number: invoiceNum,
      display_status: titleStatus(liveStatus || order.status),
      courier_name: liveCourier || order.courier_name,
      tracking_url: liveTrackingUrl || order.tracking_url,
      items: itemRows.filter((item) => item.order_id === order.id),
    };
  }));

  return NextResponse.json({ user: { email }, orders: enriched });
}

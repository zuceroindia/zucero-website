import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatAccurateEdd, getShiprocketOrder, trackAwb } from "@/lib/shiprocket";
import { extractShiprocketSnapshot, mapShiprocketStatus } from "@/lib/shipping-status";

function titleStatus(value: string | null | undefined) {
  const status = (value ?? "processing").replaceAll("_", " ").trim();
  return status.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type TrackingPayload = Record<string, unknown> & {
  tracking_data?: Record<string, unknown>;
  shipment_track?: Record<string, unknown> | Array<Record<string, unknown>>;
};
type OrderRow = Record<string, unknown> & { id: string; order_number: string; status?: string; tracking_awb?: string; courier_name?: string; tracking_url?: string; estimated_delivery_window?: string; invoice_number?: string; shipping_address?: Record<string, unknown>; shiprocket_order_id?: string; shipment_status?: string; shipment_status_updated_at?: string; admin_archived_at?: string; admin_archived_reason?: string; shiprocket_clone_count?: number; shiprocket_cloned_at?: string; last_shiprocket_sync_at?: string; shiprocket_sync_error?: string };
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
    .select("id,order_number,status,payment_status,currency,subtotal_paise,tax_paise,shipping_paise,total_paise,shiprocket_order_id,shiprocket_shipment_id,tracking_awb,courier_name,tracking_url,shipping_address,created_at,updated_at,estimated_delivery_window,invoice_number,shipment_status,shipment_status_updated_at,admin_archived_at,admin_archived_reason,shiprocket_clone_count,shiprocket_cloned_at,last_shiprocket_sync_at,shiprocket_sync_error")
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
    let liveAwb: string | null = order.tracking_awb || null;

    const storedStatus = String(order.status || "processing").toLowerCase();
    const finalStatus = ["delivered", "cancelled", "refunded"].includes(storedStatus);

    try {
      if (order.tracking_awb && !finalStatus) {
        const tracking = extractTracking(await trackAwb(order.tracking_awb));
        liveStatus = tracking.status;
        liveCourier = tracking.courier;
        liveTrackingUrl = tracking.url;
        if (tracking.edd) accurateDelivery = formatAccurateEdd(tracking.edd);
      } else if (order.shiprocket_order_id && !finalStatus) {
        const snapshot = extractShiprocketSnapshot(await getShiprocketOrder(String(order.shiprocket_order_id)));
        liveStatus = snapshot.rawStatus;
        liveCourier = snapshot.courier;
        liveTrackingUrl = snapshot.trackingUrl;
        liveAwb = snapshot.awb || liveAwb;
        if (snapshot.edd) accurateDelivery = formatAccurateEdd(snapshot.edd);
      }

      if (liveStatus || liveCourier || liveTrackingUrl || liveAwb || accurateDelivery) {
        const now = new Date().toISOString();
        const update: Record<string, unknown> = {
          last_shiprocket_sync_at: now,
          shiprocket_sync_error: null,
          updated_at: now,
        };

        if (liveStatus) {
          update.status = mapShiprocketStatus(liveStatus, Boolean(liveAwb));
          update.shipment_status = liveStatus;
          update.shipment_status_updated_at = now;
        }
        if (liveCourier) update.courier_name = liveCourier;
        if (liveTrackingUrl) update.tracking_url = liveTrackingUrl;
        if (liveAwb && !order.tracking_awb) {
          update.tracking_awb = liveAwb;
          if (!liveTrackingUrl) update.tracking_url = `https://shiprocket.co/tracking/${liveAwb}`;
        }
        if (accurateDelivery) update.estimated_delivery_window = accurateDelivery;

        await db.from("orders").update(update).eq("id", order.id);
      }
    } catch (trackingError) {
      const detail = trackingError instanceof Error ? trackingError.message : "Live Shiprocket refresh failed";
      console.warn("Customer live tracking refresh failed", trackingError);
      await db.from("orders").update({
        last_shiprocket_sync_at: new Date().toISOString(),
        shiprocket_sync_error: detail.slice(0, 500),
      }).eq("id", order.id);
    }

    const effectiveRawStatus = liveStatus || order.shipment_status || order.status || "processing";
    const effectiveStatus = liveStatus
      ? mapShiprocketStatus(liveStatus, Boolean(liveAwb))
      : String(order.status || "processing");

    const isShipped = Boolean(
      liveAwb ||
      ["shipped", "delivered", "out_for_delivery", "rto", "delivery_exception"].includes(
        String(effectiveStatus).toLowerCase()
      )
    );

    const addr = order.shipping_address ?? {};
    const deliveryWindow = isShipped
      ? (accurateDelivery || order.estimated_delivery_window || addr.estimated_delivery_window || "Shipment in transit (5–7 days)")
      : (order.estimated_delivery_window || "5–7 days");
    const invoiceNum = order.invoice_number || addr.invoice_number || `INV-${order.order_number}`;
    const trackingUrl = liveTrackingUrl || order.tracking_url || (liveAwb ? `https://shiprocket.co/tracking/${liveAwb}` : null);

    return {
      ...order,
      status: effectiveStatus,
      tracking_awb: liveAwb,
      estimated_delivery_window: deliveryWindow,
      invoice_number: invoiceNum,
      display_status: order.admin_archived_at && effectiveStatus === "cancelled"
        ? "Cancelled by Zucero"
        : titleStatus(effectiveRawStatus),
      shipment_status: effectiveRawStatus,
      courier_name: liveCourier || order.courier_name,
      tracking_url: trackingUrl,
      admin_archived: Boolean(order.admin_archived_at),
      admin_archived_at: order.admin_archived_at || null,
      admin_archived_reason: order.admin_archived_reason || null,
      shiprocket_clone_count: Number(order.shiprocket_clone_count || 0),
      shiprocket_cloned_at: order.shiprocket_cloned_at || null,
      items: itemRows.filter((item) => item.order_id === order.id),
    };
  }));

  return NextResponse.json({ user: { email }, orders: enriched });
}

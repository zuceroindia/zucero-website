import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { trackAwb } from "@/lib/shiprocket";

function titleStatus(value: string | null | undefined) {
  const status = (value ?? "processing").replaceAll("_", " ").trim();
  return status.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractTracking(payload: any) {
  const data = payload?.tracking_data ?? payload ?? {};
  const firstTrack = Array.isArray(data.shipment_track) ? data.shipment_track[0] : data.shipment_track;
  const status = firstTrack?.current_status ?? data.current_status ?? data.shipment_status ?? data.track_status ?? null;
  const courier = firstTrack?.courier_name ?? data.courier_name ?? data.courier ?? null;
  const url = data.track_url ?? data.tracking_url ?? null;
  return { status, courier, url };
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
    .select("id,order_number,status,payment_status,currency,subtotal_paise,tax_paise,shipping_paise,total_paise,shiprocket_order_id,shiprocket_shipment_id,tracking_awb,courier_name,tracking_url,shipping_address,created_at")
    .eq("customer_email", email)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load your orders." }, { status: 500 });

  const ids = (orders ?? []).map((order: any) => order.id);
  const { data: items } = ids.length
    ? await db.from("order_items").select("order_id,sku,product_name,variant_label,quantity,unit_price_paise,line_total_paise").in("order_id", ids)
    : { data: [] as any[] };

  const enriched = await Promise.all((orders ?? []).map(async (order: any) => {
    let liveStatus: string | null = null;
    let liveCourier: string | null = null;
    let liveTrackingUrl: string | null = null;
    if (order.tracking_awb) {
      try {
        const tracking = extractTracking(await trackAwb(order.tracking_awb));
        liveStatus = tracking.status;
        liveCourier = tracking.courier;
        liveTrackingUrl = tracking.url;
        const update: Record<string, string> = {};
        if (liveCourier && !order.courier_name) update.courier_name = liveCourier;
        if (liveTrackingUrl && !order.tracking_url) update.tracking_url = liveTrackingUrl;
        if (Object.keys(update).length) await db.from("orders").update(update).eq("id", order.id);
      } catch (trackingError) {
        console.warn("Customer live tracking refresh failed", trackingError);
      }
    }

    const addr = (order.shipping_address || {}) as Record<string, any>;
    const estimatedDelivery = order.estimated_delivery_window || addr.estimated_delivery_window || null;
    const invoiceNum = order.invoice_number || addr.invoice_number || `INV-${order.order_number}`;

    return {
      ...order,
      estimated_delivery_window: estimatedDelivery,
      invoice_number: invoiceNum,
      display_status: titleStatus(liveStatus || order.status),
      courier_name: liveCourier || order.courier_name,
      tracking_url: liveTrackingUrl || order.tracking_url,
      items: (items ?? []).filter((item: any) => item.order_id === order.id),
    };
  }));

  return NextResponse.json({ user: { email }, orders: enriched });
}

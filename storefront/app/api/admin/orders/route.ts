import { NextResponse } from "next/server";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const status = url.searchParams.get("status")?.trim().toLowerCase();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

    let query = db
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      if (status === "paid") {
        query = query.or("status.eq.paid,payment_status.eq.captured");
      } else if (status === "shipped") {
        query = query.or("status.eq.shipped,tracking_awb.not.is.null");
      } else {
        query = query.eq("status", status);
      }
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%,shipping_address->>fullName.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data: orders, count, error } = await query;
    if (error) throw error;

    type AdminOrderRecord = {
      id: string;
      order_number: string;
      created_at: string;
      status: string;
      payment_status: string;
      total_paise: number;
      subtotal_paise: number;
      tax_paise: number;
      shipping_paise: number;
      discount_paise?: number;
      wallet_spent_paise?: number;
      customer_email: string;
      customer_phone: string;
      shipping_address: Record<string, unknown> | null;
      billing_address: Record<string, unknown> | null;
      tracking_awb: string | null;
      courier_name: string | null;
      tracking_url: string | null;
      estimated_delivery_window: string | null;
      razorpay_payment_id: string | null;
    };

    const orderList: AdminOrderRecord[] = (orders as unknown as AdminOrderRecord[]) || [];
    const orderIds = orderList.map((o) => o.id);

    const { data: items } = await db
      .from("order_items")
      .select("order_id, product_name, variant_label, quantity, unit_price_paise, line_total_paise")
      .in("order_id", orderIds);

    const itemsByOrder = new Map<
      string,
      Array<{ product_name: string; variant_label: string; quantity: number; unit_price_paise: number; line_total_paise: number }>
    >();

    for (const it of items || []) {
      const existing = itemsByOrder.get(it.order_id) || [];
      existing.push(it);
      itemsByOrder.set(it.order_id, existing);
    }

    const formatted = orderList.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      createdAt: o.created_at,
      status: o.status,
      paymentStatus: o.payment_status,
      totalPaise: o.total_paise,
      totalRupees: (o.total_paise / 100).toFixed(2),
      subtotalRupees: (o.subtotal_paise / 100).toFixed(2),
      taxRupees: (o.tax_paise / 100).toFixed(2),
      shippingRupees: (o.shipping_paise / 100).toFixed(2),
      discountRupees: ((o.discount_paise || 0) / 100).toFixed(2),
      walletSpentRupees: ((o.wallet_spent_paise || 0) / 100).toFixed(2),
      customerEmail: o.customer_email,
      customerPhone: o.customer_phone,
      shippingAddress: o.shipping_address,
      billingAddress: o.billing_address,
      trackingAwb: o.tracking_awb,
      courierName: o.courier_name,
      trackingUrl: o.tracking_url,
      estimatedDeliveryWindow: o.estimated_delivery_window,
      razorpayPaymentId: o.razorpay_payment_id,
      items: itemsByOrder.get(o.id) || [],
    }));

    return NextResponse.json({
      orders: formatted,
      totalCount: count ?? formatted.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Admin orders query failed:", error);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }
}

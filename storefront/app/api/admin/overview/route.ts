import { NextResponse } from "next/server";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();

    // 1. Fetch Orders summary
    const { data: allOrders, error: ordersError } = await db
      .from("orders")
      .select("id, order_number, created_at, status, payment_status, total_paise, customer_email, customer_phone, tracking_awb, courier_name")
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    type OverviewOrderRow = {
      id: string;
      order_number: string;
      created_at: string;
      status: string;
      payment_status: string;
      total_paise: number;
      customer_email: string | null;
      customer_phone: string | null;
      tracking_awb: string | null;
      courier_name: string | null;
    };

    const orders: OverviewOrderRow[] = (allOrders as unknown as OverviewOrderRow[]) || [];
    const totalOrdersCount = orders.length;

    let totalRevenuePaise = 0;
    let paidOrdersCount = 0;
    let shippedOrdersCount = 0;
    const uniqueEmails = new Set<string>();

    for (const ord of orders) {
      if (ord.customer_email) uniqueEmails.add(ord.customer_email.toLowerCase());
      if (ord.status === "paid" || ord.payment_status === "captured") {
        totalRevenuePaise += ord.total_paise || 0;
        paidOrdersCount++;
      }
      if (ord.tracking_awb || ord.status === "shipped" || ord.status === "in_transit") {
        shippedOrdersCount++;
      }
    }

    // 2. Fetch Wallets summary
    const { data: wallets } = await db
      .from("wallets")
      .select("balance_paise, total_earned_paise, total_spent_paise");
    let totalWalletBalancePaise = 0;
    let totalEarnedReferralPaise = 0;
    for (const w of wallets || []) {
      totalWalletBalancePaise += w.balance_paise || 0;
      totalEarnedReferralPaise += w.total_earned_paise || 0;
    }

    // 3. Fetch Inquiries count
    const { count: inquiriesCount } = await db
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true });

    // 4. Fetch WhatsApp conversations count
    const { count: waConversationsCount } = await db
      .from("whatsapp_conversations")
      .select("*", { count: "exact", head: true });

    // 5. Recent 10 orders with items
    const recentOrderSlice = orders.slice(0, 10);
    const recentIds = recentOrderSlice.map((o) => o.id);

    const { data: items } = await db
      .from("order_items")
      .select("order_id, product_name, variant_label, quantity")
      .in("order_id", recentIds);

    const itemsByOrder = new Map<string, string>();
    for (const it of items || []) {
      const prev = itemsByOrder.get(it.order_id);
      itemsByOrder.set(
        it.order_id,
        prev
          ? `${prev}, ${it.product_name} (${it.variant_label}) × ${it.quantity}`
          : `${it.product_name} (${it.variant_label}) × ${it.quantity}`
      );
    }

    const recentOrders = recentOrderSlice.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      createdAt: o.created_at,
      status: o.status,
      paymentStatus: o.payment_status,
      totalRupees: (o.total_paise / 100).toFixed(2),
      customerEmail: o.customer_email,
      customerPhone: o.customer_phone,
      trackingAwb: o.tracking_awb,
      courierName: o.courier_name,
      itemsSummary: itemsByOrder.get(o.id) || "Zucero Pure Sugar Products",
    }));

    return NextResponse.json(
      {
        metrics: {
          totalRevenueRupees: (totalRevenuePaise / 100).toFixed(2),
          totalOrdersCount,
          paidOrdersCount,
          shippedOrdersCount,
          customersCount: uniqueEmails.size,
          totalWalletBalanceRupees: (totalWalletBalancePaise / 100).toFixed(2),
          totalEarnedReferralRupees: (totalEarnedReferralPaise / 100).toFixed(2),
          inquiriesCount: inquiriesCount || 0,
          waConversationsCount: waConversationsCount || 0,
        },
        recentOrders,
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Could not fetch admin overview" }, { status: 500 });
  }
}

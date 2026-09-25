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

    // 1. Fetch all orders to compute lifetime metrics
    const { data: allOrders } = await db
      .from("orders")
      .select("id, customer_email, customer_phone, total_paise, status, payment_status, created_at, shipping_address")
      .order("created_at", { ascending: false });

    // 2. Fetch all wallets
    const { data: wallets } = await db
      .from("wallets")
      .select("email, balance_paise");

    // 3. Fetch all referral codes
    const { data: referralCodes } = await db
      .from("referral_codes")
      .select("code, owner_email, total_earned_paise");

    const walletsMap = new Map<string, number>();
    for (const w of (wallets || []) as Array<{ email?: string; balance_paise?: number }>) {
      if (w.email) {
        walletsMap.set(w.email.toLowerCase(), w.balance_paise || 0);
      }
    }

    const refMap = new Map<string, string>();
    for (const r of (referralCodes || []) as Array<{ code: string; owner_email?: string }>) {
      if (r.owner_email) {
        refMap.set(r.owner_email.toLowerCase(), r.code);
      }
    }

    type CustomerProfile = {
      email: string;
      fullName: string;
      phone: string;
      ordersCount: number;
      totalSpentRupees: string;
      walletBalanceRupees: string;
      referralCode: string;
      firstOrderDate: string;
      lastOrderDate: string;
    };

    const customersMap = new Map<string, CustomerProfile>();

    for (const o of allOrders || []) {
      if (!o.customer_email) continue;
      const email = o.customer_email.toLowerCase();
      const addr = (o.shipping_address || {}) as { fullName?: string; phone?: string };
      const name = addr.fullName || "";
      const phone = o.customer_phone || addr.phone || "";
      const isPaid = o.status === "paid" || o.payment_status === "captured";

      const existing = customersMap.get(email);
      if (existing) {
        existing.ordersCount++;
        if (isPaid) {
          existing.totalSpentRupees = (
            parseFloat(existing.totalSpentRupees) + (o.total_paise || 0) / 100
          ).toFixed(2);
        }
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.fullName && name) existing.fullName = name;
        if (new Date(o.created_at) < new Date(existing.firstOrderDate)) {
          existing.firstOrderDate = o.created_at;
        }
      } else {
        customersMap.set(email, {
          email,
          fullName: name,
          phone,
          ordersCount: 1,
          totalSpentRupees: isPaid ? ((o.total_paise || 0) / 100).toFixed(2) : "0.00",
          walletBalanceRupees: (((walletsMap.get(email) || 0)) / 100).toFixed(2),
          referralCode: refMap.get(email) || "-",
          firstOrderDate: o.created_at,
          lastOrderDate: o.created_at,
        });
      }
    }

    let customerList = Array.from(customersMap.values());

    if (search) {
      customerList = customerList.filter(
        (c) =>
          c.email.includes(search) ||
          c.fullName.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          c.referralCode.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      customers: customerList,
      totalCount: customerList.length,
    });
  } catch (error) {
    console.error("Admin customers fetch failed:", error);
    return NextResponse.json({ error: "Could not load customers." }, { status: 500 });
  }
}

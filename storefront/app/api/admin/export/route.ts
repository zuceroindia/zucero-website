import { NextResponse } from "next/server";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "orders";
  const db = supabaseAdmin();
  const dateStr = new Date().toISOString().split("T")[0];

  try {
    if (type === "orders") {
      const { data: orders, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      type ExportOrderRecord = {
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
        courier_name?: string | null;
        tracking_awb?: string | null;
        tracking_url?: string | null;
        razorpay_payment_id?: string | null;
      };

      const orderList = (orders as unknown as ExportOrderRecord[]) || [];
      const orderIds = orderList.map((o) => o.id);
      const { data: items } = await db
        .from("order_items")
        .select("order_id, product_name, variant_label, quantity, unit_price_paise, line_total_paise")
        .in("order_id", orderIds);

      const itemsMap = new Map<string, string>();
      for (const it of items || []) {
        const prev = itemsMap.get(it.order_id);
        const desc = `${it.product_name} (${it.variant_label}) x ${it.quantity}`;
        itemsMap.set(it.order_id, prev ? `${prev} | ${desc}` : desc);
      }

      const headers = [
        "Order Number",
        "Date",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Address",
        "City",
        "State",
        "Pincode",
        "Items",
        "Subtotal (INR)",
        "Tax (INR)",
        "Shipping (INR)",
        "Discount (INR)",
        "Wallet Spent (INR)",
        "Total (INR)",
        "Status",
        "Payment Status",
        "Courier Name",
        "Tracking AWB",
        "Tracking URL",
        "Razorpay Payment ID",
      ];

      const rows = orderList.map((o) => {
        const addr = (o.shipping_address || {}) as {
          fullName?: string;
          phone?: string;
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          postalCode?: string;
        };

        const fullAddr = [addr.addressLine1, addr.addressLine2].filter(Boolean).join(", ");

        return [
          escapeCsv(o.order_number),
          escapeCsv(new Date(o.created_at).toLocaleString("en-IN")),
          escapeCsv(addr.fullName || ""),
          escapeCsv(o.customer_email || ""),
          escapeCsv(o.customer_phone || addr.phone || ""),
          escapeCsv(fullAddr),
          escapeCsv(addr.city || ""),
          escapeCsv(addr.state || ""),
          escapeCsv(addr.postalCode || ""),
          escapeCsv(itemsMap.get(o.id) || "Zucero Pure Sugar Products"),
          escapeCsv(((o.subtotal_paise || 0) / 100).toFixed(2)),
          escapeCsv(((o.tax_paise || 0) / 100).toFixed(2)),
          escapeCsv(((o.shipping_paise || 0) / 100).toFixed(2)),
          escapeCsv(((o.discount_paise || 0) / 100).toFixed(2)),
          escapeCsv(((o.wallet_spent_paise || 0) / 100).toFixed(2)),
          escapeCsv(((o.total_paise || 0) / 100).toFixed(2)),
          escapeCsv(o.status),
          escapeCsv(o.payment_status),
          escapeCsv(o.courier_name || ""),
          escapeCsv(o.tracking_awb || ""),
          escapeCsv(o.tracking_url || ""),
          escapeCsv(o.razorpay_payment_id || ""),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zucero-orders-${dateStr}.csv"`,
        },
      });
    }

    if (type === "customers") {
      const { data: orders } = await db.from("orders").select("customer_email, customer_phone, total_paise, status, payment_status, created_at, shipping_address");
      const { data: wallets } = await db.from("wallets").select("customer_email, balance_paise, total_earned_paise");
      const { data: referrals } = await db.from("referral_codes").select("code, owner_email");

      const walletsMap = new Map<string, number>();
      for (const w of wallets || []) {
        if (w.customer_email) walletsMap.set(w.customer_email.toLowerCase(), w.balance_paise || 0);
      }

      const refsMap = new Map<string, string>();
      for (const r of referrals || []) {
        if (r.owner_email) refsMap.set(r.owner_email.toLowerCase(), r.code);
      }

      const map = new Map<string, { email: string; name: string; phone: string; ordersCount: number; totalSpent: number; firstDate: string; lastDate: string }>();

      for (const o of orders || []) {
        if (!o.customer_email) continue;
        const email = o.customer_email.toLowerCase();
        const addr = (o.shipping_address || {}) as { fullName?: string; phone?: string };
        const name = addr.fullName || "";
        const phone = o.customer_phone || addr.phone || "";
        const isPaid = o.status === "paid" || o.payment_status === "captured";

        const existing = map.get(email);
        if (existing) {
          existing.ordersCount++;
          if (isPaid) existing.totalSpent += (o.total_paise || 0) / 100;
          if (!existing.phone && phone) existing.phone = phone;
          if (!existing.name && name) existing.name = name;
        } else {
          map.set(email, {
            email,
            name,
            phone,
            ordersCount: 1,
            totalSpent: isPaid ? (o.total_paise || 0) / 100 : 0,
            firstDate: o.created_at,
            lastDate: o.created_at,
          });
        }
      }

      const headers = ["Customer Email", "Customer Name", "Phone", "Total Orders", "Lifetime Spend (INR)", "Wallet Balance (INR)", "Referral Code", "First Purchase"];
      const rows = Array.from(map.values()).map((c) => [
        escapeCsv(c.email),
        escapeCsv(c.name),
        escapeCsv(c.phone),
        escapeCsv(c.ordersCount),
        escapeCsv(c.totalSpent.toFixed(2)),
        escapeCsv(((walletsMap.get(c.email) || 0) / 100).toFixed(2)),
        escapeCsv(refsMap.get(c.email) || ""),
        escapeCsv(new Date(c.firstDate).toLocaleDateString("en-IN")),
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zucero-customers-${dateStr}.csv"`,
        },
      });
    }

    if (type === "inquiries") {
      const { data: inquiries, error } = await db
        .from("contact_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      type InquiryRecord = {
        created_at: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        order_number: string | null;
        message: string | null;
      };

      const inquiryList = (inquiries as unknown as InquiryRecord[]) || [];
      const headers = ["Date", "Full Name", "Email", "Phone", "Order Number", "Message"];
      const rows = inquiryList.map((i) => [
        escapeCsv(new Date(i.created_at).toLocaleString("en-IN")),
        escapeCsv(i.full_name || ""),
        escapeCsv(i.email || ""),
        escapeCsv(i.phone || ""),
        escapeCsv(i.order_number || ""),
        escapeCsv(i.message || ""),
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zucero-contact-inquiries-${dateStr}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid export type. Use 'orders', 'customers', or 'inquiries'." }, { status: 400 });
  } catch (error) {
    console.error("CSV export failed:", error);
    return NextResponse.json({ error: "Could not generate export." }, { status: 500 });
  }
}

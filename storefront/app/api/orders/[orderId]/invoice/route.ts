import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { generateInvoiceForOrder } from "@/lib/invoice";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, order_number, customer_email, idempotency_key")
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Access control checks:
    let isAuthorized = false;

    // 1. Check if caller has internal/admin secret
    if (await isAuthorizedAdminOrInternal(request)) {
      isAuthorized = true;
    }

    // 2. Check if a secure access token was passed (?token=...)
    const url = new URL(request.url);
    const suppliedToken = url.searchParams.get("token");
    if (suppliedToken && (suppliedToken === order.idempotency_key || suppliedToken === order.id)) {
      isAuthorized = true;
    }

    // 3. Check if caller is signed in with Supabase as the order owner
    if (!isAuthorized && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          {
            cookies: {
              getAll: () => cookieStore.getAll(),
              setAll: () => {},
            },
          }
        );
        const { data: auth } = await supabase.auth.getUser();
        const userEmail = auth.user?.email?.toLowerCase();
        const merchantEmail = (process.env.ORDER_NOTIFICATION_EMAIL || "zucero.thegoodsugar@gmail.com").toLowerCase();

        if (userEmail && (userEmail === order.customer_email.toLowerCase() || userEmail === merchantEmail)) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view this invoice or use your verified order link." },
        { status: 401 }
      );
    }

    const { buffer, invoiceNumber } = await generateInvoiceForOrder(order.id);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    const message = error instanceof Error ? error.message : "Could not generate invoice";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

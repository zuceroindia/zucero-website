import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateReferralCode } from "@/lib/referral";
import { authenticatedUser } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  orderId: z.string().uuid().optional(),
  token: z.string().uuid().optional(),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.thegoodsugar.in";

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const user = await authenticatedUser();
    const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
    let email: string | null = null;
    let name = input.name;
    let phone = input.phone;
    let userId = user?.id ?? null;

    // A referral code is only unlocked after a successfully captured prepaid order.
    // When an order token is supplied, verify that exact paid order first.
    if (input.orderId && input.token) {
      const { data: order } = await supabaseAdmin().from("orders")
        .select("id,customer_email,customer_phone,shipping_address,payment_status,status")
        .eq("id", input.orderId)
        .eq("idempotency_key", input.token)
        .maybeSingle();

      if (!order || order.payment_status !== "captured") {
        return NextResponse.json({ error: "A successfully paid prepaid order is required before a referral code is unlocked." }, { status: 403 });
      }

      const orderEmail = order.customer_email.trim().toLowerCase();
      if (signedInEmail && signedInEmail !== orderEmail) {
        return NextResponse.json({ error: "This paid order belongs to a different account." }, { status: 403 });
      }

      const address = (order.shipping_address ?? {}) as Record<string, unknown>;
      email = orderEmail;
      name = typeof address.fullName === "string" ? address.fullName : name;
      phone = order.customer_phone || phone;
    } else if (signedInEmail) {
      if (input.email && input.email.trim().toLowerCase() !== signedInEmail) {
        return NextResponse.json({ error: "You can only access the referral code for your signed-in account." }, { status: 403 });
      }

      const { data: paidOrders, error: paidOrderError } = await supabaseAdmin().from("orders")
        .select("id,payment_status")
        .ilike("customer_email", signedInEmail)
        .eq("payment_status", "captured")
        .limit(1);

      if (paidOrderError || !paidOrders?.length) {
        return NextResponse.json({ error: "Your referral code unlocks after your first successful prepaid order." }, { status: 403 });
      }

      const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
      email = signedInEmail;
      name ||= typeof metadata.full_name === "string" ? metadata.full_name : undefined;
      phone ||= typeof metadata.phone === "string" ? metadata.phone : undefined;
    } else {
      return NextResponse.json({ error: "Please sign in or use your verified paid-order link." }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "A verified email address is required." }, { status: 401 });
    }

    const ref = await getOrCreateReferralCode({
      email,
      name,
      phone,
      userId,
    });

    if (!ref) {
      return NextResponse.json({ error: "Could not generate referral code." }, { status: 500 });
    }

    const shareUrl = `${SITE_URL}?ref=${encodeURIComponent(ref.code)}`;
    const whatsappMessage = `Hey! I just ordered pure, chemical-free sugarcane sweetness from Zucero. Use my referral code *${ref.code}* at checkout to get 10% off your order: ${shareUrl}`;

    return NextResponse.json({
      ok: true,
      code: ref.code,
      discountPercentage: ref.discount_percentage || 10,
      rewardPercentage: ref.reward_percentage || 10,
      shareUrl,
      whatsappMessage,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Invalid input" : "Failed to generate referral code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

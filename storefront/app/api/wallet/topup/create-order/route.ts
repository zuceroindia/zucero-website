import { NextResponse } from "next/server";
import { z } from "zod";
import { createRazorpayOrder, razorpayPublicKeyId } from "@/lib/razorpay";
import { authenticatedEmail } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  amountRupees: z.number().int().min(100, "Minimum top-up amount is ₹100").max(50000, "Maximum top-up amount is ₹50,000"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const customerEmail = await authenticatedEmail();
    if (!customerEmail) return NextResponse.json({ error: "Please sign in to add wallet credits." }, { status: 401 });

    const amountPaise = body.amountRupees * 100;
    const receipt = `TOPUP-${Date.now().toString().slice(-8)}`;

    const razorpay = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: {
        type: "wallet_topup",
        email: customerEmail,
        amount_rupees: String(body.amountRupees),
      },
    });

    const { error: intentError } = await supabaseAdmin().from("payment_events").insert({
      provider: "razorpay",
      provider_event_id: `topup_order:${razorpay.id}`,
      event_type: "wallet.topup.created",
      payload: { email: customerEmail, amountPaise, razorpayOrderId: razorpay.id },
      processed_at: new Date().toISOString(),
    });
    if (intentError) throw new Error("Could not securely initialize wallet top-up");

    return NextResponse.json({
      ok: true,
      razorpayOrderId: razorpay.id,
      amountPaise,
      amountRupees: body.amountRupees,
      keyId: razorpayPublicKeyId(),
      email: customerEmail,
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues?.[0]?.message || "Invalid top-up details.")
      : error instanceof Error ? error.message : "Top-up initialization failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

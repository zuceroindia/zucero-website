import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchRazorpayPayment, verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { creditWalletTopup, getWalletInfo } from "@/lib/referral";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpaySignature: z.string().min(20).max(200),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());

    if (!verifyRazorpayPaymentSignature(input)) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 401 });
    }

    const payment = await fetchRazorpayPayment(input.razorpayPaymentId);
    if (payment.order_id !== input.razorpayOrderId || payment.currency !== "INR") {
      return NextResponse.json({ error: "Payment details mismatch." }, { status: 400 });
    }

    if (payment.status !== "captured" && !payment.captured) {
      return NextResponse.json({ error: "Payment not captured." }, { status: 400 });
    }

    const email = input.email.trim().toLowerCase();

    // Record internal payment event for idempotency
    const db = supabaseAdmin();
    await db.from("payment_events").upsert({
      provider: "razorpay",
      provider_event_id: `topup_verified:${payment.id}`,
      event_type: "wallet.topup.captured",
      payload: payment,
      processed_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_event_id" });

    // Credit the digital wallet
    await creditWalletTopup({
      email,
      amountPaise: payment.amount,
      razorpayPaymentId: payment.id,
      razorpayOrderId: input.razorpayOrderId,
    });

    // Fetch refreshed wallet streams
    const walletInfo = await getWalletInfo(email);

    return NextResponse.json({
      ok: true,
      amountRupees: Number((payment.amount / 100).toFixed(2)),
      wallet: walletInfo,
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid payment details."
      : error instanceof Error ? error.message : "Top-up confirmation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

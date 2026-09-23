import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchRazorpayPayment, verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { creditWalletTopup, getWalletInfo } from "@/lib/referral";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticatedEmail } from "@/lib/server-auth";

const schema = z.object({
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpaySignature: z.string().min(20).max(200),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const email = await authenticatedEmail();
    if (!email) return NextResponse.json({ error: "Please sign in to confirm wallet credits." }, { status: 401 });

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

    const db = supabaseAdmin();
    const { data: topupIntent, error: intentError } = await db.from("payment_events")
      .select("payload")
      .eq("provider", "razorpay")
      .eq("provider_event_id", `topup_order:${input.razorpayOrderId}`)
      .maybeSingle();
    const intent = topupIntent?.payload as { email?: string; amountPaise?: number } | null;
    if (intentError || !intent || intent.email !== email || intent.amountPaise !== payment.amount) {
      return NextResponse.json({ error: "Wallet top-up does not belong to this account." }, { status: 403 });
    }

    // Reserve the payment event before crediting. A repeated browser callback or retry
    // must return the existing balance instead of crediting the same payment twice.
    const { error: eventError } = await db.from("payment_events").insert({
      provider: "razorpay",
      provider_event_id: `topup_verified:${payment.id}`,
      event_type: "wallet.topup.captured",
      payload: payment,
      processed_at: new Date().toISOString(),
    });
    if (eventError?.code === "23505") {
      const walletInfo = await getWalletInfo(email);
      return NextResponse.json({ ok: true, alreadyCredited: true, amountRupees: Number((payment.amount / 100).toFixed(2)), wallet: walletInfo });
    }
    if (eventError) throw new Error("Could not reserve wallet top-up confirmation");

    // Credit the digital wallet
    try {
      await creditWalletTopup({ email, amountPaise: payment.amount, razorpayPaymentId: payment.id, razorpayOrderId: input.razorpayOrderId });
    } catch (creditError) {
      await db.from("payment_events").delete().eq("provider", "razorpay").eq("provider_event_id", `topup_verified:${payment.id}`);
      throw creditError;
    }

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

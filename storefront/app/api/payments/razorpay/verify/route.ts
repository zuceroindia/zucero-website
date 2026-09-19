import { NextResponse } from "next/server";
import { z } from "zod";
import { fulfilPaidOrder } from "@/lib/order-fulfilment";
import { notifyPaidOrder } from "@/lib/notifications";
import { fetchRazorpayPayment, verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { creditReferralReward, debitWallet } from "@/lib/referral";

const schema = z.object({
  localOrderId: z.string().uuid(),
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpaySignature: z.string().min(20).max(200),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const db = supabaseAdmin();
    const { data: order, error } = await db.from("orders").select("*").eq("id", input.localOrderId).single();
    if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.razorpay_order_id !== input.razorpayOrderId) {
      return NextResponse.json({ error: "Payment order mismatch." }, { status: 400 });
    }
    if (!verifyRazorpayPaymentSignature(input)) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 401 });
    }

    const payment = await fetchRazorpayPayment(input.razorpayPaymentId);
    // The Razorpay charge is total_paise minus any wallet credits applied
    const expectedPayable = order.total_paise - (order.wallet_spent_paise ?? 0);
    if (payment.order_id !== input.razorpayOrderId || payment.amount !== expectedPayable || payment.currency !== "INR") {
      return NextResponse.json({ error: "Payment details do not match this order." }, { status: 400 });
    }

    if (payment.status !== "captured" && !payment.captured) {
      await db.from("orders").update({
        razorpay_payment_id: payment.id,
        payment_status: "authorized",
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      return NextResponse.json({ ok: true, captured: false, orderNumber: order.order_number }, { status: 202 });
    }

    const { error: updateError } = await db.from("orders").update({
      status: "paid",
      payment_status: "captured",
      razorpay_payment_id: payment.id,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    if (updateError) throw new Error("Could not confirm payment in the order database");

    await db.from("payment_events").upsert({
      provider: "razorpay",
      provider_event_id: `verified:${payment.id}`,
      event_type: "payment.captured",
      payload: payment,
      processed_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_event_id" });

    // Debit wallet if credits were applied
    if ((order.wallet_spent_paise ?? 0) > 0) {
      await debitWallet({
        email: order.customer_email,
        orderId: order.id,
        orderNumber: order.order_number,
        debitPaise: order.wallet_spent_paise,
      }).catch((err) => console.error("Wallet debit error in verify route:", err));
    }

    const [fulfilmentResult] = await Promise.allSettled([
      fulfilPaidOrder(order.id).catch((err) => {
        console.error("Fulfilment error in verify route:", err);
        return null;
      }),
      notifyPaidOrder(order.id).catch((err) => {
        console.error("Paid order notification failed in verify route:", err);
      }),
      creditReferralReward(order.id).catch((err) => {
        console.error("Referral reward credit failed in verify route:", err);
      }),
    ]);

    const fulfilment = fulfilmentResult.status === "fulfilled" ? fulfilmentResult.value : null;

    return NextResponse.json({
      ok: true,
      captured: true,
      orderNumber: order.order_number,
      fulfilment,
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid payment confirmation."
      : error instanceof Error ? error.message : "Payment confirmation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

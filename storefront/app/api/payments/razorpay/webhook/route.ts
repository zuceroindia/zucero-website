import { NextResponse } from "next/server";
import { fulfilPaidOrder } from "@/lib/order-fulfilment";
import { notifyPaidOrder } from "@/lib/notifications";
import { notifyPaymentFailed, notifyRefundProcessed } from "@/lib/payment-status-notifications";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { creditReferralReward, debitWallet } from "@/lib/referral";

type RazorpayWebhook = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; status?: string } };
    order?: { entity?: { id?: string; status?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; status?: string } };
  };
};

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  const rawBody = await request.text();

  try {
    if (!verifyRazorpaySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as RazorpayWebhook;
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;
    const eventId = request.headers.get("x-razorpay-event-id")
      ?? `${event.event ?? "event"}:${payment?.id ?? razorpayOrderId ?? event.created_at ?? Date.now()}`;
    const db = supabaseAdmin();

    await db.from("payment_events").upsert({
      provider: "razorpay",
      provider_event_id: eventId,
      event_type: event.event ?? "unknown",
      payload: event,
      processed_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_event_id" });

    if (!razorpayOrderId) return NextResponse.json({ received: true });
    const { data: order } = await db.from("orders").select("*").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
    if (!order) return NextResponse.json({ received: true });

    if (event.event === "payment.failed") {
      await db.from("orders").update({
        status: "payment_failed",
        payment_status: "failed",
        razorpay_payment_id: payment?.id ?? order.razorpay_payment_id,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      await notifyPaymentFailed(order.id).catch((notificationError) => console.error("Payment failed notification failed", notificationError));
      return NextResponse.json({ received: true });
    }

    if (event.event === "refund.processed") {
      await db.from("orders").update({
        status: "refunded",
        payment_status: "refunded",
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      await notifyRefundProcessed(order.id).catch((notificationError) => console.error("Refund notification failed", notificationError));
      return NextResponse.json({ received: true });
    }

    if (event.event === "payment.captured" || event.event === "order.paid") {
      await db.from("orders").update({
        status: "paid",
        payment_status: "captured",
        razorpay_payment_id: payment?.id ?? order.razorpay_payment_id,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);

      // Debit wallet credits applied at checkout
      if ((order.wallet_spent_paise ?? 0) > 0) {
        await debitWallet({
          email: order.customer_email,
          orderId: order.id,
          orderNumber: order.order_number,
          debitPaise: order.wallet_spent_paise,
        }).catch((err) => console.error("Wallet debit error in webhook:", err));
      }

      await Promise.allSettled([
        fulfilPaidOrder(order.id).catch((err) => console.error("Fulfilment failed:", err)),
        notifyPaidOrder(order.id).catch((err) => console.error("Notification failed:", err)),
        creditReferralReward(order.id).catch((err) => console.error("Referral reward failed:", err)),
      ]);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

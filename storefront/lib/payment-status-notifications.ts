import { supabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_MERCHANT_EMAIL = "zucero.thegoodsugar@gmail.com";

function money(paise: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((paise ?? 0) / 100);
}

async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim() || process.env.SENDGRID_API_KEY?.trim();
  const rawFrom = process.env.RESEND_FROM_EMAIL?.trim() || process.env.SENDGRID_FROM_EMAIL?.trim() || "Zucero <orders@thegoodsugar.in>";
  if (!apiKey) {
    console.warn("Payment status email skipped: Resend is not configured (RESEND_API_KEY missing)");
    return false;
  }

  const from = rawFrom.includes("<") ? rawFrom : `Zucero <${rawFrom}>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend payment status email failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
  return true;
}

async function sendOnce(key: string, eventType: string, payload: Record<string, unknown>, send: () => Promise<boolean>) {
  const db = supabaseAdmin();
  const { error } = await db.from("payment_events").insert({
    provider: "internal",
    provider_event_id: key,
    event_type: eventType,
    payload,
    processed_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") return false;
    throw new Error(`Could not reserve payment notification event: ${error.message}`);
  }

  try {
    const sent = await send();
    if (!sent) await db.from("payment_events").delete().eq("provider", "internal").eq("provider_event_id", key);
    return sent;
  } catch (error) {
    await db.from("payment_events").delete().eq("provider", "internal").eq("provider_event_id", key);
    throw error;
  }
}

async function getOrder(orderId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("orders").select("*").eq("id", orderId).single();
  if (error || !data) throw new Error("Order not found for payment notification");
  return data;
}

export async function notifyPaymentFailed(orderId: string) {
  const order = await getOrder(orderId);
  const merchantEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || DEFAULT_MERCHANT_EMAIL;
  const customerSubject = `Payment unsuccessful · ${order.order_number}`;
  const customerText = `Your payment for Zucero order ${order.order_number} was not completed. No successful payment has been recorded for this attempt. Please return to your cart and try again.`;
  const customerHtml = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#10271d"><h1 style="font-family:Georgia,serif;font-weight:500">Your payment was not completed.</h1><p>We could not confirm payment for order <strong>${order.order_number}</strong>.</p><p>No successful payment has been recorded for this attempt. You can return to Zucero and try again.</p></div>`;
  const merchantText = `Payment failed for Zucero order ${order.order_number}. Customer: ${order.customer_email}. Attempted total: ${money(order.total_paise)}.`;

  const results = await Promise.allSettled([
    sendOnce(`payment-failed-customer:${order.id}`, "payment.failed.customer", { order_id: order.id }, () => sendEmail({ to: order.customer_email, subject: customerSubject, html: customerHtml, text: customerText })),
    sendOnce(`payment-failed-merchant:${order.id}`, "payment.failed.merchant", { order_id: order.id }, () => sendEmail({ to: merchantEmail, subject: `Payment failed · ${order.order_number}`, html: `<p>${merchantText}</p>`, text: merchantText })),
  ]);
  results.forEach((result) => { if (result.status === "rejected") console.error("Payment failed email notification failed", result.reason); });
}

export async function notifyRefundProcessed(orderId: string) {
  const order = await getOrder(orderId);
  const merchantEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || DEFAULT_MERCHANT_EMAIL;
  const customerText = `A refund has been processed for Zucero order ${order.order_number}. Refund timing in your bank or card account depends on the payment method and bank processing time.`;
  const customerHtml = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#10271d"><h1 style="font-family:Georgia,serif;font-weight:500">Your refund has been processed.</h1><p>A refund has been processed for order <strong>${order.order_number}</strong>.</p><p>The time it takes to appear in your account depends on your payment method and bank.</p></div>`;
  const merchantText = `Refund processed for Zucero order ${order.order_number}. Customer: ${order.customer_email}. Order total: ${money(order.total_paise)}.`;

  const results = await Promise.allSettled([
    sendOnce(`refund-customer:${order.id}`, "refund.processed.customer", { order_id: order.id }, () => sendEmail({ to: order.customer_email, subject: `Refund processed · ${order.order_number}`, html: customerHtml, text: customerText })),
    sendOnce(`refund-merchant:${order.id}`, "refund.processed.merchant", { order_id: order.id }, () => sendEmail({ to: merchantEmail, subject: `Refund processed · ${order.order_number}`, html: `<p>${merchantText}</p>`, text: merchantText })),
  ]);
  results.forEach((result) => { if (result.status === "rejected") console.error("Refund email notification failed", result.reason); });
}

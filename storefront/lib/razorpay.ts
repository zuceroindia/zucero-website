import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new Error("Razorpay credentials are not configured");
  return { keyId, secret };
}

export function razorpayPublicKeyId() {
  return credentials().keyId;
}

export function verifyRazorpaySignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("Razorpay webhook secret is not configured");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyRazorpayPaymentSignature(input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  const { secret } = credentials();
  const expected = createHmac("sha256", secret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(expected, input.razorpaySignature);
}

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  const { keyId, secret } = credentials();
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt, notes: input.notes ?? {} }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Razorpay order creation failed (${response.status})`);
  return response.json() as Promise<{ id: string; amount: number; currency: string; receipt: string; status: string }>;
}

export async function fetchRazorpayPayment(paymentId: string) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new Error("Invalid Razorpay payment ID");
  const { keyId, secret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Razorpay payment lookup failed (${response.status})`);
  return response.json() as Promise<{ id: string; order_id: string; amount: number; currency: string; status: string; captured: boolean }>;
}

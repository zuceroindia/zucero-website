import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findCatalogProductAndVariant } from "@/lib/catalog";
import { isIndianState } from "@/lib/india";
import { createRazorpayOrder, razorpayPublicKeyId } from "@/lib/razorpay";
import { getPrepaidShippingQuote } from "@/lib/shiprocket";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateCheckoutTotal, calculateCouponDiscount, normalizeCouponCode, ZUCADD10_CODE } from "@/lib/tax";
import { validateReferralCode, getOrCreateWallet, debitWallet } from "@/lib/referral";
import { fulfilPaidOrder } from "@/lib/order-fulfilment";
import { notifyPaidOrder } from "@/lib/notifications";

const schema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().min(10).max(20),
    addressLine1: z.string().trim().min(5).max(180),
    addressLine2: z.string().trim().max(180).optional().default(""),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postalCode: z.string().regex(/^\d{6}$/),
    country: z.literal("India"),
  }),
  lines: z.array(z.object({
    variantId: z.string().min(2).max(80),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
  couponCode: z.string().trim().max(40).optional().default(""),
  referralCode: z.string().trim().max(40).optional().default(""),
  useWallet: z.boolean().optional().default(false),
});

function catalogLine(variantId: string) {
  return findCatalogProductAndVariant(variantId);
}

function orderNumber() {
  return `ZUC-${Date.now().toString().slice(-9)}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function POST(request: Request) {
  let localOrderId: string | null = null;
  try {
    const input = schema.parse(await request.json());
    if (!isIndianState(input.customer.state)) {
      return NextResponse.json({ error: "Please select a valid Indian state or union territory." }, { status: 400 });
    }

    const resolved = input.lines.map((line) => {
      const match = catalogLine(line.variantId);
      if (!match) throw new Error("A product in your bag is no longer available. Please update your bag.");
      return { ...line, variantId: match.variant.id, ...match };
    });

    const subtotalPaise = resolved.reduce((sum, line) => sum + (line.variant.pricePaise ?? 0) * line.quantity, 0);

    // ── Referral code (exclusively unlocks 10% discount) ───────────────────
    const rawReferral = (input.referralCode || input.couponCode)?.trim().toUpperCase() || "";

    let discountPaise = 0;
    let validatedReferralCode: string | null = null;

    if (rawReferral) {
      const referralResult = await validateReferralCode(rawReferral, input.customer.email);
      if (!referralResult.valid) {
        return NextResponse.json({
          error: referralResult.error ?? "Invalid referral code. The 10% discount is exclusively unlocked by applying a valid referral code.",
        }, { status: 400 });
      }
      validatedReferralCode = referralResult.code!;
      discountPaise = Math.round(subtotalPaise * (referralResult.discountPercentage ?? 10) / 100);
    }

    // ── Shipping ─────────────────────────────────────────────────────────────
    const totalWeightGrams = resolved.reduce((sum, line) => sum + line.variant.packedWeightGrams * line.quantity, 0);
    if (totalWeightGrams > 30_000) {
      return NextResponse.json({ error: "This order is too heavy for online checkout. Please contact us for assistance." }, { status: 400 });
    }

    const pickupPostcode = process.env.SHIPROCKET_PICKUP_POSTCODE || "122003";
    const shippingQuote = await getPrepaidShippingQuote({
      pickupPostcode,
      deliveryPostcode: input.customer.postalCode,
      weightKg: totalWeightGrams / 1000,
      destinationState: input.customer.state,
    });

    // ── Wallet ───────────────────────────────────────────────────────────────
    let walletSpentPaise = 0;
    if (input.useWallet) {
      const wallet = await getOrCreateWallet(input.customer.email.trim().toLowerCase());
      if (wallet && wallet.balance_paise > 0) {
        const breakdown0 = calculateCheckoutTotal(subtotalPaise, input.customer.state, discountPaise, shippingQuote.shippingPaise);
        // Cap wallet spend at total payable
        walletSpentPaise = Math.min(wallet.balance_paise, breakdown0.totalPaise);
      }
    }

    // ── Final totals ─────────────────────────────────────────────────────────
    const breakdown = calculateCheckoutTotal(subtotalPaise, input.customer.state, discountPaise, shippingQuote.shippingPaise, walletSpentPaise);

    const db = supabaseAdmin();
    localOrderId = randomUUID();
    const number = orderNumber();
    const invoiceNum = `INV-${number}`;
    const idempotencyKey = randomUUID();
    const address = {
      ...input.customer,
      estimated_delivery_window: shippingQuote.deliveryWindowText,
      invoice_number: invoiceNum,
    };

    const { error: orderError } = await db.from("orders").insert({
      id: localOrderId,
      order_number: number,
      customer_email: address.email.toLowerCase(),
      customer_phone: address.phone,
      shipping_address: address,
      billing_address: address,
      status: "pending_payment",
      payment_status: "pending",
      currency: "INR",
      subtotal_paise: subtotalPaise,
      discount_paise: discountPaise,
      tax_paise: breakdown.totalTaxPaise,
      shipping_paise: breakdown.shippingPaise,
      total_paise: breakdown.totalPaise,
      tax_mode: breakdown.mode,
      idempotency_key: idempotencyKey,
      // Referral & Wallet fields
      referral_code_used: validatedReferralCode ?? null,
      wallet_spent_paise: walletSpentPaise,
    });
    if (orderError) throw new Error("Could not create order record");

    // Referral discount per line item
    const isReferralDiscount = Boolean(validatedReferralCode);

    const { error: itemsError } = await db.from("order_items").insert(resolved.map((line) => {
      const lineSubtotalPaise = (line.variant.pricePaise ?? 0) * line.quantity;
      const lineDiscountPaise = isReferralDiscount ? Math.round(lineSubtotalPaise * 0.10) : 0;
      return {
        order_id: localOrderId,
        sku: line.variant.sku,
        product_name: line.product.name,
        variant_label: line.variant.label,
        quantity: line.quantity,
        unit_price_paise: line.variant.pricePaise,
        tax_paise: Math.round((lineSubtotalPaise - lineDiscountPaise) * 0.05),
        line_total_paise: lineSubtotalPaise,
      };
    }));
    if (itemsError) throw new Error("Could not create order items");

    // ── If wallet covers 100% of order — skip Razorpay ───────────────────────
    if (breakdown.payablePaise <= 0) {
      // Debit wallet immediately
      await debitWallet({
        email: input.customer.email,
        orderId: localOrderId,
        orderNumber: number,
        debitPaise: walletSpentPaise,
      });

      // Mark order as paid
      await db.from("orders").update({
        status: "paid",
        payment_status: "captured",
        updated_at: new Date().toISOString(),
      }).eq("id", localOrderId);

      // Trigger fulfilment + notifications in background
      await Promise.allSettled([
        fulfilPaidOrder(localOrderId).catch((err) => console.error("Fulfilment error (wallet-only):", err)),
        notifyPaidOrder(localOrderId).catch((err) => console.error("Notification error (wallet-only):", err)),
      ]);

      return NextResponse.json({
        localOrderId,
        orderNumber: number,
        invoiceNumber: invoiceNum,
        invoiceToken: idempotencyKey,
        walletOnly: true,
        amountPaise: 0,
        amountRupees: 0,
        deliveryWindow: shippingQuote.deliveryWindowText,
        breakdown,
      });
    }

    // ── Razorpay order for remaining payable amount ───────────────────────────
    const razorpay = await createRazorpayOrder({
      amountPaise: breakdown.payablePaise,
      receipt: number,
      notes: {
        local_order_id: localOrderId,
        order_number: number,
        shipping_weight_grams: String(totalWeightGrams),
        shipping_courier: shippingQuote.courierName,
        delivery_window: shippingQuote.deliveryWindowText,
        ...(couponCode ? { coupon_code: couponCode } : {}),
        ...(validatedReferralCode ? { referral_code: validatedReferralCode } : {}),
        ...(walletSpentPaise > 0 ? { wallet_spent_paise: String(walletSpentPaise) } : {}),
      },
    });

    const { error: paymentLinkError } = await db.from("orders")
      .update({ razorpay_order_id: razorpay.id, updated_at: new Date().toISOString() })
      .eq("id", localOrderId);
    if (paymentLinkError) throw new Error("Could not link Razorpay order");

    return NextResponse.json({
      localOrderId,
      orderNumber: number,
      invoiceNumber: invoiceNum,
      invoiceToken: idempotencyKey,
      razorpayOrderId: razorpay.id,
      amountPaise: breakdown.payablePaise,
      amountRupees: breakdown.payableRupees,
      keyId: razorpayPublicKeyId(),
      couponCode: couponCode || null,
      referralCode: validatedReferralCode || null,
      walletSpentPaise,
      totalWeightGrams,
      deliveryWindow: shippingQuote.deliveryWindowText,
      breakdown,
    });
  } catch (error) {
    if (localOrderId) {
      try {
        await supabaseAdmin().from("orders").update({ status: "payment_failed", payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", localOrderId);
      } catch {}
    }
    const message = error instanceof z.ZodError
      ? "Please check your checkout details."
      : error instanceof Error ? error.message : "Checkout is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

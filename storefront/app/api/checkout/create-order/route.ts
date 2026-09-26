import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findCatalogProductAndVariant } from "@/lib/catalog";
import { getLiveCMSConfig } from "@/lib/cms";
import { isIndianState } from "@/lib/india";
import { createRazorpayOrder, razorpayPublicKeyId } from "@/lib/razorpay";
import { getPrepaidShippingQuote } from "@/lib/shiprocket";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateCheckoutTotal } from "@/lib/tax";
import { creditReferralReward, debitWallet, getOrCreateReferralCode, getOrCreateWallet, refundWalletCredits, validateReferralCode } from "@/lib/referral";
import { validateDiscountCoupon } from "@/lib/coupons";
import { fulfilPaidOrder } from "@/lib/order-fulfilment";
import { notifyPaidOrder } from "@/lib/notifications";
import { authenticatedEmail } from "@/lib/server-auth";

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

    const cms = await getLiveCMSConfig();
    const resolved = input.lines.map((line) => {
      const match = findCatalogProductAndVariant(line.variantId, cms.products);
      if (!match) throw new Error("A product in your bag is no longer available. Please update your bag.");
      return { ...line, variantId: match.variant.id, ...match };
    });

    const subtotalPaise = resolved.reduce((sum, line) => sum + (line.variant.pricePaise ?? 0) * line.quantity, 0);

    // ── Discount coupon or referral code (one code per order) ──────────────
    const rawCoupon = input.couponCode.trim().toUpperCase();
    const rawReferral = input.referralCode.trim().toUpperCase();

    if (rawCoupon && rawReferral) {
      return NextResponse.json({ error: "Only one discount or referral code can be applied per order." }, { status: 400 });
    }

    let discountPaise = 0;
    let discountPercentage = 0;
    let validatedCouponCode: string | null = null;
    let validatedReferralCode: string | null = null;

    if (rawCoupon) {
      const couponResult = await validateDiscountCoupon(rawCoupon);
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.error ?? "Invalid discount code." }, { status: 400 });
      }
      validatedCouponCode = couponResult.code;
      discountPercentage = couponResult.percentage;
      discountPaise = Math.round(subtotalPaise * discountPercentage / 100);
    } else if (rawReferral) {
      const referralResult = await validateReferralCode(rawReferral, input.customer.email);
      if (!referralResult.valid) {
        return NextResponse.json({ error: referralResult.error ?? "Invalid referral code." }, { status: 400 });
      }
      validatedReferralCode = referralResult.code!;
      discountPercentage = referralResult.discountPercentage ?? 10;
      discountPaise = Math.round(subtotalPaise * discountPercentage / 100);
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
      const sessionEmail = await authenticatedEmail();
      if (!sessionEmail || sessionEmail !== input.customer.email.trim().toLowerCase()) {
        return NextResponse.json({ error: "Please sign in with this email address to use its wallet credits." }, { status: 401 });
      }
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
      ...(validatedCouponCode ? { discount_coupon_code: validatedCouponCode } : {}),
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

    // Discount per line item for tax calculation
    const { error: itemsError } = await db.from("order_items").insert(resolved.map((line) => {
      const lineSubtotalPaise = (line.variant.pricePaise ?? 0) * line.quantity;
      const lineDiscountPaise = discountPercentage > 0
        ? Math.round(lineSubtotalPaise * discountPercentage / 100)
        : 0;
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
      const { error: paidUpdateError } = await db.from("orders").update({
        status: "paid",
        payment_status: "captured",
        updated_at: new Date().toISOString(),
      }).eq("id", localOrderId);
      if (paidUpdateError) {
        await refundWalletCredits({
          email: input.customer.email,
          orderId: localOrderId,
          orderNumber: number,
          refundPaise: walletSpentPaise,
        });
        throw new Error("Could not finalize wallet payment. Your wallet credits were restored.");
      }

      // Trigger fulfilment + notifications in background
      await Promise.allSettled([
        fulfilPaidOrder(localOrderId).catch((err) => console.error("Fulfilment error (wallet-only):", err)),
        notifyPaidOrder(localOrderId).catch((err) => console.error("Notification error (wallet-only):", err)),
        creditReferralReward(localOrderId).catch((err) => console.error("Referral credit error (wallet-only):", err)),
      ]);

      let referralCode: string | null = null;
      try {
        const referral = await getOrCreateReferralCode({
          email: input.customer.email,
          name: input.customer.fullName,
          phone: input.customer.phone,
        });
        referralCode = referral?.code ?? null;
      } catch (referralError) {
        console.error("Referral code creation failed after wallet-paid order:", referralError);
      }

      return NextResponse.json({
        localOrderId,
        orderNumber: number,
        invoiceNumber: invoiceNum,
        invoiceToken: idempotencyKey,
        walletOnly: true,
        amountPaise: 0,
        amountRupees: 0,
        referralCode,
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
        ...(validatedReferralCode ? { referral_code: validatedReferralCode } : {}),
        ...(validatedCouponCode ? { coupon_code: validatedCouponCode, coupon_discount_percentage: String(discountPercentage) } : {}),
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
      referralCode: validatedReferralCode || null,
      couponCode: validatedCouponCode || null,
      discountPercentage,
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

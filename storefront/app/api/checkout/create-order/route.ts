import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { products } from "@/lib/catalog";
import { isIndianState } from "@/lib/india";
import { createRazorpayOrder, razorpayPublicKeyId } from "@/lib/razorpay";
import { getPrepaidShippingQuote } from "@/lib/shiprocket";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateCheckoutTotal, calculateCouponDiscount, normalizeCouponCode, ZUCADD10_CODE } from "@/lib/tax";

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
});

function catalogLine(variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant && variant.pricePaise !== null) return { product, variant };
  }
  return null;
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
      if (!match) throw new Error("A product in your bag is no longer available");
      return { ...line, ...match };
    });

    const subtotalPaise = resolved.reduce((sum, line) => sum + (line.variant.pricePaise ?? 0) * line.quantity, 0);
    const couponCode = normalizeCouponCode(input.couponCode);
    if (couponCode && couponCode !== ZUCADD10_CODE) {
      return NextResponse.json({ error: "This coupon code is not valid." }, { status: 400 });
    }
    const discountPaise = calculateCouponDiscount(subtotalPaise, couponCode);
    const totalWeightGrams = resolved.reduce((sum, line) => sum + line.variant.packedWeightGrams * line.quantity, 0);
    if (totalWeightGrams > 30_000) {
      return NextResponse.json({ error: "This order is too heavy for online checkout. Please contact us for assistance." }, { status: 400 });
    }

    const pickupPostcode = process.env.SHIPROCKET_PICKUP_POSTCODE;
    if (!pickupPostcode) throw new Error("Shiprocket pickup postcode is not configured");
    const shippingQuote = await getPrepaidShippingQuote({
      pickupPostcode,
      deliveryPostcode: input.customer.postalCode,
      weightKg: totalWeightGrams / 1000,
      destinationState: input.customer.state,
    });

    const breakdown = calculateCheckoutTotal(subtotalPaise, input.customer.state, discountPaise, shippingQuote.shippingPaise);

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
    });
    if (orderError) throw new Error("Could not create order record");

    const { error: itemsError } = await db.from("order_items").insert(resolved.map((line) => {
      const lineSubtotalPaise = (line.variant.pricePaise ?? 0) * line.quantity;
      const lineDiscountPaise = couponCode === ZUCADD10_CODE ? Math.round(lineSubtotalPaise * 0.10) : 0;
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

    const razorpay = await createRazorpayOrder({
      amountPaise: breakdown.totalPaise,
      receipt: number,
      notes: {
        local_order_id: localOrderId,
        order_number: number,
        shipping_weight_grams: String(totalWeightGrams),
        shipping_courier: shippingQuote.courierName,
        delivery_window: shippingQuote.deliveryWindowText,
        ...(couponCode ? { coupon_code: couponCode } : {}),
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
      razorpayOrderId: razorpay.id,
      amountPaise: breakdown.totalPaise,
      amountRupees: breakdown.totalRupees,
      keyId: razorpayPublicKeyId(),
      couponCode: couponCode || null,
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

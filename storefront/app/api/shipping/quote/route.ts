import { NextResponse } from "next/server";
import { z } from "zod";
import { products } from "@/lib/catalog";
import { getShippingOptions, selectPrepaidShippingQuote } from "@/lib/shiprocket";

const lineSchema = z.object({
  variantId: z.string().min(2).max(80),
  quantity: z.number().int().min(1).max(10),
});

const inputSchema = z.object({
  postalCode: z.string().regex(/^\d{6}$/),
  state: z.string().optional(),
  weightGrams: z.number().int().positive().max(30_000).optional(),
  lines: z.array(lineSchema).min(1).max(20).optional(),
}).refine((value) => value.weightGrams || value.lines?.length, { message: "Shipping weight is required" });

function catalogVariant(variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return variant;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const pickupPostcode = process.env.SHIPROCKET_PICKUP_POSTCODE;
    if (!pickupPostcode) return NextResponse.json({ configured: false, message: "Shipping quote is awaiting pickup configuration." }, { status: 503 });

    const totalWeightGrams = input.lines
      ? input.lines.reduce((sum, line) => {
          const variant = catalogVariant(line.variantId);
          if (!variant) throw new Error("A product in your bag is no longer available");
          return sum + variant.packedWeightGrams * line.quantity;
        }, 0)
      : input.weightGrams!;

    if (totalWeightGrams > 30_000) {
      return NextResponse.json({ error: "This order is too heavy for online checkout. Please contact us for assistance." }, { status: 400 });
    }

    const billableWeightKg = Math.max(0.5, totalWeightGrams / 1000);
    const result = await getShippingOptions({
      pickupPostcode,
      deliveryPostcode: input.postalCode,
      weightKg: billableWeightKg,
      cod: false,
    });
    const quote = selectPrepaidShippingQuote(result, billableWeightKg, input.state);
    if (!quote) {
      return NextResponse.json({ error: "Delivery is currently unavailable for this PIN code." }, { status: 422 });
    }

    return NextResponse.json({
      configured: true,
      result,
      shippingPaise: quote.shippingPaise,
      shippingRupees: Number((quote.shippingPaise / 100).toFixed(2)),
      totalWeightGrams,
      chargeWeightKg: quote.chargeWeightKg,
      courierName: quote.courierName,
      deliveryWindowText: quote.deliveryWindowText,
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid shipping request"
      : error instanceof Error ? error.message : "Shipping quote unavailable";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { validateDiscountCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await validateDiscountCoupon(String(body.code || ""));
    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({
      valid: true,
      code: result.code,
      discountPercentage: result.percentage,
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Could not validate coupon." },
      { status: 500 }
    );
  }
}

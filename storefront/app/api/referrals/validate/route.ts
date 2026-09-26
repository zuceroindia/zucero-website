import { NextResponse } from "next/server";
import { z } from "zod";
import { validateReferralCode } from "@/lib/referral";

const schema = z.object({
  code: z.string().min(2).max(40),
  buyerEmail: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await validateReferralCode(input.code, input.buyerEmail);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: result.code,
      discountPercentage: result.discountPercentage,
      ownerName: result.ownerName,
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Invalid code format." : "Failed to validate code.";
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}

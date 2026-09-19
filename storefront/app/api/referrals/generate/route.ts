import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateReferralCode } from "@/lib/referral";

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.thegoodsugar.in";

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const ref = await getOrCreateReferralCode({
      email: input.email,
      name: input.name,
      phone: input.phone,
    });

    if (!ref) {
      return NextResponse.json({ error: "Could not generate referral code." }, { status: 500 });
    }

    const shareUrl = `${SITE_URL}?ref=${encodeURIComponent(ref.code)}`;
    const whatsappMessage = `Hey! I just ordered pure, chemical-free sugarcane sweetness from Zucero. Use my referral code *${ref.code}* at checkout to get 10% off your order: ${shareUrl}`;

    return NextResponse.json({
      ok: true,
      code: ref.code,
      discountPercentage: ref.discount_percentage || 10,
      rewardPercentage: ref.reward_percentage || 10,
      shareUrl,
      whatsappMessage,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Invalid input" : "Failed to generate referral code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

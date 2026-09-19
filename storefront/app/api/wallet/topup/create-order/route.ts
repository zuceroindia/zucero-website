import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createRazorpayOrder, razorpayPublicKeyId } from "@/lib/razorpay";

const schema = z.object({
  amountRupees: z.number().int().min(100, "Minimum top-up amount is ₹100").max(50000, "Maximum top-up amount is ₹50,000"),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    // Resolve customer email from session or payload
    let customerEmail = body.email?.trim().toLowerCase();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          {
            cookies: {
              getAll: () => cookieStore.getAll(),
              setAll: () => {},
            },
          }
        );
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user?.email) {
          customerEmail = auth.user.email.toLowerCase();
        }
      } catch {}
    }

    if (!customerEmail) {
      return NextResponse.json({ error: "Please sign in or provide a valid email for wallet top-up." }, { status: 400 });
    }

    const amountPaise = body.amountRupees * 100;
    const receipt = `TOPUP-${Date.now().toString().slice(-8)}`;

    const razorpay = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: {
        type: "wallet_topup",
        email: customerEmail,
        amount_rupees: String(body.amountRupees),
      },
    });

    return NextResponse.json({
      ok: true,
      razorpayOrderId: razorpay.id,
      amountPaise,
      amountRupees: body.amountRupees,
      keyId: razorpayPublicKeyId(),
      email: customerEmail,
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues?.[0]?.message || "Invalid top-up details.")
      : error instanceof Error ? error.message : "Top-up initialization failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

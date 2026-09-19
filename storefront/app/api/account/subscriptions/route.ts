import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { findCatalogProductAndVariant } from "@/lib/catalog";

const schema = z.object({
  productVariantId: z.string().min(2),
  quantity: z.number().int().min(1).max(10).default(1),
  frequency: z.enum(["weekly", "monthly", "custom"]),
  intervalWeeks: z.number().int().min(1).max(52).optional().default(1),
  shippingAddress: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(10),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional().default(""),
    city: z.string().min(2),
    state: z.string().min(2),
    postalCode: z.string().regex(/^\d{6}$/),
    country: z.literal("India").default("India"),
  }),
});

async function getAuthUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
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
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET() {
  const user = await getAuthUser();
  const email = user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Please sign in to view your subscriptions." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: subscriptions, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("customer_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load subscriptions." }, { status: 500 });
  }

  return NextResponse.json({ subscriptions: subscriptions ?? [] });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  const email = user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Please sign in to set up a subscription." }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());

    // Validate catalog item
    const match = findCatalogProductAndVariant(body.productVariantId);
    if (!match) {
      return NextResponse.json({ error: "Selected product is not available." }, { status: 400 });
    }

    const intervalDays = body.frequency === "weekly"
      ? 7
      : body.frequency === "monthly"
        ? 30
        : (body.intervalWeeks || 1) * 7;

    const nextBillingDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

    const db = supabaseAdmin();
    const { data: subscription, error } = await db
      .from("subscriptions")
      .insert({
        customer_email: email,
        user_id: user?.id || null,
        product_variant_id: match.variant.id,
        product_name: match.product.name,
        variant_label: match.variant.label,
        quantity: body.quantity,
        unit_price_paise: match.variant.pricePaise ?? 0,
        frequency: body.frequency,
        interval_weeks: body.frequency === "custom" ? body.intervalWeeks : null,
        status: "active",
        shipping_address: body.shippingAddress,
        next_billing_date: nextBillingDate,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Could not create subscription: ${error.message}`);
    }

    return NextResponse.json({ ok: true, subscription });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues?.[0]?.message || "Invalid subscription details.")
      : error instanceof Error ? error.message : "Subscription setup failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

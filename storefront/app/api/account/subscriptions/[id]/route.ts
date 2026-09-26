import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  status: z.enum(["active", "paused", "cancelled"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
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
    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email?.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const db = supabaseAdmin();

    const { data: existing, error: findError } = await db
      .from("subscriptions")
      .select("*")
      .eq("id", id)
      .eq("customer_email", email)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const { data: updated, error: updateError } = await db
      .from("subscriptions")
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    return NextResponse.json({ ok: true, subscription: updated });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid status update"
      : error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Meta WhatsApp Cloud API Webhook Verification (GET)
 * Meta calls this when you click "Verify and save" in the App Dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "zucero_wa_webhook_verify_2026";

  if (mode === "subscribe" && token === expectedToken) {
    return new Response(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden: verification failed" }, { status: 403 });
}

/**
 * Meta WhatsApp Cloud API Webhook Event Handler (POST)
 * Receives delivery receipts, read statuses, and incoming messages.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));

    // Log receipt to payment_events for tracking and auditing
    if (payload?.entry) {
      const db = supabaseAdmin();
      await db.from("payment_events").insert({
        provider: "whatsapp",
        provider_event_id: `wa:webhook:${Date.now()}`,
        event_type: "whatsapp.webhook_event",
        payload,
        processed_at: new Date().toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ingestWhatsAppWebhook } from "@/lib/whatsapp-inbox";

function hasValidMetaSignature(rawBody: string, suppliedSignature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) return true;
  if (!suppliedSignature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

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
    const rawBody = await request.text();
    if (!hasValidMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Log receipt to payment_events for tracking and auditing
    if (payload.entry) {
      const db = supabaseAdmin();
      const eventId = `wa:webhook:${createHash("sha256").update(rawBody).digest("hex")}`;
      const { data: event } = await db.from("payment_events").upsert({
        provider: "whatsapp",
        provider_event_id: eventId,
        event_type: "whatsapp.webhook_event",
        payload,
        processed_at: new Date().toISOString(),
      }, { onConflict: "provider,provider_event_id", ignoreDuplicates: true }).select("id").maybeSingle();

      // Only process a delivery once; Meta retries webhooks until it receives 200.
      if (event) await ingestWhatsAppWebhook(payload);
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

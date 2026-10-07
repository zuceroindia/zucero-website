import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureOutboundWhatsAppFeedbackTemplate } from "@/lib/whatsapp-outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = request.headers.get("x-zucero-bootstrap")?.trim();
  if (!raw) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const digest = createHash("sha256").update(raw).digest("hex");
  const key = `feedback-template-bootstrap:${digest}`;
  const db = supabaseAdmin();

  const { data: event, error } = await db
    .from("payment_events")
    .select("id,event_type")
    .eq("provider", "internal")
    .eq("provider_event_id", key)
    .eq("event_type", "whatsapp.feedback_template_bootstrap_pending")
    .maybeSingle();

  if (error || !event) {
    return NextResponse.json({ error: "Unauthorized or bootstrap token already used." }, { status: 401 });
  }

  const result = await ensureOutboundWhatsAppFeedbackTemplate();
  await db.from("payment_events").update({
    event_type: result.success
      ? "whatsapp.feedback_template_bootstrap_completed"
      : "whatsapp.feedback_template_bootstrap_failed",
    payload: {
      purpose: "submit Zucero feedback template to Meta",
      template: result.name,
      language: result.language,
      status: result.status || null,
      template_id: result.templateId || null,
      category: result.category || null,
      error: result.error || null,
    },
    processed_at: new Date().toISOString(),
  }).eq("id", event.id);

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

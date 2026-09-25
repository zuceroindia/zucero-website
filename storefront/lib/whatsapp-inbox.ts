import { supabaseAdmin } from "@/lib/supabase-admin";

type MetaMessage = Record<string, unknown> & {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
};

type MetaStatus = Record<string, unknown> & {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number | string }>;
};

function messageBody(message: MetaMessage): string {
  const type = String(message.type || "unknown");
  if (type === "text") return String((message.text as { body?: string } | undefined)?.body || "");
  if (type === "button") return String((message.button as { text?: string } | undefined)?.text || "Button response");
  if (type === "interactive") {
    const interactive = message.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } } | undefined;
    return String(interactive?.button_reply?.title || interactive?.list_reply?.title || "Interactive response");
  }
  if (type === "location") {
    const location = message.location as { name?: string; address?: string } | undefined;
    return [location?.name, location?.address].filter(Boolean).join(" · ") || "Location shared";
  }
  return `[${type.charAt(0).toUpperCase()}${type.slice(1)} message]`;
}

function timestamp(value: unknown): string {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  return new Date().toISOString();
}

export async function ingestWhatsAppWebhook(payload: Record<string, unknown>) {
  const db = supabaseAdmin();
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as { changes?: unknown[] })?.changes)
      ? (entry as { changes: unknown[] }).changes
      : [];
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      if (!value) continue;

      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const names = new Map<string, string>();
      for (const contact of contacts) {
        const item = contact as { wa_id?: string; profile?: { name?: string } };
        if (item.wa_id && item.profile?.name) names.set(item.wa_id, item.profile.name.trim());
      }

      const messages = Array.isArray(value.messages) ? value.messages as MetaMessage[] : [];
      for (const message of messages) {
        const waId = String(message.from || "").replace(/\D/g, "");
        const messageId = String(message.id || "");
        if (!waId || !messageId) continue;

        const body = messageBody(message);
        const sentAt = timestamp(message.timestamp);
        const { data: conversation, error: conversationError } = await db
          .from("whatsapp_conversations")
          .upsert({
            wa_id: waId,
            ...(names.get(waId) ? { profile_name: names.get(waId) } : {}),
            last_message_preview: body.slice(0, 240),
            last_message_at: sentAt,
            updated_at: new Date().toISOString(),
          }, { onConflict: "wa_id" })
          .select("id")
          .single();
        if (conversationError || !conversation) throw conversationError || new Error("Could not create WhatsApp conversation");

        const { data: inserted, error: messageError } = await db
          .from("whatsapp_messages")
          .upsert({
            conversation_id: conversation.id,
            meta_message_id: messageId,
            direction: "inbound",
            message_type: String(message.type || "unknown"),
            body,
            status: "received",
            raw_payload: message,
            sent_at: sentAt,
            updated_at: new Date().toISOString(),
          }, { onConflict: "meta_message_id", ignoreDuplicates: true })
          .select("id")
          .maybeSingle();
        if (messageError) throw messageError;

        if (inserted) {
          const { error: unreadError } = await db.rpc("increment_whatsapp_unread", {
            target_conversation_id: conversation.id,
          });
          if (unreadError) throw unreadError;
        }
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses as MetaStatus[] : [];
      for (const item of statuses) {
        const messageId = String(item.id || "");
        if (!messageId) continue;
        await db.from("whatsapp_messages").update({
          status: String(item.status || "unknown"),
          error_code: item.errors?.[0]?.code ? String(item.errors[0].code) : null,
          raw_payload: item,
          updated_at: new Date().toISOString(),
        }).eq("meta_message_id", messageId);
      }
    }
  }
}

export async function sendWhatsAppTextReply(conversationId: string, body: string) {
  const db = supabaseAdmin();
  const { data: conversation, error } = await db
    .from("whatsapp_conversations")
    .select("id, wa_id")
    .eq("id", conversationId)
    .single();
  if (error || !conversation) throw new Error("Conversation not found");

  const apiToken = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!apiToken || !phoneNumberId) throw new Error("WhatsApp Cloud API credentials are not configured");

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.wa_id,
      type: "text",
      text: { preview_url: false, body },
    }),
    cache: "no-store",
  });
  const result = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || `Meta WhatsApp API error (${response.status})`);

  const messageId = result.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta did not return a message ID");
  const now = new Date().toISOString();
  const { data: saved, error: saveError } = await db.from("whatsapp_messages").upsert({
    conversation_id: conversation.id,
    meta_message_id: messageId,
    direction: "outbound",
    message_type: "text",
    body,
    status: "sent",
    raw_payload: result,
    sent_at: now,
    updated_at: now,
  }, { onConflict: "meta_message_id" }).select("*").single();
  if (saveError) throw new Error(`Message sent but could not be saved: ${saveError.message}`);

  await db.from("whatsapp_conversations").update({
    last_message_preview: body.slice(0, 240),
    last_message_at: now,
    updated_at: now,
  }).eq("id", conversation.id);
  return saved;
}

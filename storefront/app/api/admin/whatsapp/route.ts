import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWhatsAppTextReply } from "@/lib/whatsapp-inbox";

const idSchema = z.string().uuid();
const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4096),
});

async function authorized(request: Request) {
  if (await isAuthorizedAdminOrInternal(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;

  try {
    const db = supabaseAdmin();
    const url = new URL(request.url);
    const selected = url.searchParams.get("conversationId");
    if (selected && !idSchema.safeParse(selected).success) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const { data: conversations, error } = await db
      .from("whatsapp_conversations")
      .select("id, wa_id, profile_name, last_message_preview, last_message_at, unread_count, updated_at")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) throw error;

    let messages: unknown[] = [];
    if (selected) {
      const { data, error: messageError } = await db
        .from("whatsapp_messages")
        .select("id, conversation_id, meta_message_id, direction, message_type, body, status, error_code, sent_at")
        .eq("conversation_id", selected)
        .order("sent_at", { ascending: false })
        .limit(200);
      if (messageError) throw messageError;
      messages = (data || []).reverse();
    }

    return NextResponse.json({ conversations: conversations || [], messages }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("WhatsApp inbox fetch failed:", error);
    return NextResponse.json({ error: "Could not load the WhatsApp inbox." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;

  try {
    const input = sendSchema.parse(await request.json());
    const message = await sendWhatsAppTextReply(input.conversationId, input.body);
    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Enter a message between 1 and 4,096 characters."
      : error instanceof Error ? error.message : "Could not send the message.";
    console.error("WhatsApp reply failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;

  try {
    const input = z.object({ conversationId: z.string().uuid() }).parse(await request.json());
    const { error } = await supabaseAdmin().from("whatsapp_conversations").update({
      unread_count: 0,
      updated_at: new Date().toISOString(),
    }).eq("id", input.conversationId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp read-state update failed:", error);
    return NextResponse.json({ error: "Could not update the conversation." }, { status: 400 });
  }
}

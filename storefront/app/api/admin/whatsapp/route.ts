import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  fetchCustomerOrdersForWaId,
  sendWhatsAppTextReply,
  startWhatsAppConversation,
} from "@/lib/whatsapp-inbox";
import { sendOutboundWhatsAppConfirmation } from "@/lib/whatsapp-outbound";

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
    const lookupPhone = url.searchParams.get("lookupPhone");
    if (lookupPhone) {
      const customerOrders = await fetchCustomerOrdersForWaId(lookupPhone);
      return NextResponse.json({ customerOrders }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

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
    let customerOrders: unknown[] = [];
    if (selected) {
      const { data: conv } = await db
        .from("whatsapp_conversations")
        .select("wa_id")
        .eq("id", selected)
        .single();

      if (conv?.wa_id) {
        customerOrders = await fetchCustomerOrdersForWaId(conv.wa_id);
      }

      const { data, error: messageError } = await db
        .from("whatsapp_messages")
        .select("id, conversation_id, meta_message_id, direction, message_type, body, status, error_code, sent_at")
        .eq("conversation_id", selected)
        .order("sent_at", { ascending: false })
        .limit(200);
      if (messageError) throw messageError;
      messages = (data || []).reverse();
    }

    return NextResponse.json({
      conversations: conversations || [],
      messages,
      customerOrders,
    }, {
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
    const bodyJson = await request.json();

    if (bodyJson.action === "start_conversation") {
      const startSchema = z.object({
        phone: z.string().trim().min(8).max(20),
        customerName: z.string().trim().max(100).optional(),
        body: z.string().trim().min(1).max(4096),
      });
      const input = startSchema.parse(bodyJson);
      const result = await startWhatsAppConversation(input);
      return NextResponse.json(result);
    }

    if (bodyJson.action === "resend_order_confirmation") {
      const orderSchema = z.object({
        orderId: z.string().uuid(),
      });
      const input = orderSchema.parse(bodyJson);
      const result = await sendOutboundWhatsAppConfirmation(input.orderId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || result.reason || "Could not send order confirmation template" },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, messageId: result.messageId });
    }

    // Default: text reply in existing conversation
    const input = sendSchema.parse(bodyJson);
    const message = await sendWhatsAppTextReply(input.conversationId, input.body);
    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid input. Please check the phone number and message length."
      : error instanceof Error ? error.message : "Could not process request.";
    console.error("WhatsApp action failed:", error);
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

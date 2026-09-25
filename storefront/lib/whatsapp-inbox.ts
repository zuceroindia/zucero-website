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

export async function recordOutboundWhatsAppMessage(input: {
  recipient: string;
  customerName?: string;
  bodyText: string;
  metaMessageId: string;
  messageType?: string;
  rawPayload?: Record<string, unknown>;
}) {
  const db = supabaseAdmin();
  const waId = input.recipient.replace(/\D/g, "");
  if (!waId) return null;
  const now = new Date().toISOString();

  const { data: conversation, error: convError } = await db
    .from("whatsapp_conversations")
    .upsert({
      wa_id: waId,
      ...(input.customerName ? { profile_name: input.customerName.trim() } : {}),
      last_message_preview: input.bodyText.slice(0, 240),
      last_message_at: now,
      updated_at: now,
    }, { onConflict: "wa_id" })
    .select("id")
    .single();

  if (convError || !conversation) {
    console.error("[WhatsApp Inbox] Failed to upsert conversation for outbound message:", convError);
    return null;
  }

  const { data: message, error: msgError } = await db
    .from("whatsapp_messages")
    .upsert({
      conversation_id: conversation.id,
      meta_message_id: input.metaMessageId,
      direction: "outbound",
      message_type: input.messageType || "text",
      body: input.bodyText,
      status: "sent",
      raw_payload: input.rawPayload || {},
      sent_at: now,
      updated_at: now,
    }, { onConflict: "meta_message_id" })
    .select("*")
    .single();

  if (msgError) {
    console.error("[WhatsApp Inbox] Failed to record outbound message:", msgError);
    return null;
  }

  return { conversation, message };
}

export async function startWhatsAppConversation(input: {
  phone: string;
  customerName?: string;
  body: string;
}) {
  const db = supabaseAdmin();
  const digits = input.phone.replace(/\D/g, "");
  let waId = digits;
  if (digits.length === 10) {
    waId = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    waId = `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    waId = digits;
  }

  if (waId.length < 10 || waId.length > 15) {
    throw new Error("Please enter a valid 10-digit Indian phone number or international number.");
  }

  const now = new Date().toISOString();
  const { data: conversation, error: convError } = await db
    .from("whatsapp_conversations")
    .upsert({
      wa_id: waId,
      ...(input.customerName ? { profile_name: input.customerName.trim() } : {}),
      last_message_preview: input.body.slice(0, 240),
      last_message_at: now,
      updated_at: now,
    }, { onConflict: "wa_id" })
    .select("*")
    .single();

  if (convError || !conversation) {
    throw new Error(convError?.message || "Could not create conversation");
  }

  const apiToken = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!apiToken || !phoneNumberId) throw new Error("WhatsApp Cloud API credentials are not configured");

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: waId,
      type: "text",
      text: { preview_url: false, body: input.body },
    }),
    cache: "no-store",
  });

  const result = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number } };
  if (!response.ok) {
    if (result.error?.code === 131047 || result.error?.message?.includes("24 hours")) {
      throw new Error("Meta 24-Hour Policy: Meta rejects free-form messages to a phone number that has not messaged you within the last 24 hours. Once the customer initiates a chat or receives an order template, you can reply directly.");
    }
    throw new Error(result.error?.message || `Meta WhatsApp API error (${response.status})`);
  }

  const messageId = result.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta did not return a message ID");

  const { data: saved, error: saveError } = await db.from("whatsapp_messages").upsert({
    conversation_id: conversation.id,
    meta_message_id: messageId,
    direction: "outbound",
    message_type: "text",
    body: input.body,
    status: "sent",
    raw_payload: result,
    sent_at: now,
    updated_at: now,
  }, { onConflict: "meta_message_id" }).select("*").single();

  if (saveError) throw new Error(`Message sent but could not be saved: ${saveError.message}`);

  return { conversation, message: saved };
}

export type CustomerOrderItem = {
  name: string;
  variant: string;
  quantity: number;
};

export type CustomerOrderBrief = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalPaise: number;
  totalRupees: string;
  subtotalRupees?: string;
  taxRupees?: string;
  shippingRupees?: string;
  discountRupees?: string;
  walletSpentRupees?: string;
  trackingAwb?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  estimatedDeliveryWindow?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  deliveryPincode?: string | null;
  invoiceUrl?: string | null;
  itemsSummary: string;
  itemsList: CustomerOrderItem[];
};

export async function fetchCustomerOrdersForWaId(waId: string): Promise<CustomerOrderBrief[]> {
  const db = supabaseAdmin();
  const digits = waId.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length < 10) return [];

  const { data: orders } = await db
    .from("orders")
    .select("id, order_number, created_at, status, payment_status, total_paise, subtotal_paise, tax_paise, shipping_paise, discount_paise, wallet_spent_paise, tracking_awb, courier_name, tracking_url, estimated_delivery_window, customer_phone, customer_email, shipping_address")
    .or(`customer_phone.ilike.%${last10}%,shipping_address->>phone.ilike.%${last10}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  type RawOrderRow = {
    id: string;
    order_number: string;
    created_at: string;
    status: string;
    payment_status: string;
    total_paise: number;
    subtotal_paise?: number;
    tax_paise?: number;
    shipping_paise?: number;
    discount_paise?: number;
    wallet_spent_paise?: number;
    tracking_awb?: string | null;
    courier_name?: string | null;
    tracking_url?: string | null;
    estimated_delivery_window?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    shipping_address?: {
      fullName?: string;
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    } | null;
  };

  const rows = (orders || []) as RawOrderRow[];
  if (rows.length === 0) return [];

  const orderIds = rows.map((o) => o.id);
  const { data: items } = await db
    .from("order_items")
    .select("order_id, product_name, variant_label, quantity")
    .in("order_id", orderIds);

  const itemsMap = new Map<string, CustomerOrderItem[]>();
  for (const it of (items || []) as Array<{ order_id: string; product_name: string; variant_label: string; quantity: number }>) {
    const list = itemsMap.get(it.order_id) || [];
    list.push({
      name: it.product_name,
      variant: it.variant_label,
      quantity: it.quantity,
    });
    itemsMap.set(it.order_id, list);
  }

  return rows.map((o) => {
    const addr = o.shipping_address || {};
    const itemsList = itemsMap.get(o.id) || [];
    const itemsSummary = itemsList.length > 0
      ? itemsList.map((i) => `${i.name} (${i.variant}) × ${i.quantity}`).join(", ")
      : "Zucero Pure Sugar Products";

    const fullAddr = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.postalCode]
      .filter(Boolean)
      .join(", ");

    const trackingUrl = o.tracking_url || (o.tracking_awb ? `https://shiprocket.co/tracking/${o.tracking_awb}` : null);

    return {
      id: o.id,
      orderNumber: o.order_number,
      createdAt: o.created_at,
      status: o.status,
      paymentStatus: o.payment_status,
      totalPaise: o.total_paise,
      totalRupees: (o.total_paise / 100).toFixed(2),
      subtotalRupees: ((o.subtotal_paise || 0) / 100).toFixed(2),
      taxRupees: ((o.tax_paise || 0) / 100).toFixed(2),
      shippingRupees: ((o.shipping_paise || 0) / 100).toFixed(2),
      discountRupees: ((o.discount_paise || 0) / 100).toFixed(2),
      walletSpentRupees: ((o.wallet_spent_paise || 0) / 100).toFixed(2),
      trackingAwb: o.tracking_awb,
      courierName: o.courier_name,
      trackingUrl,
      estimatedDeliveryWindow: o.estimated_delivery_window || "3-5 Business Days",
      customerName: addr.fullName || null,
      customerEmail: o.customer_email || null,
      customerPhone: o.customer_phone || addr.phone || null,
      deliveryAddress: fullAddr || null,
      deliveryCity: addr.city || null,
      deliveryState: addr.state || null,
      deliveryPincode: addr.postalCode || null,
      invoiceUrl: `https://www.thegoodsugar.in/api/orders/${o.id}/invoice`,
      itemsSummary,
      itemsList,
    };
  });
}

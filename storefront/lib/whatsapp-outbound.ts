import { supabaseAdmin } from "@/lib/supabase-admin";
import { whatsappLink } from "@/lib/whatsapp";

export type OutboundWhatsAppResult = {
  success: boolean;
  messageId?: string;
  reason?: string;
  error?: string;
};
type WhatsAppAddress = { phone?: string; fullName?: string; estimated_delivery_window?: string };
type WhatsAppItem = { product_name: string; variant_label: string; quantity: number };
type MetaWhatsAppResponse = { messages?: Array<{ id?: string }>; error?: unknown };

/**
 * Normalizes phone number to international E.164 without '+' for Meta WhatsApp API.
 * e.g., '9876543210' -> '919876543210'
 */
export function normalizeWhatsAppRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  if (digits.length === 13 && digits.startsWith("910")) {
    return `91${digits.slice(3)}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Builds a direct customer WhatsApp support link with pre-filled order details.
 */
export function buildCustomerOrderWhatsAppLink(order: {
  orderNumber: string;
  totalPaise: number;
  estimatedDeliveryWindow?: string | null;
}): string {
  const totalRupees = Math.round(order.totalPaise / 100);
  const delivery = order.estimatedDeliveryWindow || "5–7 days";
  const text = `Hello Zucero! I have placed order ${order.orderNumber} for Rs ${totalRupees}. Expected delivery: ${delivery}. Please share order and shipment tracking updates on this WhatsApp number.`;
  return whatsappLink(text);
}

/**
 * Sends automated outbound WhatsApp order confirmation to the customer.
 * Uses Meta WhatsApp Cloud API (Graph API) when configured, and safely falls back
 * with event logging if credentials are not yet deployed.
 */
export async function sendOutboundWhatsAppConfirmation(orderId: string): Promise<OutboundWhatsAppResult> {
  const db = supabaseAdmin();
  const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).single();
  if (error || !order) {
    console.error(`[WhatsApp Outbound] Order not found: ${orderId}`);
    return { success: false, reason: "order_not_found" };
  }

  const { data: items } = await db.from("order_items").select("*").eq("order_id", orderId);
  const address = (order.shipping_address || {}) as WhatsAppAddress;
  const rawPhone = order.customer_phone || address.phone;
  if (!rawPhone) {
    console.warn(`[WhatsApp Outbound] No phone number available for order ${order.order_number}`);
    return { success: false, reason: "missing_phone" };
  }

  const recipient = normalizeWhatsAppRecipient(rawPhone);
  if (!/^91[6-9]\d{9}$/.test(recipient)) {
    console.warn(`[WhatsApp Outbound] Invalid Indian mobile number for order ${order.order_number}`);
    return { success: false, reason: "invalid_phone" };
  }
  const deliveryWindow = order.estimated_delivery_window || address.estimated_delivery_window || "5–7 days";
  const customerName = address.fullName?.trim() || "Valued Customer";
  const totalRupeesFormatted = (order.total_rupees !== null && order.total_rupees !== undefined)
    ? Number(order.total_rupees).toFixed(2)
    : (order.total_paise / 100).toFixed(2);
  const itemsSummary = (items || [])
    .map((item: WhatsAppItem) => `${item.product_name} (${item.variant_label}) × ${item.quantity}`)
    .join(", ");

  const apiToken = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() || "zucero_order_confirmation";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en_US";

  // If Meta API credentials are not yet set in environment:
  if (!apiToken || !phoneNumberId) {
    console.info(`[WhatsApp Outbound] Meta WhatsApp API credentials (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID) not configured. Order ${order.order_number} confirmation registered for manual/direct wa.me dispatch.`);
    await db.from("payment_events").insert({
      provider: "whatsapp",
      provider_event_id: `outbound:unconfigured:${order.id}`,
      event_type: "whatsapp.pending_credentials",
      payload: {
        order_id: order.id,
        order_number: order.order_number,
        recipient,
        customerName,
        deliveryWindow,
        totalRupees: totalRupeesFormatted,
        itemsSummary,
      },
      processed_at: new Date().toISOString(),
    }).catch(() => {});
    return { success: false, reason: "credentials_not_configured" };
  }

  try {
    // Attempt sending via Meta WhatsApp Cloud API template
    const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    let components: Array<Record<string, unknown>> = [];
    if (templateName === "zucero_order_confirmation_v2" || templateName === "zucero_order_confirmation") {
      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: customerName },
            { type: "text", text: order.order_number },
            { type: "text", text: itemsSummary || "Zucero Pure Sugar Products" },
            { type: "text", text: `INR ${totalRupeesFormatted}` },
            { type: "text", text: deliveryWindow },
          ],
        },
      ];
    } else if (templateName === "jaspers_market_order_confirmation_v1") {
      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: customerName },
            { type: "text", text: order.order_number },
            { type: "text", text: `INR ${totalRupeesFormatted}` },
          ],
        },
      ];
    } else if (templateName === "hello_world") {
      components = [];
    } else {
      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: customerName },
            { type: "text", text: order.order_number },
            { type: "text", text: itemsSummary || "Zucero Pure Sugar Products" },
            { type: "text", text: `INR ${totalRupeesFormatted}` },
            { type: "text", text: deliveryWindow },
          ],
        },
      ];
    }

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await response.json() as MetaWhatsAppResponse;

    if (!response.ok) {
      console.error(`[WhatsApp Outbound] Meta API error for order ${order.order_number}:`, result);
      await db.from("payment_events").insert({
        provider: "whatsapp",
        provider_event_id: `outbound:failed:${order.id}:${Date.now()}`,
        event_type: "whatsapp.send_error",
        payload: { error: result, recipient, order_id: order.id },
        processed_at: new Date().toISOString(),
      }).catch(() => {});
      return { success: false, error: JSON.stringify(result) };
    }

    const messageId = result.messages?.[0]?.id;
    console.info(`[WhatsApp Outbound] Sent WhatsApp message ${messageId} for order ${order.order_number} to ${recipient}`);

    await db.from("payment_events").insert({
      provider: "whatsapp",
      provider_event_id: `outbound:sent:${order.id}:${messageId || Date.now()}`,
      event_type: "whatsapp.sent",
      payload: { messageId, recipient, order_id: order.id },
      processed_at: new Date().toISOString(),
    }).catch(() => {});

    // Try updating orders table if column exists
    await db.from("orders").update({
      whatsapp_status: "sent",
      updated_at: new Date().toISOString(),
    }).eq("id", order.id).catch(() => {});

    return { success: true, messageId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "WhatsApp dispatch exception";
    console.error(`[WhatsApp Outbound] Failed to dispatch for order ${order.order_number}:`, error);
    return { success: false, error: errorMsg };
  }
}

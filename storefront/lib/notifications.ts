import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateInvoiceForOrder } from "@/lib/invoice";
import { sendOutboundWhatsAppConfirmation } from "@/lib/whatsapp-outbound";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.thegoodsugar.in";
const DEFAULT_MERCHANT_EMAIL = "zucero.thegoodsugar@gmail.com";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(paise: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((paise ?? 0) / 100);
}

export type EmailAttachment = {
  content: string; // Base64 encoded string
  filename: string;
  type?: string;
  disposition?: string;
};

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim() || process.env.SENDGRID_API_KEY?.trim();
  const rawFrom = process.env.RESEND_FROM_EMAIL?.trim() || process.env.SENDGRID_FROM_EMAIL?.trim() || "Zucero <orders@thegoodsugar.in>";
  if (!apiKey) {
    console.warn("Email notification skipped: Resend is not configured (RESEND_API_KEY missing)");
    return false;
  }

  const from = rawFrom.includes("<") ? rawFrom : `Zucero <${rawFrom}>`;
  const attachments = input.attachments && input.attachments.length > 0
    ? input.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
      }))
    : undefined;

  const payload: Record<string, any> = {
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  };

  if (attachments) {
    payload.attachments = attachments;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend email failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
  return true;
}

async function once(key: string, eventType: string, payload: Record<string, unknown>, send: () => Promise<boolean>) {
  const db = supabaseAdmin();
  const { error } = await db.from("payment_events").insert({
    provider: "internal",
    provider_event_id: key,
    event_type: eventType,
    payload,
    processed_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") return false;
    throw new Error(`Could not reserve notification event: ${error.message}`);
  }

  try {
    const sent = await send();
    if (!sent) {
      await db.from("payment_events").delete().eq("provider", "internal").eq("provider_event_id", key);
    }
    return sent;
  } catch (error) {
    await db.from("payment_events").delete().eq("provider", "internal").eq("provider_event_id", key);
    throw error;
  }
}

async function orderSnapshot(orderId: string) {
  const db = supabaseAdmin();
  const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).single();
  if (error || !order) throw new Error("Order not found for notification");
  const { data: items } = await db.from("order_items").select("*").eq("order_id", orderId);
  return { order, items: items ?? [] };
}

function itemsHtml(items: any[]) {
  return items.map((item) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.product_name)} · ${escapeHtml(item.variant_label)} × ${escapeHtml(item.quantity)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(money(item.line_total_paise))}</td></tr>`).join("");
}

function itemsText(items: any[]) {
  return items.map((item) => `${item.product_name} · ${item.variant_label} × ${item.quantity} — ${money(item.line_total_paise)}`).join("\n");
}

export async function notifyPaidOrder(orderId: string) {
  const { order, items } = await orderSnapshot(orderId);
  const address = (order.shipping_address ?? {}) as Record<string, any>;
  const merchantEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || DEFAULT_MERCHANT_EMAIL;
  const accountUrl = `${SITE_URL}/account/orders`;
  const deliveryWindow = order.estimated_delivery_window || address.estimated_delivery_window || "3-5 business days";
  const invoiceNumber = order.invoice_number || `INV-${order.order_number}`;

  // Generate tax invoice PDF
  let invoiceBuffer: Buffer | null = null;
  try {
    const inv = await generateInvoiceForOrder(orderId);
    invoiceBuffer = inv.buffer;
  } catch (invoiceErr) {
    console.error("Could not generate invoice PDF for paid order email attachment:", invoiceErr);
  }

  const attachments: EmailAttachment[] | undefined = invoiceBuffer
    ? [
        {
          content: invoiceBuffer.toString("base64"),
          filename: `${invoiceNumber}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ]
    : undefined;

  const customerHtml = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#10271d;line-height:1.5">
      <div style="border-bottom:3px solid #10271d;padding-bottom:14px;margin-bottom:20px">
        <h1 style="font-family:Georgia,serif;font-weight:500;color:#10271d;margin:0 0 6px 0">Your Zucero order is confirmed.</h1>
        <p style="margin:0;color:#4a6358;font-size:14px">Pure, chemical-free sweetness heading your way</p>
      </div>

      <p>Thank you, ${escapeHtml(address.fullName || "there")}. We have received your payment for order <strong>${escapeHtml(order.order_number)}</strong>.</p>
      
      <div style="background:#f4f7f4;border-left:4px solid #10271d;padding:12px 16px;margin:20px 0;border-radius:4px">
        <p style="margin:0;font-size:14px;color:#10271d;font-weight:bold">Estimated Delivery Window: ${escapeHtml(deliveryWindow)}</p>
        <p style="margin:4px 0 0 0;font-size:12px;color:#4a6358">Dispatched from Gurugram, Haryana via insured express surface delivery.</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml(items)}</table>

      <div style="background:#fafafa;padding:14px 16px;border-radius:6px;margin:16px 0">
        <p style="margin:0 0 4px 0">Subtotal: <strong>${escapeHtml(money(order.subtotal_paise))}</strong></p>
        ${order.discount_paise ? `<p style="margin:0 0 4px 0;color:#1b5e20">Coupon discount: <strong>-${escapeHtml(money(order.discount_paise))}</strong></p>` : ""}
        <p style="margin:0 0 4px 0">Shipping: <strong>${escapeHtml(order.shipping_paise ? money(order.shipping_paise) : "Free")}</strong></p>
        <p style="margin:0 0 4px 0">GST: <strong>${escapeHtml(money(order.tax_paise))}</strong></p>
        <p style="margin:8px 0 0 0;font-size:16px;font-weight:bold;color:#10271d">Total paid: ${escapeHtml(money(order.total_paise))}</p>
      </div>

      <div style="background:#f8f9fa;border:1px solid #e2e8f0;padding:12px 16px;margin:18px 0;border-radius:4px">
        <p style="margin:0;font-size:13px;color:#10271d">📄 <strong>GST Tax Invoice Attached:</strong> Official Tax Invoice <strong>${escapeHtml(invoiceNumber)}</strong> from TIARA TRIVERSE PRIVATE LIMITED has been generated and attached to this email as a PDF. You can also view or download it anytime from your Zucero account.</p>
      </div>

      <p style="font-size:13px;color:#4a6358">We’ll email you again with live AWB tracking as soon as your parcel is dispatched from our fulfilment unit.</p>
      <p style="margin:24px 0 16px 0"><a href="${accountUrl}" style="display:inline-block;padding:12px 22px;background:#10271d;color:white;text-decoration:none;border-radius:4px;font-weight:500">View Your Orders &amp; Invoices</a></p>
    </div>`;

  const customerText = `Your Zucero order ${order.order_number} is confirmed.\n\nEstimated Delivery: ${deliveryWindow}\nOfficial Tax Invoice: Attached as ${invoiceNumber}.pdf\n\n${itemsText(items)}\n\nSubtotal: ${money(order.subtotal_paise)}\n${order.discount_paise ? `Coupon discount: -${money(order.discount_paise)}\n` : ""}Shipping: ${order.shipping_paise ? money(order.shipping_paise) : "Free"}\nGST: ${money(order.tax_paise)}\nTotal paid: ${money(order.total_paise)}\n\nView orders: ${accountUrl}`;

  const merchantHtml = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#10271d">
      <h1>New paid Zucero order</h1>
      <p><strong>${escapeHtml(order.order_number)}</strong> · ${escapeHtml(money(order.total_paise))}</p>
      <p><strong>Estimated Delivery:</strong> ${escapeHtml(deliveryWindow)}</p>
      <table style="width:100%;border-collapse:collapse">${itemsHtml(items)}</table>
      <p><strong>Customer</strong><br/>${escapeHtml(address.fullName)}<br/>${escapeHtml(order.customer_email)}<br/>${escapeHtml(order.customer_phone)}</p>
      <p><strong>Delivery Address</strong><br/>${escapeHtml(address.addressLine1)} ${escapeHtml(address.addressLine2 || "")}<br/>${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postalCode)}</p>
      <p>Razorpay payment: ${escapeHtml(order.razorpay_payment_id || "captured")}<br/>Shiprocket order: ${escapeHtml(order.shiprocket_order_id || "being created")}</p>
      <p>Invoice generated: <strong>${escapeHtml(invoiceNumber)}.pdf</strong> (attached)</p>
    </div>`;

  const merchantText = `New paid Zucero order ${order.order_number}\nTotal: ${money(order.total_paise)}\nEstimated Delivery: ${deliveryWindow}\nCustomer: ${address.fullName} · ${order.customer_email} · ${order.customer_phone}\n${itemsText(items)}\nShiprocket: ${order.shiprocket_order_id || "being created"}`;

  const emailResults = await Promise.allSettled([
    once(`paid-customer:${order.id}`, "order.confirmed.customer", { order_id: order.id }, () =>
      sendEmail({
        to: order.customer_email,
        subject: `Order confirmed · ${order.order_number}`,
        html: customerHtml,
        text: customerText,
        attachments,
      })
    ),
    once(`paid-merchant:${order.id}`, "order.confirmed.merchant", { order_id: order.id }, () =>
      sendEmail({
        to: merchantEmail,
        subject: `New paid order · ${order.order_number}`,
        html: merchantHtml,
        text: merchantText,
        attachments,
      })
    ),
  ]);

  emailResults.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Order email notification failed", result.reason);
    }
  });

  // Trigger outbound WhatsApp notification
  await sendOutboundWhatsAppConfirmation(order.id).catch((err) => {
    console.error("Outbound WhatsApp confirmation failed:", err);
  });
}

export async function notifyShipmentStatus(orderId: string, status: string) {
  const { order } = await orderSnapshot(orderId);
  const normalized = status.trim() || "Shipment updated";
  const merchantEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || DEFAULT_MERCHANT_EMAIL;
  const trackingLine = order.tracking_awb ? `AWB ${order.tracking_awb}${order.courier_name ? ` · ${order.courier_name}` : ""}` : "Tracking details will be available shortly.";
  const accountUrl = `${SITE_URL}/account/orders`;
  const keyStatus = normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

  const customerHtml = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#10271d"><h1 style="font-family:Georgia,serif;font-weight:500">Your order is ${escapeHtml(normalized)}.</h1><p>Order <strong>${escapeHtml(order.order_number)}</strong> has a new delivery update.</p><p>${escapeHtml(trackingLine)}</p><p><a href="${accountUrl}" style="display:inline-block;padding:12px 18px;background:#10271d;color:white;text-decoration:none">Track your order</a></p></div>`;
  const customerText = `Order ${order.order_number}: ${normalized}\n${trackingLine}\nTrack: ${accountUrl}`;
  const merchantText = `Shipment update for ${order.order_number}: ${normalized}\n${trackingLine}`;

  const results = await Promise.allSettled([
    once(`shipment-customer:${order.id}:${keyStatus}`, "shipment.status.customer", { order_id: order.id, status: normalized }, () => sendEmail({ to: order.customer_email, subject: `${normalized} · ${order.order_number}`, html: customerHtml, text: customerText })),
    once(`shipment-merchant:${order.id}:${keyStatus}`, "shipment.status.merchant", { order_id: order.id, status: normalized }, () => sendEmail({ to: merchantEmail, subject: `Shipment update · ${order.order_number}`, html: `<p>${escapeHtml(merchantText)}</p>`, text: merchantText })),
  ]);
  results.forEach((result) => { if (result.status === "rejected") console.error("Shipment email notification failed", result.reason); });
}

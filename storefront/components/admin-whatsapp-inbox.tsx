"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import styles from "@/app/admin/whatsapp/inbox.module.css";

type Conversation = {
  id: string;
  wa_id: string;
  profile_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  body: string;
  status: string;
  error_code: string | null;
  error_message?: string | null;
  sent_at: string;
};

type CustomerOrderItem = {
  name: string;
  variant: string;
  quantity: number;
};

type CustomerOrder = {
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
  shipmentStatus?: string | null;
  shipmentStatusUpdatedAt?: string | null;
  updatedAt?: string | null;
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

type SavedReply = {
  id: string;
  label: string;
  body: string;
  category: string;
  active: boolean;
  sort_order: number;
  updated_at?: string | null;
};

const QUICK_REPLIES = [
  {
    label: "📦 Dispatched (5-7d)",
    text: "Hello! Your Zucero order is dispatched and on its way. Delivery is estimated within 5–7 days. We will share your live courier tracking link shortly.",
  },
  {
    label: "🚚 Live Tracking",
    text: "You can track your order status live anytime using your AWB number. Please let us know if you need any assistance!",
  },
  {
    label: "💳 Payment Confirmed",
    text: "Thank you! Your payment has been received and verified successfully. Your order is being freshly packed at our facility.",
  },
  {
    label: "🌿 100% Pure Khand",
    text: "Zucero is 100% natural, unrefined Desi Khand and Dhage Wali Mishri, crafted traditionally from pure sugarcane juice with zero sulfur or artificial bleaching.",
  },
];

function fullDateTime(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function statusText(value?: string | null) {
  if (!value) return "Pending";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function applySavedReply(body: string, ord?: CustomerOrder, name?: string) {
  const values: Record<string, string> = {
    name: name || ord?.customerName || "Customer",
    order_number: ord?.orderNumber || "your order",
    order_date: fullDateTime(ord?.createdAt),
    order_status: statusText(ord?.status),
    payment_status: statusText(ord?.paymentStatus),
    total: ord?.totalRupees || (ord ? (ord.totalPaise / 100).toFixed(2) : ""),
    items: ord?.itemsSummary || "",
    shipment_status: statusText(ord?.shipmentStatus || ord?.status),
    shipment_updated_at: fullDateTime(ord?.shipmentStatusUpdatedAt || ord?.updatedAt),
    courier: ord?.courierName || "Pending assignment",
    awb: ord?.trackingAwb || "Pending",
    tracking_url: ord?.trackingUrl || (ord?.trackingAwb ? `https://shiprocket.co/tracking/${ord.trackingAwb}` : "Pending"),
    delivery_eta: ord?.estimatedDeliveryWindow || "Pending",
    address: ord?.deliveryAddress || "Saved delivery address",
    invoice_url: ord?.invoiceUrl || (ord ? `https://www.thegoodsugar.in/api/orders/${ord.id}/invoice` : ""),
    feedback_link: ord ? `https://www.thegoodsugar.in/feedback?order=${encodeURIComponent(ord.orderNumber)}` : "https://www.thegoodsugar.in/feedback",
  };
  return body.replace(/\{\{([a-z_]+)\}\}/gi, (_, key: string) => values[key.toLowerCase()] ?? `{{${key}}}`);
}

function buildDetailedStatusMessage(ord: CustomerOrder, name?: string) {
  const greeting = name ? `Hello ${name}` : "Hello";
  const trackingLink = ord.trackingUrl || (ord.trackingAwb ? `https://shiprocket.co/tracking/${ord.trackingAwb}` : "Pending");
  return `${greeting}, here is the latest Zucero update for your order:

📦 Order: #${ord.orderNumber}
🗓 Order placed: ${fullDateTime(ord.createdAt)}
💳 Payment: ${statusText(ord.paymentStatus)}
📋 Order status: ${statusText(ord.status)}
🚚 Shipment status: ${statusText(ord.shipmentStatus || ord.status)}
🕒 Shipment last updated: ${fullDateTime(ord.shipmentStatusUpdatedAt || ord.updatedAt)}
📦 Products: ${ord.itemsSummary}
💰 Total: ₹${ord.totalRupees || (ord.totalPaise / 100).toFixed(2)}
🚛 Courier: ${ord.courierName || "Pending assignment"}
🔎 AWB: ${ord.trackingAwb || "Pending"}
📍 Delivery: ${ord.deliveryAddress || "Saved delivery address"}
📅 Expected delivery: ${ord.estimatedDeliveryWindow || "Pending"}
🔗 Live tracking: ${trackingLink}

We’ll keep this status updated as your shipment moves.`;
}

function buildOrderSummaryMessage(ord: CustomerOrder, name?: string) {
  const greeting = name ? `Hello ${name}` : "Hello";
  const statusLabel = ord.paymentStatus === "captured" || ord.status === "paid" ? "Paid" : (ord.status || "Confirmed");
  return `${greeting}, thank you for ordering with Zucero! 🍃

📦 Order Details: #${ord.orderNumber}
Order Date: ${fullDateTime(ord.createdAt)}
• ${ord.itemsSummary || "Zucero Pure Sugars"}

Total Amount: ₹${ord.totalRupees || (ord.totalPaise / 100).toFixed(0)} (${statusLabel})
Delivery Address: ${ord.deliveryAddress || "Your saved address"}
Expected Delivery: ${ord.estimatedDeliveryWindow || "3-5 Business Days"}

Please reply here if you have any questions or delivery instructions!`;
}

function buildTrackingMessage(ord: CustomerOrder, name?: string) {
  const greeting = name ? `Hello ${name}` : "Hello";
  if (ord.trackingAwb) {
    const courier = ord.courierName || "Shiprocket Express";
    const trackingLink = ord.trackingUrl || `https://shiprocket.co/tracking/${ord.trackingAwb}`;
    return `${greeting}, great news! Your Zucero order #${ord.orderNumber} has been dispatched! 🚚

Shipment Status: ${statusText(ord.shipmentStatus || ord.status)}
Last Updated: ${fullDateTime(ord.shipmentStatusUpdatedAt || ord.updatedAt)}
Courier Partner: ${courier}
Tracking AWB: ${ord.trackingAwb}
Live Tracking Link: ${trackingLink}
Expected Delivery: ${ord.estimatedDeliveryWindow || "3-5 Business Days"}

Your parcel of unrefined sweetness is on its way! 🍃`;
  }

  return `${greeting}, your Zucero order #${ord.orderNumber} is freshly packed and scheduled for courier pickup today. We will share your live tracking link as soon as the courier scans your package! 🍃`;
}

function buildConfirmationMessage(ord: CustomerOrder, name?: string) {
  const greeting = name ? `Hello ${name}` : "Hello";
  const itemsText = ord.itemsSummary || "Zucero Pure Sugar Products";
  const total = ord.totalRupees || (ord.totalPaise / 100).toFixed(0);
  const delivery = ord.estimatedDeliveryWindow || "3-5 Business Days";
  return `${greeting}, thank you for ordering with Zucero! 🍃

Your order #${ord.orderNumber} for ${itemsText} is confirmed.
Total Paid: ₹${total}
Estimated Delivery: ${delivery}

We will share your live tracking link as soon as your parcel is dispatched!`;
}

function buildInvoiceMessage(ord: CustomerOrder, name?: string) {
  const greeting = name ? `Hello ${name}` : "Hello";
  const link = ord.invoiceUrl || `https://www.thegoodsugar.in/api/orders/${ord.id}/invoice`;
  return `${greeting}, here is your official GST Tax Invoice for Zucero order #${ord.orderNumber}:

📄 Download Tax Invoice:
${link}

Thank you for choosing mindful sweetness! 🍃`;
}

function time(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function phone(value: string) {
  return value.startsWith("91") && value.length === 12
    ? `+91 ${value.slice(2, 7)} ${value.slice(7)}`
    : `+${value}`;
}


function hasOpenServiceWindow(messages: Message[]) {
  const latestInbound = [...messages]
    .filter((message) => message.direction === "inbound")
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

  if (!latestInbound) return false;
  const timestamp = new Date(latestInbound.sent_at).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < 24 * 60 * 60 * 1000;
}

function friendlyWhatsAppError(value: unknown) {
  const message = value instanceof Error ? value.message : String(value || "");
  if (message.toLowerCase().includes("api access blocked") || message.toLowerCase().includes("meta cloud api authorization is blocked")) {
    return "Meta Cloud API authorization is blocked. Refresh the WhatsApp System User access token and confirm the token has whatsapp_business_messaging access to the Zucero WhatsApp Business Account.";
  }
  if (message.toLowerCase().includes("24-hour whatsapp") || message.toLowerCase().includes("customer-service window is closed")) {
    return "The 24-hour WhatsApp customer-service window is closed. Use an approved Meta template (Order Confirmation or Order Update) for this customer.";
  }
  return message || "Message could not be sent";
}

export function AdminWhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDateFilter, setOrderDateFilter] = useState("all");
  const [orderProductFilter, setOrderProductFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successNote, setSuccessNote] = useState("");
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateLabel, setTemplateLabel] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateSortOrder, setTemplateSortOrder] = useState(100);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [syncingOrder, setSyncingOrder] = useState(false);

  // New Chat Modal state & Phone Lookup
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newChatSubmitting, setNewChatSubmitting] = useState(false);
  const [newChatError, setNewChatError] = useState("");
  const [modalLookupOrders, setModalLookupOrders] = useState<CustomerOrder[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const query = selectedId ? `?conversationId=${encodeURIComponent(selectedId)}` : "";
      const response = await fetch(`/api/admin/whatsapp${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load inbox");
      setConversations(data.conversations || []);
      setMessages(data.messages || []);
      const nextOrders = (data.customerOrders || []) as CustomerOrder[];
      setCustomerOrders(nextOrders);
      setSavedReplies(data.savedReplies || []);
      setSelectedOrderId((current) =>
        current && nextOrders.some((order) => order.id === current)
          ? current
          : nextOrders[0]?.id || null
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load inbox");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    fetch("/api/admin/whatsapp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedId }),
    }).catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Deep-link query param listener: /admin/whatsapp?phone=...
  useEffect(() => {
    if (typeof window === "undefined" || conversations.length === 0) return;
    const p = new URLSearchParams(window.location.search).get("phone");
    if (!p) return;

    const clean = p.replace(/\D/g, "");
    if (clean.length < 10) return;

    const last10 = clean.slice(-10);
    const found = conversations.find((c) => c.wa_id.includes(last10));
    if (found) {
      const timer = window.setTimeout(() => setSelectedId(found.id), 0);
      return () => window.clearTimeout(timer);
    } else {
      const timer = window.setTimeout(() => {
        setNewPhone(p);
        setShowNewChatModal(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [conversations]);

  // Real-time phone lookup in + New Chat modal
  useEffect(() => {
    const digits = newPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      const timer = window.setTimeout(() => setModalLookupOrders([]), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/whatsapp?lookupPhone=${encodeURIComponent(digits.slice(-10))}`);
        if (res.ok) {
          const data = await res.json();
          const ords = (data.customerOrders || []) as CustomerOrder[];
          setModalLookupOrders(ords);
          if (ords.length > 0 && !newName.trim() && ords[0].customerName) {
            setNewName(ords[0].customerName);
          }
        }
      } catch {}
    }, 350);

    return () => window.clearTimeout(timer);
  }, [newPhone, newName]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || !body || sending) return;
    if (!hasOpenServiceWindow(messages)) {
      setError("");
      setSuccessNote(
        "Meta has closed the free-form reply window for this customer. Your custom draft is preserved. Use Order Confirmation or Order Update in the right panel to send immediately."
      );
      window.setTimeout(() => setSuccessNote(""), 7000);
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message could not be sent");
      setDraft("");
      await load(true);
    } catch (err) {
      setError(friendlyWhatsAppError(err));
    } finally {
      setSending(false);
    }
  }

  function insertIntoDraft(body: string) {
    setDraft(body);
    setSuccessNote("✨ Option loaded into composer below. Review or edit, then click Send!");
    setTimeout(() => {
      composerInputRef.current?.focus();
      composerInputRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    setTimeout(() => setSuccessNote(""), 6000);
  }

  async function handleStartNewChat(event: FormEvent) {
    event.preventDefault();
    if (!newPhone.trim() || !newMessage.trim() || newChatSubmitting) return;
    setNewChatSubmitting(true);
    setNewChatError("");
    try {
      const response = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_conversation",
          phone: newPhone.trim(),
          customerName: newName.trim() || undefined,
          body: newMessage.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start conversation");
      setShowNewChatModal(false);
      setNewPhone("");
      setNewName("");
      setNewMessage("");
      setModalLookupOrders([]);
      setSuccessNote("Message sent and conversation started!");
      await load(true);
      if (data.conversation?.id) {
        setSelectedId(data.conversation.id);
      }
      setTimeout(() => setSuccessNote(""), 5000);
    } catch (err) {
      setNewChatError(friendlyWhatsAppError(err));
    } finally {
      setNewChatSubmitting(false);
    }
  }

  async function resendOrderTemplate(orderId: string) {
    try {
      const response = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_order_confirmation", orderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not resend order confirmation");
      setSuccessNote("Official Order Confirmation template sent via Meta WhatsApp Cloud API!");
      await load(true);
      setTimeout(() => setSuccessNote(""), 5000);
    } catch (err) {
      setError(friendlyWhatsAppError(err));
    }
  }

  async function sendOrderUpdateTemplate(orderId: string) {
    try {
      const response = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_order_update", orderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send order update");
      setSuccessNote("Approved Order Update template sent via Meta WhatsApp Cloud API!");
      await load(true);
      setTimeout(() => setSuccessNote(""), 5000);
    } catch (err) {
      setError(friendlyWhatsAppError(err));
    }
  }


  async function syncLiveOrder(orderId: string) {
    if (syncingOrder) return;
    setSyncingOrder(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/sync-shipping`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh shipment status");
      setSuccessNote(`Live shipment refreshed: ${data.shiprocketStatus || "updated"}`);
      await load(true);
      setTimeout(() => setSuccessNote(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh shipment status");
    } finally {
      setSyncingOrder(false);
    }
  }

  function resetTemplateEditor() {
    setTemplateId(null);
    setTemplateLabel("");
    setTemplateBody("");
    setTemplateSortOrder(100);
  }

  function editTemplate(item: SavedReply) {
    setTemplateId(item.id);
    setTemplateLabel(item.label);
    setTemplateBody(item.body);
    setTemplateSortOrder(item.sort_order ?? 100);
  }

  async function saveCrmTemplate(event: FormEvent) {
    event.preventDefault();
    if (!templateLabel.trim() || !templateBody.trim() || templateSaving) return;
    setTemplateSaving(true);
    try {
      const response = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_crm_template",
          id: templateId || undefined,
          label: templateLabel.trim(),
          body: templateBody.trim(),
          category: "quick_reply",
          sortOrder: templateSortOrder,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save CRM template");
      resetTemplateEditor();
      await load(true);
      setSuccessNote("Saved reply template updated.");
      setTimeout(() => setSuccessNote(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save CRM template");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function deleteCrmTemplate(id: string) {
    if (!window.confirm("Remove this saved reply from the CRM?")) return;
    try {
      const response = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_crm_template", id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove template");
      if (templateId === id) resetTemplateEditor();
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove template");
    }
  }

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (item) =>
        (item.profile_name && item.profile_name.toLowerCase().includes(q)) ||
        item.wa_id.includes(q) ||
        (item.last_message_preview && item.last_message_preview.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const orderDateOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const order of customerOrders) {
      const date = new Date(order.createdAt);
      if (!Number.isFinite(date.getTime())) continue;
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const year = parts.find((part) => part.type === "year")?.value || "";
      const month = parts.find((part) => part.type === "month")?.value || "";
      const day = parts.find((part) => part.type === "day")?.value || "";
      const key = `${year}-${month}-${day}`;
      const label = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
      if (key !== "--") map.set(key, label);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [customerOrders]);

  const orderProductOptions = useMemo(() => {
    const products = new Set<string>();
    for (const order of customerOrders) {
      for (const item of order.itemsList || []) {
        if (item.name?.trim()) products.add(item.name.trim());
      }
    }
    return Array.from(products).sort((a, b) => a.localeCompare(b));
  }, [customerOrders]);

  const orderStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    for (const order of customerOrders) {
      const value = order.shipmentStatus || order.status;
      if (value) statuses.add(value);
    }
    return Array.from(statuses).sort((a, b) => statusText(a).localeCompare(statusText(b)));
  }, [customerOrders]);

  const filteredCustomerOrders = useMemo(() => {
    return customerOrders.filter((order) => {
      if (orderDateFilter !== "all") {
        const date = new Date(order.createdAt);
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(date);
        const key = `${parts.find((part) => part.type === "year")?.value || ""}-${parts.find((part) => part.type === "month")?.value || ""}-${parts.find((part) => part.type === "day")?.value || ""}`;
        if (key !== orderDateFilter) return false;
      }

      if (
        orderProductFilter !== "all" &&
        !(order.itemsList || []).some((item) => item.name === orderProductFilter)
      ) {
        return false;
      }

      if (
        orderStatusFilter !== "all" &&
        (order.shipmentStatus || order.status) !== orderStatusFilter
      ) {
        return false;
      }

      return true;
    });
  }, [customerOrders, orderDateFilter, orderProductFilter, orderStatusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    setOrderDateFilter("all");
    setOrderProductFilter("all");
    setOrderStatusFilter("all");
    setSelectedOrderId(null);
  }, [selectedId]);

  useEffect(() => {
    if (!filteredCustomerOrders.length) {
      setSelectedOrderId(null);
      return;
    }
    if (!selectedOrderId || !filteredCustomerOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredCustomerOrders[0].id);
    }
  }, [filteredCustomerOrders, selectedOrderId]);

  const selected = conversations.find((item) => item.id === selectedId);
  const activeOrder =
    filteredCustomerOrders.find((order) => order.id === selectedOrderId) ||
    filteredCustomerOrders[0] ||
    null;
  const serviceWindowOpen = hasOpenServiceWindow(messages);

  function renderStatus(message: Message) {
    if (message.error_code || message.status === "failed") {
      const is24h =
        message.error_code === "131047" ||
        message.error_message?.toLowerCase().includes("24 hour");
      const tooltip =
        message.error_message ||
        (is24h
          ? "Meta Cloud API policy: the free-form customer-service window is closed. Use an approved template for this linked order."
          : "Message delivery failed via Meta Cloud API.");
      return (
        <span className={styles.statusFailed} title={tooltip}>
          ⚠️ Failed {is24h ? "(24h window closed)" : ""}
        </span>
      );
    }
    if (message.status === "read") {
      return (
        <span className={styles.statusRead} title="Read by recipient">
          <CheckCheck size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Read
        </span>
      );
    }
    if (message.status === "delivered") {
      return (
        <span className={styles.statusDelivered} title="Delivered to phone">
          <CheckCheck size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Delivered
        </span>
      );
    }
    return (
      <span className={styles.statusDelivered} title="Sent to WhatsApp">
        <Check size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Sent
      </span>
    );
  }

  return (
    <section className={styles.shell}>
      <header className={styles.heading}>
        <div>
          <p>Zucero customer care</p>
          <h1>WhatsApp Inbox</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={() => {
              resetTemplateEditor();
              setShowTemplateManager(true);
            }}
          >
            <Settings2 size={16} /> Templates
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setNewChatError("");
              setModalLookupOrders([]);
              setShowNewChatModal(true);
            }}
          >
            <Plus size={16} /> New Chat
          </button>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={() => load()}
            aria-label="Refresh inbox"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {successNote && (
        <p className={styles.successNote} role="status">
          {successNote}
        </p>
      )}

      <div className={styles.inbox}>
        {/* Left Sidebar: Conversations List */}
        <aside
          className={`${styles.conversations} ${selectedId ? styles.mobileHidden : ""}`}
          aria-label="Conversations"
        >
          <div className={styles.searchBar}>
            <Search size={15} color="#797368" />
            <input
              type="text"
              placeholder="Search chat or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversations"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.conversationList}>
            {loading && conversations.length === 0 && (
              <div className={styles.empty}>
                <RefreshCw size={24} className="spin" />
                <span>Loading conversations…</span>
              </div>
            )}

            {!loading && filteredConversations.length === 0 && (
              <div className={styles.empty}>
                <MessageCircle size={28} />
                <strong>No conversations yet</strong>
                <span>Click &quot;+ New Chat&quot; above to message any customer number.</span>
              </div>
            )}

            {filteredConversations.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.conversationItem} ${item.id === selectedId ? styles.activeConversation : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={styles.avatar}>
                  {(item.profile_name || item.wa_id).slice(0, 1).toUpperCase()}
                </span>
                <span className={styles.conversationCopy}>
                  <strong>{item.profile_name || phone(item.wa_id)}</strong>
                  <small>{item.last_message_preview || "New conversation"}</small>
                </span>
                <span className={styles.conversationMeta}>
                  <time>{time(item.last_message_at)}</time>
                  {item.unread_count > 0 && (
                    <span className={styles.unreadBadge}>{item.unread_count}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat / Messages Column */}
        <section
          className={`${styles.chat} ${activeOrder ? styles.chatWithDetails : ""} ${!selectedId ? styles.mobileHidden : ""}`}
          aria-label="Selected conversation"
        >
          {!selected && (
            <div className={styles.placeholder}>
              <MessageCircle size={44} />
              <h2>Select a conversation</h2>
              <p>
                Read customer messages, view order history, or click <strong>+ New Chat</strong> to
                message any customer number.
              </p>
            </div>
          )}

          {selected && (
            <>
              {/* Chat Header */}
              <header className={styles.chatHeader}>
                <div className={styles.chatHeaderInfo}>
                  <button
                    type="button"
                    className={styles.mobileBackBtn}
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className={styles.chatHeaderMeta}>
                    <strong>{selected.profile_name || phone(selected.wa_id)}</strong>
                    <span>{phone(selected.wa_id)}</span>
                  </div>
                </div>
              </header>

              {/* Linked Customer Orders Intelligence Panel */}
              {customerOrders.length > 0 && activeOrder && (
                <div className={styles.orderIntelBox}>
                  <div className={styles.orderIntelHeader}>
                    <div className={styles.orderIntelHeading}>
                      <Package size={15} color="#8a6b2f" />
                      <span>Customer Orders ({customerOrders.length})</span>
                      {customerOrders.length > 1 && (
                        <div className={styles.orderFinder}>
                          <div className={styles.orderFilterGrid}>
                            <label className={styles.orderFilterLabel}>
                              <span>Date</span>
                              <select
                                value={orderDateFilter}
                                onChange={(event) => setOrderDateFilter(event.target.value)}
                                className={styles.orderSelect}
                              >
                                <option value="all">All dates</option>
                                {orderDateOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className={styles.orderFilterLabel}>
                              <span>Product</span>
                              <select
                                value={orderProductFilter}
                                onChange={(event) => setOrderProductFilter(event.target.value)}
                                className={styles.orderSelect}
                              >
                                <option value="all">All products</option>
                                {orderProductOptions.map((product) => (
                                  <option key={product} value={product}>
                                    {product}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className={styles.orderFilterLabel}>
                              <span>Status</span>
                              <select
                                value={orderStatusFilter}
                                onChange={(event) => setOrderStatusFilter(event.target.value)}
                                className={styles.orderSelect}
                              >
                                <option value="all">All statuses</option>
                                {orderStatusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {statusText(status)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <label className={styles.orderFilterLabel}>
                            <span>Select order</span>
                            <select
                              value={activeOrder?.id || ""}
                              onChange={(event) => setSelectedOrderId(event.target.value)}
                              className={styles.orderSelect}
                              disabled={filteredCustomerOrders.length === 0}
                            >
                              {filteredCustomerOrders.length === 0 ? (
                                <option value="">No matching orders</option>
                              ) : (
                                filteredCustomerOrders.map((ord) => (
                                  <option key={ord.id} value={ord.id}>
                                    #{ord.orderNumber} · {fullDateTime(ord.createdAt)} · {ord.itemsList?.[0]?.name || "Order"} · ₹{ord.totalRupees || (ord.totalPaise / 100).toFixed(0)}
                                  </option>
                                ))
                              )}
                            </select>
                          </label>

                          <div className={styles.orderFilterSummary}>
                            <span>{filteredCustomerOrders.length} of {customerOrders.length} orders</span>
                            {(orderDateFilter !== "all" || orderProductFilter !== "all" || orderStatusFilter !== "all") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderDateFilter("all");
                                  setOrderProductFilter("all");
                                  setOrderStatusFilter("all");
                                }}
                              >
                                Clear filters
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <span
                        className={
                          activeOrder.status === "shipped" || activeOrder.status === "in_transit"
                            ? styles.orderStatusBadgeShipped
                            : styles.orderStatusBadge
                        }
                      >
                        {activeOrder.status || "Placed"}
                      </span>
                      <strong style={{ marginLeft: "0.5rem", color: "#102218" }}>
                        ₹{activeOrder.totalRupees || (activeOrder.totalPaise / 100).toFixed(0)}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.orderIntelDetails}>
                    <div className={styles.orderIntelCol}>
                      <span>Products Ordered</span>
                      <strong>{activeOrder.itemsSummary}</strong>
                    </div>
                    <div className={styles.orderIntelCol}>
                      <span>Courier &amp; Tracking</span>
                      {activeOrder.trackingAwb ? (
                        <a
                          href={
                            activeOrder.trackingUrl ||
                            `https://shiprocket.co/tracking/${activeOrder.trackingAwb}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#1a73e8", fontWeight: 600, textDecoration: "underline" }}
                        >
                          {activeOrder.courierName ? `${activeOrder.courierName}: ` : ""}
                          {activeOrder.trackingAwb}
                        </a>
                      ) : (
                        <span style={{ color: "#8a6b2f", fontWeight: 600 }}>AWB Pending Dispatch</span>
                      )}
                    </div>
                    <div className={styles.orderIntelCol}>
                      <span>Delivery Location</span>
                      <strong>{activeOrder.deliveryAddress || "Address in database"}</strong>
                    </div>
                  </div>


                  <div className={styles.liveStatusGrid}>
                    <div>
                      <span>Order placed</span>
                      <strong>{fullDateTime(activeOrder.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Shipment status</span>
                      <strong>{statusText(activeOrder.shipmentStatus || activeOrder.status)}</strong>
                    </div>
                    <div>
                      <span>Last shipment update</span>
                      <strong>{fullDateTime(activeOrder.shipmentStatusUpdatedAt || activeOrder.updatedAt)}</strong>
                    </div>
                    <div>
                      <span>Expected delivery</span>
                      <strong>{activeOrder.estimatedDeliveryWindow || "Pending"}</strong>
                    </div>
                  </div>

                  <div className={`${styles.serviceWindowCard} ${serviceWindowOpen ? styles.serviceWindowOpen : styles.serviceWindowClosed}`}>
                    <span>WhatsApp Reply Window</span>
                    <strong>{serviceWindowOpen ? "Open · Custom messages can be sent" : "Closed · Use an approved Meta template"}</strong>
                  </div>

                  {/* Send Options Toolbar */}
                  <div className={styles.orderActionRow}>
                    <span className={styles.orderActionLabel}>
                      <Sparkles size={12} /> Send Options:
                    </span>
                    <button
                      type="button"
                      className={styles.orderActionBtn}
                      disabled={syncingOrder}
                      onClick={() => syncLiveOrder(activeOrder.id)}
                      title="Pull the latest shipment status from Shiprocket"
                    >
                      <RefreshCw size={13} className={syncingOrder ? "spin" : undefined} /> {syncingOrder ? "Refreshing…" : "Refresh Live Status"}
                    </button>
                    <button
                      type="button"
                      className={styles.orderActionBtn}
                      onClick={() =>
                        insertIntoDraft(
                          buildDetailedStatusMessage(
                            activeOrder,
                            selected.profile_name || activeOrder.customerName || undefined
                          )
                        )
                      }
                      title="Load complete real-time order and shipment details"
                    >
                      <Truck size={13} /> Detailed Status
                    </button>
                    <button
                      type="button"
                      className={styles.orderActionBtn}
                      onClick={() =>
                        insertIntoDraft(
                          buildOrderSummaryMessage(
                            activeOrder,
                            selected.profile_name || activeOrder.customerName || undefined
                          )
                        )
                      }
                      title="Load formatted order summary into chat composer"
                    >
                      <Package size={13} /> Order Details
                    </button>
                    <button
                      type="button"
                      className={styles.orderActionBtn}
                      onClick={() =>
                        insertIntoDraft(
                          buildTrackingMessage(
                            activeOrder,
                            selected.profile_name || activeOrder.customerName || undefined
                          )
                        )
                      }
                      title="Load live tracking and AWB into chat composer"
                    >
                      <Truck size={13} /> Live Tracking
                    </button>
                    <button
                      type="button"
                      className={styles.orderActionBtn}
                      onClick={() =>
                        insertIntoDraft(
                          buildConfirmationMessage(
                            activeOrder,
                            selected.profile_name || activeOrder.customerName || undefined
                          )
                        )
                      }
                      title="Load order confirmation text into chat composer"
                    >
                      <CheckCheck size={13} /> Confirmation Text
                    </button>
                    <button
                      type="button"
                      className={styles.orderActionBtn}
                      onClick={() =>
                        insertIntoDraft(
                          buildInvoiceMessage(
                            activeOrder,
                            selected.profile_name || activeOrder.customerName || undefined
                          )
                        )
                      }
                      title="Load tax invoice download link into chat composer"
                    >
                      <FileText size={13} /> Tax Invoice
                    </button>
                    <button
                      type="button"
                      className={`${styles.orderActionBtn} ${styles.orderActionBtnPrimary}`}
                      onClick={() => resendOrderTemplate(activeOrder.id)}
                      title="Send official Meta WhatsApp Order Confirmation template"
                    >
                      <Send size={13} /> Meta Template
                    </button>
                    <button
                      type="button"
                      className={`${styles.orderActionBtn} ${styles.orderActionBtnPrimary}`}
                      onClick={() => sendOrderUpdateTemplate(activeOrder.id)}
                      title="Send approved Meta WhatsApp order_update_v1 template"
                    >
                      <Truck size={13} /> Order Update
                    </button>
                  </div>
                </div>
              )}

              {/* Messages Thread */}
              <div className={styles.messages} aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`${styles.messageArticle} ${
                      message.direction === "outbound" ? styles.outbound : styles.inbound
                    }`}
                  >
                    <p>{message.body}</p>
                    <footer className={styles.messageFooter}>
                      <time>{time(message.sent_at)}</time>
                      {renderStatus(message)}
                    </footer>
                  </article>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Quick Canned Replies */}
              <div className={styles.quickReplies} aria-label="Quick reply options">
                <span className={styles.quickRepliesLabel}>
                  <Sparkles size={13} /> Quick reply:
                </span>
                {(savedReplies.length ? savedReplies : QUICK_REPLIES.map((item, index) => ({
                  id: `fallback-${index}`,
                  label: item.label,
                  body: item.text,
                  category: "quick_reply",
                  active: true,
                  sort_order: index * 10,
                }))).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.quickReplyChip}
                    onClick={() =>
                      setDraft(
                        applySavedReply(
                          item.body,
                          activeOrder,
                          selected?.profile_name || activeOrder?.customerName || undefined
                        )
                      )
                    }
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.quickReplyManage}
                  onClick={() => {
                    resetTemplateEditor();
                    setShowTemplateManager(true);
                  }}
                >
                  <Settings2 size={12} /> Customize
                </button>
              </div>

              {/* Chat Composer */}
              {!serviceWindowOpen && (
                <div className={styles.windowClosedBanner}>
                  <div>
                    <strong>24-hour reply window closed</strong>
                    <span>Use an approved Meta template to contact this customer.</span>
                  </div>
                  {activeOrder && (
                    <div className={styles.windowClosedActions}>
                      <button
                        type="button"
                        onClick={() => resendOrderTemplate(activeOrder.id)}
                      >
                        <Send size={13} /> Order Confirmation
                      </button>
                      <button
                        type="button"
                        onClick={() => sendOrderUpdateTemplate(activeOrder.id)}
                      >
                        <Truck size={13} /> Order Update
                      </button>
                    </div>
                  )}
                </div>
              )}
              <form className={styles.composer} onSubmit={send}>
                <textarea
                  ref={composerInputRef}
                  rows={2}
                  placeholder={serviceWindowOpen ? "Type or customize a reply…" : "Compose/edit your custom message here. Meta requires an approved template until the customer replies."}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label="Message"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className={`${styles.sendBtn} ${!serviceWindowOpen ? styles.sendBtnNeedsTemplate : ""}`}
                  aria-label={serviceWindowOpen ? "Send via Meta API" : "Show approved send options"}
                  title={serviceWindowOpen ? "Send this custom message via Meta WhatsApp Cloud API" : "Meta has closed free-form sending. Click to keep your draft and use an approved template from the right panel."}
                >
                  <Send size={16} />
                  <span className={styles.sendBtnLabel}>
                    {sending ? "Sending…" : serviceWindowOpen ? "Send" : "Send options"}
                  </span>
                </button>
              </form>
              <p className={styles.windowNote}>
                {serviceWindowOpen ? (
                  <>✅ <strong>Reply window open:</strong> Free-form replies can be sent through Meta Cloud API.</>
                ) : (
                  <>💡 <strong>Draft stays editable:</strong> click Send options and use an approved template from the right panel until the customer replies. Once the 24-hour window opens, this same Send button sends your exact custom text.</>
                )}
              </p>
            </>
          )}
        </section>
      </div>

      {showTemplateManager && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTemplateManager(false);
          }}
        >
          <div className={styles.modalCard} role="dialog" aria-modal="true">
            <header className={styles.modalHeader}>
              <div>
                <h3>CRM Saved Replies</h3>
                <p className={styles.templateHelp}>Create reusable messages with live order variables.</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowTemplateManager(false)}
                aria-label="Close template manager"
              >
                <X size={20} />
              </button>
            </header>

            <div className={styles.templateList}>
              {savedReplies.map((item) => (
                <div key={item.id} className={styles.templateListItem}>
                  <button type="button" onClick={() => editTemplate(item)}>
                    <strong>{item.label}</strong>
                    <span>{item.body}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.templateDeleteBtn}
                    onClick={() => deleteCrmTemplate(item.id)}
                    aria-label={`Delete ${item.label}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form className={styles.modalForm} onSubmit={saveCrmTemplate}>
              <div className={styles.field}>
                <label htmlFor="crmTemplateLabel">Button label</label>
                <input
                  id="crmTemplateLabel"
                  value={templateLabel}
                  onChange={(e) => setTemplateLabel(e.target.value)}
                  placeholder="e.g. 🚚 Shipment Update"
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="crmTemplateBody">Message</label>
                <textarea
                  id="crmTemplateBody"
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={7}
                  placeholder="Hello {{name}}, order #{{order_number}} is {{shipment_status}}..."
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="crmTemplateSort">Display order</label>
                <input
                  id="crmTemplateSort"
                  type="number"
                  min={0}
                  max={9999}
                  value={templateSortOrder}
                  onChange={(e) => setTemplateSortOrder(Number(e.target.value) || 0)}
                />
              </div>
              <div className={styles.variableGuide}>
                <strong>Live variables</strong>
                <span>{"{{name}} {{order_number}} {{order_date}} {{order_status}} {{payment_status}} {{total}} {{items}} {{shipment_status}} {{shipment_updated_at}} {{courier}} {{awb}} {{tracking_url}} {{delivery_eta}} {{address}} {{invoice_url}} {{feedback_link}}"}</span>
              </div>
              <div className={styles.modalActions}>
                {templateId && (
                  <button type="button" className={styles.secondaryBtn} onClick={resetTemplateEditor}>
                    New template
                  </button>
                )}
                <button type="submit" className={styles.primaryBtn} disabled={templateSaving}>
                  {templateSaving ? "Saving…" : templateId ? "Update template" : "Add template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Start New Chat with any Phone Number */}
      {showNewChatModal && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewChatModal(false);
          }}
        >
          <div className={styles.modalCard} role="dialog" aria-modal="true">
            <header className={styles.modalHeader}>
              <h3>Message Customer on WhatsApp</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowNewChatModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </header>

            {newChatError && (
              <p className={styles.error} role="alert">
                {newChatError}
              </p>
            )}

            <form className={styles.modalForm} onSubmit={handleStartNewChat}>
              <div className={styles.field}>
                <label htmlFor="newPhone">Customer Phone Number *</label>
                <input
                  id="newPhone"
                  type="tel"
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Live Order Auto-Fetch Preview inside Modal */}
              {modalLookupOrders.length > 0 && (
                <div className={styles.modalLookupCard}>
                  <div className={styles.modalLookupHeader}>
                    <span>
                      <strong>📦 Linked Order:</strong> #{modalLookupOrders[0].orderNumber} (₹
                      {modalLookupOrders[0].totalRupees} · {modalLookupOrders[0].status})
                    </span>
                  </div>
                  <div className={styles.modalLookupChips}>
                    <button
                      type="button"
                      className={styles.modalLookupChip}
                      onClick={() =>
                        setNewMessage(
                          buildOrderSummaryMessage(
                            modalLookupOrders[0],
                            newName || modalLookupOrders[0].customerName || undefined
                          )
                        )
                      }
                    >
                      <Package size={12} /> + Order Details
                    </button>
                    <button
                      type="button"
                      className={styles.modalLookupChip}
                      onClick={() =>
                        setNewMessage(
                          buildTrackingMessage(
                            modalLookupOrders[0],
                            newName || modalLookupOrders[0].customerName || undefined
                          )
                        )
                      }
                    >
                      <Truck size={12} /> + Tracking
                    </button>
                    <button
                      type="button"
                      className={styles.modalLookupChip}
                      onClick={() =>
                        setNewMessage(
                          buildConfirmationMessage(
                            modalLookupOrders[0],
                            newName || modalLookupOrders[0].customerName || undefined
                          )
                        )
                      }
                    >
                      <CheckCheck size={12} /> + Confirmation
                    </button>
                    <button
                      type="button"
                      className={styles.modalLookupChip}
                      onClick={() =>
                        setNewMessage(
                          buildInvoiceMessage(
                            modalLookupOrders[0],
                            newName || modalLookupOrders[0].customerName || undefined
                          )
                        )
                      }
                    >
                      <FileText size={12} /> + Tax Invoice
                    </button>
                    <button
                      type="button"
                      className={styles.modalLookupChip}
                      disabled={newChatSubmitting}
                      onClick={() => {
                        setShowNewChatModal(false);
                        void resendOrderTemplate(modalLookupOrders[0].id);
                      }}
                    >
                      <Send size={12} /> Send Confirmation Template
                    </button>
                    <button
                      type="button"
                      className={styles.modalLookupChip}
                      disabled={newChatSubmitting}
                      onClick={() => {
                        setShowNewChatModal(false);
                        void sendOrderUpdateTemplate(modalLookupOrders[0].id);
                      }}
                    >
                      <Truck size={12} /> Send Order Update Template
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="newName">Customer Name (Optional)</label>
                <input
                  id="newName"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="newMessage">Message *</label>
                <textarea
                  id="newMessage"
                  rows={4}
                  placeholder="Write your message or select an order action above…"
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>

              <p className={styles.modalHint}>
                💡 <strong>Meta Cloud API:</strong> Free-form text is for an open customer-service window.
                If the customer has a linked Zucero order and the window is closed, use an approved
                template button above instead.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.headerBtn}
                  onClick={() => setShowNewChatModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={newChatSubmitting || !newPhone.trim() || !newMessage.trim()}
                >
                  {newChatSubmitting ? "Starting…" : "Start Chat & Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

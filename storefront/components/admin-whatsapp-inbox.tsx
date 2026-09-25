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
  Sparkles,
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

function buildOrderSummaryMessage(ord: CustomerOrder, name?: string) {
  const greeting = name ? `Hello ${name}` : "Hello";
  const statusLabel = ord.paymentStatus === "captured" || ord.status === "paid" ? "Paid" : (ord.status || "Confirmed");
  return `${greeting}, thank you for ordering with Zucero! 🍃

📦 Order Details: #${ord.orderNumber}
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

export function AdminWhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successNote, setSuccessNote] = useState("");

  // New Chat Modal state & Phone Lookup
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newChatSubmitting, setNewChatSubmitting] = useState(false);
  const [newChatError, setNewChatError] = useState("");
  const [modalLookupOrders, setModalLookupOrders] = useState<CustomerOrder[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const query = selectedId ? `?conversationId=${encodeURIComponent(selectedId)}` : "";
      const response = await fetch(`/api/admin/whatsapp${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load inbox");
      setConversations(data.conversations || []);
      setMessages(data.messages || []);
      setCustomerOrders(data.customerOrders || []);
      setSelectedOrderIndex(0);
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
      setError(err instanceof Error ? err.message : "Message could not be sent");
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
      setNewChatError(err instanceof Error ? err.message : "Failed to start conversation");
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
      setError(err instanceof Error ? err.message : "Could not resend order confirmation");
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

  const selected = conversations.find((item) => item.id === selectedId);
  const activeOrder = customerOrders[selectedOrderIndex] || customerOrders[0];

  function renderStatus(message: Message) {
    if (message.direction !== "outbound") return null;
    if (message.error_code || message.status === "failed") {
      return <span className={styles.statusFailed}>⚠️ Failed</span>;
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
          className={`${styles.chat} ${!selectedId ? styles.mobileHidden : ""}`}
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
                        <div className={styles.orderTabs}>
                          {customerOrders.map((ord, idx) => (
                            <button
                              key={ord.id}
                              type="button"
                              className={`${styles.orderTabBtn} ${selectedOrderIndex === idx ? styles.orderTabBtnActive : ""}`}
                              onClick={() => setSelectedOrderIndex(idx)}
                            >
                              #{ord.orderNumber}
                            </button>
                          ))}
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

                  {/* Send Options Toolbar */}
                  <div className={styles.orderActionRow}>
                    <span className={styles.orderActionLabel}>
                      <Sparkles size={12} /> Send Options:
                    </span>
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
                {QUICK_REPLIES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={styles.quickReplyChip}
                    onClick={() => setDraft(item.text)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Chat Composer */}
              <form className={styles.composer} onSubmit={send}>
                <input
                  ref={composerInputRef}
                  type="text"
                  placeholder="Type a message or select an order action above…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label="Message"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className={styles.sendBtn}
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>

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
              <h3>Start WhatsApp Chat</h3>
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
                💡 <strong>Note on Meta Policy</strong>: Free-form text messages are accepted if the
                customer has contacted you within 24 hours. For cold outreach on new orders, the
                official confirmation template is registered with Meta.
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

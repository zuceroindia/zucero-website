"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
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

type CustomerOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalPaise: number;
  trackingAwb?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  estimatedDeliveryWindow?: string | null;
  itemsSummary?: string;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successNote, setSuccessNote] = useState("");

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newChatSubmitting, setNewChatSubmitting] = useState(false);
  const [newChatError, setNewChatError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

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
      setSuccessNote("Order confirmation template sent successfully!");
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
        {/* Conversations Column */}
        <aside
          className={`${styles.conversations} ${selectedId ? styles.mobileHidden : ""}`}
          aria-label="WhatsApp conversations"
        >
          <div className={styles.searchBox}>
            <Search size={15} color="#8a6b2f" />
            <input
              type="search"
              placeholder="Search by name or number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.conversationsList}>
            {loading && conversations.length === 0 && (
              <p className={styles.empty}>Loading conversations…</p>
            )}

            {!loading && filteredConversations.length === 0 && (
              <div className={styles.empty}>
                <MessageCircle size={32} />
                <strong>{searchQuery ? "No matches found" : "No messages yet"}</strong>
                <span>
                  {searchQuery
                    ? "Try a different name or phone number."
                    : "Customer messages and automated order confirmations will appear here."}
                </span>
              </div>
            )}

            {filteredConversations.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.conversationItem} ${
                  item.id === selectedId ? styles.activeConversation : ""
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={styles.avatar}>
                  {(item.profile_name || item.wa_id).charAt(0).toUpperCase()}
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

              {/* Linked Customer Orders Strip */}
              {customerOrders.length > 0 && (
                <div className={styles.ordersStrip}>
                  <span className={styles.ordersStripLabel}>
                    <Package size={14} /> Linked Orders ({customerOrders.length}):
                  </span>
                  {customerOrders.map((ord) => (
                    <div key={ord.id} className={styles.orderPill}>
                      <strong>#{ord.orderNumber}</strong>
                      <span>₹{(ord.totalPaise / 100).toFixed(0)}</span>
                      <span className={styles.orderStatusBadge}>
                        {ord.status === "paid" ? "Paid" : ord.status}
                      </span>
                      <button
                        type="button"
                        className={styles.resendBtn}
                        onClick={() => resendOrderTemplate(ord.id)}
                        title="Resend official WhatsApp order confirmation template"
                      >
                        Resend Confirmation
                      </button>
                    </div>
                  ))}
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
                    {message.message_type === "template" && (
                      <span className={styles.templateTag}>Official Template</span>
                    )}
                    <p>{message.body}</p>
                    <footer className={styles.messageFooter}>
                      <time>{time(message.sent_at)}</time>
                      {renderStatus(message)}
                    </footer>
                  </article>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Quick Canned Replies Bar */}
              <div className={styles.quickReplies} aria-label="Quick reply options">
                <Sparkles size={13} color="#8a6b2f" />
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr.label}
                    type="button"
                    className={styles.quickReplyChip}
                    onClick={() => setDraft(qr.text)}
                  >
                    {qr.label}
                  </button>
                ))}
              </div>

              {/* Message Composer */}
              <form className={styles.composer} onSubmit={send}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 4096))}
                  placeholder="Type a WhatsApp reply…"
                  aria-label="Message"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(e);
                    }
                  }}
                />
                <button type="submit" disabled={sending || !draft.trim()}>
                  <Send size={16} />
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>

              <p className={styles.windowNote}>
                Free-form replies are accepted by Meta within the active customer care window. Order
                confirmations and utility templates can be sent anytime 24/7.
              </p>
            </>
          )}
        </section>
      </div>

      {/* --- New Chat Modal --- */}
      {showNewChatModal && (
        <div
          className={styles.modalOverlay}
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
                />
              </div>

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
                  rows={3}
                  placeholder="Write your message to the customer…"
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>

              <p className={styles.modalHint}>
                💡 <strong>Note on Meta Policy</strong>: Free-form text messages are accepted if the
                customer has contacted you within 24 hours. For automated order updates, official
                templates are dispatched automatically upon purchase.
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

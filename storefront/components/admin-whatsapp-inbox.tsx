"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
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

function time(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function phone(value: string) {
  return value.startsWith("91") && value.length === 12
    ? `+91 ${value.slice(2, 7)} ${value.slice(7)}`
    : `+${value}`;
}

export function AdminWhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    fetch("/api/admin/whatsapp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedId }),
    }).catch(() => {});
  }, [selectedId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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

  const selected = conversations.find(item => item.id === selectedId);

  return <section className={styles.shell}>
    <header className={styles.heading}>
      <div><p>Zucero customer care</p><h1>WhatsApp Inbox</h1></div>
      <button type="button" onClick={() => load()} aria-label="Refresh inbox"><RefreshCw size={18} /> Refresh</button>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.inbox}>
      <aside className={styles.conversations} aria-label="WhatsApp conversations">
        {loading && conversations.length === 0 && <p className={styles.empty}>Loading conversations…</p>}
        {!loading && conversations.length === 0 && <div className={styles.empty}><MessageCircle /><strong>No messages yet</strong><span>Customer messages will appear here after Meta delivers them to the webhook.</span></div>}
        {conversations.map(item => <button key={item.id} type="button" className={item.id === selectedId ? styles.activeConversation : ""} onClick={() => setSelectedId(item.id)}>
          <span className={styles.avatar}>{(item.profile_name || item.wa_id).charAt(0).toUpperCase()}</span>
          <span className={styles.conversationCopy}><strong>{item.profile_name || phone(item.wa_id)}</strong><small>{item.last_message_preview || "New conversation"}</small></span>
          <span className={styles.conversationMeta}><time>{time(item.last_message_at)}</time>{item.unread_count > 0 && <b>{item.unread_count}</b>}</span>
        </button>)}
      </aside>
      <section className={styles.chat} aria-label="Selected conversation">
        {!selected && <div className={styles.placeholder}><MessageCircle size={42} /><h2>Select a conversation</h2><p>Read incoming messages and respond through Zucero’s verified WhatsApp number.</p></div>}
        {selected && <>
          <header className={styles.chatHeader}><div><strong>{selected.profile_name || phone(selected.wa_id)}</strong><span>{phone(selected.wa_id)}</span></div></header>
          <div className={styles.messages} aria-live="polite">
            {messages.map(message => <article key={message.id} className={message.direction === "outbound" ? styles.outbound : styles.inbound}>
              <p>{message.body}</p>
              <footer><time>{time(message.sent_at)}</time>{message.direction === "outbound" && <span>{message.error_code ? "Failed" : message.status}</span>}</footer>
            </article>)}
            <div ref={bottomRef} />
          </div>
          <form className={styles.composer} onSubmit={send}>
            <textarea value={draft} onChange={event => setDraft(event.target.value.slice(0, 4096))} placeholder="Write a reply…" aria-label="Message" rows={2} />
            <button type="submit" disabled={sending || !draft.trim()}><Send size={18} />{sending ? "Sending…" : "Send"}</button>
          </form>
          <p className={styles.windowNote}>Free-form replies are accepted by Meta only within the active customer-service window. Outside it, send an approved template.</p>
        </>}
      </section>
    </div>
  </section>;
}

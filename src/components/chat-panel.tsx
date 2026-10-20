"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatNaira, formatTime } from "@/lib/money";
import type { AssistantSuggestion, Message } from "@/lib/types";

interface PanelProps {
  conversationId: string;
  vendor: { id: string; name: string; slug: string; emoji: string };
  initialMessages: Message[];
  viewerRole: "customer" | "vendor";
}

const ASSISTANT_PROMPTS = [
  "Make it three in total",
  "Add a drink",
  "Add one more",
];

export function ChatPanel({
  conversationId,
  vendor,
  initialMessages,
  viewerRole,
}: PanelProps) {
  const router = useRouter();
  const { cart, addItem } = useCart();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AssistantSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef(false);

  async function refresh() {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages as Message[]);
      }
    } catch {
      // polling is best-effort
    } finally {
      pollingRef.current = false;
    }
  }

  useEffect(() => {
    const interval = window.setInterval(refresh, 4000);
    return () => window.clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, suggestion]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "Message could not be sent.");
        return;
      }
      setDraft("");
      setMessages((current) => [...current, data.message as Message]);
    } catch {
      setError("Network error. Your message was not sent.");
    } finally {
      setSending(false);
    }
  }

  async function askAssistant(text: string) {
    const body = text.trim();
    if (!body || assistantLoading) return;
    setAssistantLoading(true);
    setError(null);
    try {
      const cartLines =
        cart?.vendor_id === vendor.id
          ? cart.items.map((item) => ({
              menu_item_id: item.menu_item_id,
              quantity: item.quantity,
            }))
          : [];
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "vendor_order",
          message: body,
          vendor_id: vendor.id,
          cart: cartLines,
          conversation_id: conversationId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "The assistant could not reply.");
        return;
      }
      setSuggestion(data.suggestion as AssistantSuggestion);
      setAssistantDraft("");
      await refresh();
    } catch {
      setError("Network error. Manual ordering still works.");
    } finally {
      setAssistantLoading(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    if (
      cart &&
      cart.items.length > 0 &&
      cart.vendor_id !== vendor.id &&
      !window.confirm(
        `Replace your cart from ${cart.vendor_name} with ${vendor.name}?`,
      )
    ) {
      return;
    }
    suggestion.items.forEach((item, index) => {
      addItem(
        {
          menu_item_id: item.menu_item_id,
          name: item.name ?? "Menu item",
          price_kobo: item.unit_price_kobo ?? 0,
          quantity: item.quantity,
        },
        { id: vendor.id, name: vendor.name, slug: vendor.slug },
        { replace: index === 0 },
      );
    });
    router.push("/checkout");
  }

  const suggestedSubtotal = suggestion
    ? suggestion.items.reduce(
        (sum, item) => sum + (item.unit_price_kobo ?? 0) * item.quantity,
        0,
      )
    : 0;

  return (
    <div className="card flex h-[calc(100dvh-15rem)] min-h-[28rem] flex-col overflow-hidden md:h-[calc(100dvh-13rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-xl">
            {vendor.emoji}
          </span>
          <div>
            <Link
              href={`/vendors/${vendor.slug}`}
              className="text-sm font-semibold hover:text-brand-700"
            >
              {vendor.name}
            </Link>
            <p className="text-[11px] text-muted">
              {viewerRole === "vendor"
                ? "Customer conversation"
                : "In-app chat · vendor replies appear here"}
            </p>
          </div>
        </div>
        <span className="badge bg-leaf-50 text-leaf-700">Live · polling</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-cream/40 px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-line bg-paper px-4 py-6 text-center text-sm text-muted">
            No messages yet. Say hello or ask the assistant to build your order.
          </div>
        )}
        {messages.map((message) => {
          const own =
            (viewerRole === "customer" && message.author_kind === "customer") ||
            (viewerRole === "vendor" && message.author_kind === "vendor");
          const assistant = message.author_kind === "assistant";
          return (
            <div
              key={message.id}
              className={`flex ${own ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  assistant
                    ? "border border-brand-200 bg-brand-50 text-ink"
                    : own
                      ? "bg-brand-600 text-white"
                      : "border border-line bg-white text-ink"
                }`}
              >
                {assistant && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                    OrderDesk assistant
                  </p>
                )}
                {!assistant && !own && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {message.author_kind === "vendor" ? vendor.name : "Customer"}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    own ? "text-white/70" : "text-muted"
                  }`}
                >
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        {suggestion && (
          <div className="rounded-2xl border border-brand-200 bg-paper p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Assistant draft · review before applying
              </p>
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="text-xs text-muted hover:text-ink"
              >
                Dismiss
              </button>
            </div>
            {suggestion.items.length > 0 ? (
              <>
                <ul className="mt-2 space-y-1 text-sm">
                  {suggestion.items.map((item) => (
                    <li key={item.menu_item_id} className="flex justify-between gap-2">
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="text-xs text-muted">
                        {formatNaira((item.unit_price_kobo ?? 0) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  Estimated subtotal {formatNaira(suggestedSubtotal)} · delivery
                  is added at quote time.
                </p>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="btn-primary btn-sm mt-2 w-full"
                >
                  Apply to cart & review
                </button>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted">
                No cart change was proposed. Ask again or add items manually.
              </p>
            )}
            {suggestion.clarifications.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {suggestion.clarifications.map((clarification) => (
                  <li key={clarification}>• {clarification}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      {viewerRole === "customer" && (
        <div className="border-t border-line bg-paper px-4 pt-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void askAssistant(assistantDraft);
            }}
            className="flex gap-2"
          >
            <label htmlFor="assistant-chat" className="sr-only">
              Ask the assistant to change your order
            </label>
            <input
              id="assistant-chat"
              value={assistantDraft}
              onChange={(event) => setAssistantDraft(event.target.value)}
              placeholder="Ask the assistant: “make it three in total”"
              className="field flex-1"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={assistantLoading}
              className="btn-secondary btn-sm shrink-0"
            >
              {assistantLoading ? "Thinking…" : "Ask AI"}
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ASSISTANT_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setAssistantDraft(prompt);
                  void askAssistant(prompt);
                }}
                className="chip"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-line bg-paper px-4 py-3"
      >
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          maxLength={2000}
          placeholder={`Message ${viewerRole === "vendor" ? "customer" : vendor.name}`}
          className="field max-h-28 min-h-11 flex-1 resize-y py-2.5"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="btn-primary shrink-0"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

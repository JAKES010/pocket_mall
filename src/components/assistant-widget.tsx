"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatNaira } from "@/lib/money";
import type { AssistantDiscoveryOption, AssistantSuggestion } from "@/lib/types";

const QUICK_PROMPTS = [
  "Rice and chicken for two people, under ₦6,000 including delivery",
  "Suya and a drink under ₦5,000",
  "Burger and fries for one",
  "Pounded yam and egusi with delivery",
];

export function AssistantWidget() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AssistantSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { cart, addItem } = useCart();

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "discovery", message: trimmed }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setError("Sign in to use the assistant. You can still browse and order manually.");
        return;
      }
      if (!response.ok) {
        setError(data?.error?.message ?? "The assistant could not help right now.");
        return;
      }
      setSuggestion(data.suggestion as AssistantSuggestion);
    } catch {
      setError("Network error. You can still browse vendors manually.");
    } finally {
      setLoading(false);
    }
  }

  function useOption(option: AssistantDiscoveryOption) {
    const vendor = {
      id: option.vendor_id,
      name: option.vendor_name,
      slug: option.vendor_slug,
    };
    if (
      cart &&
      cart.items.length > 0 &&
      !window.confirm(
        `Replace your cart${cart.vendor_name ? ` from ${cart.vendor_name}` : ""} with this suggestion?`,
      )
    ) {
      return;
    }
    option.items.forEach((item, index) => {
      addItem(
        {
          menu_item_id: item.menu_item_id,
          name: item.name,
          price_kobo: item.unit_price_kobo,
          quantity: item.quantity,
        },
        vendor,
        { replace: index === 0 },
      );
    });
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line bg-gradient-to-br from-brand-50 via-paper to-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-brand-600 text-white">AI assistant</span>
          <span className="text-xs font-semibold text-muted">
            Finds real menu items within your budget
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold sm:text-[28px]">
          What are you hungry for?
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Describe the food, the number of people and a budget. OrderDesk prices
          every option with the vendor&apos;s real menu — the model never sets
          prices or takes payment.
        </p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(message);
          }}
        >
          <label htmlFor="assistant-input" className="sr-only">
            Describe what you want to eat
          </label>
          <input
            id="assistant-input"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={500}
            placeholder="e.g. Rice and chicken for two, under ₦6,000 including delivery"
            className="field flex-1"
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Finding options…" : "Find my food"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setMessage(prompt);
                void ask(prompt);
              }}
              className="chip max-w-full truncate"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {!suggestion && !loading && !error && (
          <p className="text-sm text-muted">
            The assistant works from published Otukpo storefronts. Manual
            browsing and ordering always remain available.
          </p>
        )}
        {loading && (
          <div className="space-y-3" aria-live="polite">
            <div className="h-4 w-3/4 animate-pulse rounded bg-brand-100" />
            <div className="h-20 animate-pulse rounded-xl bg-brand-50" />
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {suggestion && (
          <div aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="max-w-2xl text-sm leading-relaxed text-ink">
                {suggestion.message}
              </p>
              <span className="badge bg-brand-50 text-brand-700">
                {suggestion.source === "model" ? "Model-assisted" : "Local assistant"}
              </span>
            </div>
            {suggestion.clarifications.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted">
                {suggestion.clarifications.map((clarification) => (
                  <li key={clarification} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    {clarification}
                  </li>
                ))}
              </ul>
            )}
            {suggestion.options && suggestion.options.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {suggestion.options.map((option) => (
                  <article
                    key={`${option.vendor_id}-${option.items
                      .map((item) => `${item.menu_item_id}x${item.quantity}`)
                      .join("-")}`}
                    className="rounded-2xl border border-line bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/vendors/${option.vendor_slug}`}
                          className="font-semibold hover:text-brand-700"
                        >
                          {option.vendor_name}
                        </Link>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          {option.delivery_kobo > 0
                            ? option.zone_name ?? "Delivery"
                            : "Pickup · no delivery fee"}
                        </p>
                      </div>
                      {option.note && (
                        <span className="badge bg-amber-100 text-amber-800">
                          {option.note}
                        </span>
                      )}
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {option.items.map((item) => (
                        <li
                          key={item.menu_item_id}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <span>
                            <span className="font-semibold">{item.quantity}×</span>{" "}
                            {item.name}
                          </span>
                          <span className="whitespace-nowrap text-xs text-muted">
                            {formatNaira(item.unit_price_kobo * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <dl className="mt-3 space-y-1 border-t border-dashed border-line pt-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted">Subtotal</dt>
                        <dd>{formatNaira(option.subtotal_kobo)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Delivery</dt>
                        <dd>
                          {option.delivery_kobo > 0
                            ? formatNaira(option.delivery_kobo)
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between pt-1 text-sm font-bold">
                        <dt>Total</dt>
                        <dd>{formatNaira(option.total_kobo)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => useOption(option)}
                        className="btn-primary btn-sm flex-1"
                      >
                        Use this cart
                      </button>
                      <Link
                        href={`/vendors/${option.vendor_slug}`}
                        className="btn-secondary btn-sm"
                      >
                        View store
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

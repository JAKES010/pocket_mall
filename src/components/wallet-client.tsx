"use client";

import { useRef, useState } from "react";
import { formatNaira, formatDateTime, parseNairaToKobo } from "@/lib/money";
import type { LedgerEntryWithTransaction } from "@/lib/types";

const KIND_LABELS: Record<string, string> = {
  demo_top_up: "Test top-up",
  seed_topup: "Opening demo balance",
  order_hold: "Order payment held",
  order_refund: "Refund to wallet",
  order_settlement: "Settlement to vendor",
};

const QUICK_AMOUNTS = [1000, 2000, 5000];

export function WalletClient({
  initialBalanceKobo,
  initialEntries,
  limitKobo,
}: {
  initialBalanceKobo: number;
  initialEntries: LedgerEntryWithTransaction[];
  limitKobo: number;
}) {
  const [balanceKobo, setBalanceKobo] = useState(initialBalanceKobo);
  const [entries, setEntries] = useState(initialEntries);
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingKey = useRef<{ amountKobo: number; key: string } | null>(null);

  async function topUp(amountKobo: number) {
    if (loading) return;
    if (
      !Number.isInteger(amountKobo) ||
      amountKobo < 10_000 ||
      amountKobo > limitKobo
    ) {
      setError(
        `Test top-ups must be between ${formatNaira(10_000)} and ${formatNaira(limitKobo)}.`,
      );
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);

    if (pendingKey.current?.amountKobo !== amountKobo) {
      pendingKey.current = { amountKobo, key: crypto.randomUUID() };
    }

    try {
      const response = await fetch("/api/wallet/demo-top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_kobo: amountKobo,
          idempotency_key: pendingKey.current.key,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "Test funds could not be added.");
        return;
      }
      pendingKey.current = null;
      setBalanceKobo(data.balance_kobo as number);
      setEntries(data.entries as LedgerEntryWithTransaction[]);
      setNotice(`${formatNaira(amountKobo)} in test funds added to your demo wallet.`);
    } catch {
      setError(
        "Network error. If you retry the same amount, the same safe top-up request is reused.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const kobo = parseNairaToKobo(amount);
    if (kobo === null) {
      setError("Enter an amount in naira, e.g. 1500 or 1500.50.");
      return;
    }
    void topUp(kobo);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                Demo wallet · NGN
              </p>
              <span className="badge bg-white/15 text-white">Simulated</span>
            </div>
            <p className="mt-3 text-4xl font-semibold tracking-tight">
              {formatNaira(balanceKobo)}
            </p>
            <p className="mt-1 text-xs text-white/75">
              Test money for the OrderDesk prototype. Not withdrawable, not real.
            </p>
          </div>
          <div className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              Add test funds
            </h2>
            <form onSubmit={submit} className="mt-2 space-y-3">
              <div>
                <label htmlFor="top-up-amount" className="label">
                  Amount (₦)
                </label>
                <input
                  id="top-up-amount"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    pendingKey.current = null;
                  }}
                  inputMode="decimal"
                  placeholder="1000"
                  className="field"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AMOUNTS.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      setAmount(String(quick));
                      pendingKey.current = null;
                      void topUp(quick * 100);
                    }}
                    disabled={loading}
                    className="chip"
                  >
                    + {formatNaira(quick * 100)}
                  </button>
                ))}
              </div>
              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-xl border border-leaf-200 bg-leaf-50 px-3 py-2 text-xs text-leaf-700">
                  {notice}
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Adding test funds…" : "Add test funds"}
              </button>
              <p className="text-[11px] leading-relaxed text-muted">
                Between {formatNaira(10_000)} and {formatNaira(limitKobo)} per
                top-up. Each request carries an idempotency key so retries cannot
                double-credit the wallet.
              </p>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper/70 p-4 text-xs leading-relaxed text-muted">
          <p>
            <strong className="text-ink">How the demo ledger works.</strong> Every
            movement is a balanced double-entry transaction. When you pay, funds
            move from your wallet into a clearing account. On completion they
            settle to the vendor&apos;s payable account; on cancel or rejection they
            are refunded to you.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">Wallet activity</h2>
          <span className="badge bg-paper text-muted ring-1 ring-line">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </span>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No wallet activity yet. Add test funds to start.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((entry) => {
              const positive = entry.amount_kobo >= 0;
              return (
                <li
                  key={entry.entry_id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full text-sm ${
                      positive
                        ? "bg-leaf-50 text-leaf-700"
                        : "bg-brand-50 text-brand-700"
                    }`}
                    aria-hidden="true"
                  >
                    {positive ? "↓" : "↑"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {KIND_LABELS[entry.kind] ?? entry.kind.replaceAll("_", " ")}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {entry.note ?? "Wallet movement"} ·{" "}
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      positive ? "text-leaf-700" : "text-ink"
                    }`}
                  >
                    {positive ? "+" : "−"}
                    {formatNaira(Math.abs(entry.amount_kobo))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { EmptyState } from "@/components/ui";
import { formatNaira, formatTime } from "@/lib/money";
import type { DeliveryZone, Quote, QuoteItem } from "@/lib/types";

interface QuoteResponse {
  quote: Quote;
  items: QuoteItem[];
  vendor: { id: string; name: string; slug: string; address: string };
}

interface ApiErrorShape {
  code?: string;
  message?: string;
  details?: {
    balance_kobo?: number;
    total_kobo?: number;
    shortfall_kobo?: number;
  };
}

const TOP_UP_OPTIONS = [100_000, 200_000, 500_000];

export function CheckoutClient({ initialPhone }: { initialPhone: string }) {
  const router = useRouter();
  const {
    cart,
    ready,
    setQuantity,
    removeItem,
    clearCart,
    subtotalKobo,
  } = useCart();

  const [zones, setZones] = useState<DeliveryZone[] | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("delivery");
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(initialPhone);

  const [balanceKobo, setBalanceKobo] = useState<number | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<
    ApiErrorShape["details"] | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const idempotencyRef = useRef<string | null>(null);

  const vendorId = cart?.vendor_id;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallet")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setBalanceKobo(data.balance_kobo as number);
      })
      .catch(() => {
        // balance is shown on the wallet page; checkout still works
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    setZones(null);
    setZonesError(null);
    setZoneId("");
    setFulfilment("delivery");
    fetch(`/api/vendors/${encodeURIComponent(vendorId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message ?? "Storefront could not be loaded.");
        }
        return data.vendor as { zones: DeliveryZone[] };
      })
      .then((vendor) => {
        if (cancelled) return;
        setZones(vendor.zones);
        if (vendor.zones.length > 0) {
          setZoneId((current) => current || vendor.zones[0].id);
        } else {
          setFulfilment("pickup");
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) setZonesError(loadError.message);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  function readError(data: unknown): ApiErrorShape {
    const body = data as { error?: ApiErrorShape };
    return body?.error ?? {};
  }

  function invalidateQuote() {
    setQuote(null);
    idempotencyRef.current = null;
  }

  function changeQuantity(menuItemId: string, quantity: number) {
    invalidateQuote();
    setError(null);
    setErrorCode(null);
    setQuantity(menuItemId, quantity);
  }

  function removeLine(menuItemId: string) {
    invalidateQuote();
    setError(null);
    setErrorCode(null);
    removeItem(menuItemId);
  }

  async function getQuote() {
    if (!cart) return;
    setError(null);
    setErrorCode(null);
    setErrorDetails(null);
    setNotice(null);

    if (phone.trim().length < 7) {
      setError("Enter a phone number the vendor can reach you on.");
      return;
    }
    if (fulfilment === "delivery") {
      if (zones && zones.length === 0) {
        setError("This vendor has no delivery zones, so only pickup is available.");
        return;
      }
      if (!zoneId) {
        setError("Choose a delivery zone.");
        return;
      }
      if (address.trim().length < 5) {
        setError("Enter a delivery address so the rider can find you.");
        return;
      }
    }

    setQuoteLoading(true);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: cart.vendor_id,
          fulfilment,
          zone_id: fulfilment === "delivery" ? zoneId : null,
          delivery_address: fulfilment === "delivery" ? address.trim() : undefined,
          contact_phone: phone.trim(),
          items: cart.items.map((item) => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const info = readError(data);
        setError(info.message ?? "A quote could not be created. Try again.");
        setErrorCode(info.code ?? null);
        return;
      }
      setQuote(data as QuoteResponse);
      idempotencyRef.current = crypto.randomUUID();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function pay() {
    if (!quote || paying) return;
    if (!idempotencyRef.current) {
      idempotencyRef.current = crypto.randomUUID();
    }
    setPaying(true);
    setError(null);
    setErrorCode(null);
    setErrorDetails(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quote.quote.id,
          idempotency_key: idempotencyRef.current,
          confirm: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const info = readError(data);
        setError(info.message ?? "The order could not be placed.");
        setErrorCode(info.code ?? null);
        setErrorDetails(info.details ?? null);
        if (
          info.code === "QUOTE_EXPIRED" ||
          info.code === "QUOTE_STALE" ||
          info.code === "QUOTE_ALREADY_USED"
        ) {
          invalidateQuote();
        }
        return;
      }
      setPlaced(true);
      clearCart();
      router.push(`/orders/${data.order.id as string}`);
    } catch {
      setError("Network error. Your demo payment may not have completed — check your orders.");
    } finally {
      setPaying(false);
    }
  }

  async function addFunds(amountKobo: number) {
    setTopUpLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const response = await fetch("/api/wallet/demo-top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_kobo: amountKobo,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(readError(data).message ?? "Test funds could not be added.");
        return;
      }
      setBalanceKobo(data.balance_kobo as number);
      setError(null);
      setErrorCode(null);
      setErrorDetails(null);
      setNotice(
        `${formatNaira(amountKobo)} in test funds added. You can pay now.`,
      );
    } catch {
      setError("Network error while adding test funds.");
    } finally {
      setTopUpLoading(false);
    }
  }

  if (!ready) {
    return <div className="card p-8 text-center text-sm text-muted">Loading cart…</div>;
  }

  if (placed) {
    return (
      <div className="card p-10 text-center">
        <p className="text-3xl">✅</p>
        <h2 className="mt-2 text-2xl font-semibold">Demo payment approved</h2>
        <p className="mt-1 text-sm text-muted">Opening your order…</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Your cart is empty"
        href="/"
        action="Browse kitchens"
      >
        Add something from a storefront, then come back to review a
        server-priced quote.
      </EmptyState>
    );
  }

  const zone = zones?.find((entry) => entry.id === zoneId) ?? null;
  const shortfall =
    quote && balanceKobo !== null
      ? Math.max(0, quote.quote.total_kobo - balanceKobo)
      : errorCode === "INSUFFICIENT_BALANCE" && errorDetails?.shortfall_kobo
        ? errorDetails.shortfall_kobo
        : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Cart from {cart.vendor_name}
            </h2>
            <Link
              href={`/vendors/${cart.vendor_slug}`}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Add more
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {cart.items.map((item) => (
              <li key={item.menu_item_id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    {formatNaira(item.price_kobo)} each
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.menu_item_id, item.quantity - 1)}
                    className="size-8 rounded-lg border border-line bg-white text-sm font-bold hover:border-brand-300"
                    aria-label={`Reduce ${item.name}`}
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.menu_item_id, item.quantity + 1)}
                    disabled={item.quantity >= 20}
                    className="size-8 rounded-lg border border-line bg-white text-sm font-bold hover:border-brand-300 disabled:opacity-40"
                    aria-label={`Add another ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <span className="w-20 text-right text-sm font-semibold">
                  {formatNaira(item.price_kobo * item.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(item.menu_item_id)}
                  className="text-xs text-muted hover:text-rose-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {!quote ? (
          <div className="card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Delivery & contact</h2>
            <p className="mt-1 text-xs text-muted">
              These details, the menu prices and the delivery fee are locked into
              a server-issued quote valid for 30 minutes.
            </p>

            <div className="mt-4 grid gap-4">
              <div>
                <span className="label">How do you want it?</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["delivery", "pickup"] as const).map((option) => {
                    const disabled = option === "delivery" && zones !== null && zones.length === 0;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setFulfilment(option);
                          setError(null);
                          setErrorCode(null);
                        }}
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          fulfilment === option
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                            : "border-line bg-white hover:border-brand-300"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <span className="block text-sm font-semibold capitalize">
                          {option}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {option === "delivery"
                            ? disabled
                              ? "Not offered here"
                              : "Vendor delivers to your zone"
                            : "Free · collect at the store"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {fulfilment === "delivery" && (
                <>
                  <div>
                    <label htmlFor="zone" className="label">
                      Delivery zone
                    </label>
                    {zones === null ? (
                      <div className="field text-muted">Loading zones…</div>
                    ) : zones.length === 0 ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        This vendor has not configured delivery zones. Choose
                        pickup instead.
                      </p>
                    ) : (
                      <select
                        id="zone"
                        value={zoneId}
                        onChange={(event) => {
                          setZoneId(event.target.value);
                          setError(null);
                          setErrorCode(null);
                        }}
                        className="field"
                      >
                        {zones.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} · {formatNaira(entry.fee_kobo)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label htmlFor="address" className="label">
                      Delivery address
                    </label>
                    <input
                      id="address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="e.g. Hostel B, Room 14, Otukpo"
                      className="field"
                      maxLength={300}
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="contact-phone" className="label">
                  Contact phone
                </label>
                <input
                  id="contact-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0803 000 0000"
                  className="field"
                  maxLength={20}
                />
              </div>

              {zonesError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {zonesError}
                </p>
              )}

              <button
                type="button"
                onClick={() => void getQuote()}
                disabled={
                  quoteLoading ||
                  (fulfilment === "delivery" && zones === null)
                }
                className="btn-primary w-full"
              >
                {quoteLoading ? "Pricing your order…" : "Get server quote"}
              </button>
              <p className="text-center text-[11px] text-muted">
                Subtotal {formatNaira(subtotalKobo)} before delivery. The server
                recalculates every line before payment.
              </p>
            </div>
          </div>
        ) : (
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Quote locked</h2>
              <span className="badge bg-leaf-50 text-leaf-700">
                Valid until {formatTime(quote.quote.expires_at)}
              </span>
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-cream/50 px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-muted">
                  Fulfilment
                </dt>
                <dd className="font-semibold capitalize">
                  {quote.quote.fulfilment}
                  {quote.quote.zone_name ? ` · ${quote.quote.zone_name}` : ""}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-cream/50 px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-muted">
                  Contact
                </dt>
                <dd className="font-semibold">{quote.quote.contact_phone}</dd>
              </div>
              {quote.quote.delivery_address && (
                <div className="rounded-xl border border-line bg-cream/50 px-3 py-2 sm:col-span-2">
                  <dt className="text-[11px] uppercase tracking-wide text-muted">
                    Deliver to
                  </dt>
                  <dd className="font-semibold">{quote.quote.delivery_address}</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              onClick={() => {
                invalidateQuote();
                setError(null);
                setErrorCode(null);
                setErrorDetails(null);
              }}
              className="btn-ghost btn-sm mt-3 -ml-2"
            >
              ← Change details
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">{error}</p>
            <p className="mt-1 text-xs">
              Nothing was charged. No order was placed
              {errorCode ? ` (${errorCode})` : ""}.
            </p>
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Order summary</h2>
          {quote ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {quote.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.quantity}× {item.name_snapshot}
                  </span>
                  <span className="text-muted">
                    {formatNaira(item.unit_price_kobo * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {cart.items.length} line{cart.items.length === 1 ? "" : "s"} ·{" "}
              {formatNaira(subtotalKobo)} subtotal. Get a quote to see delivery.
            </p>
          )}

          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatNaira(quote ? quote.quote.subtotal_kobo : subtotalKobo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                Delivery{zone ? ` · ${zone.name}` : ""}
              </dt>
              <dd>
                {quote
                  ? formatNaira(quote.quote.delivery_kobo)
                  : fulfilment === "delivery" && zone
                    ? `≈ ${formatNaira(zone.fee_kobo)}`
                    : "₦0"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>
                {quote
                  ? formatNaira(quote.quote.total_kobo)
                  : formatNaira(
                      subtotalKobo +
                        (fulfilment === "delivery" && zone ? zone.fee_kobo : 0),
                    )}
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-line bg-paper px-3 py-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Demo wallet</span>
              <span className="font-semibold">
                {balanceKobo === null ? "—" : formatNaira(balanceKobo)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted">
              <span>Test funds only</span>
              <Link href="/wallet" className="font-semibold text-brand-700 hover:underline">
                Top up
              </Link>
            </div>
          </div>

          {shortfall > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">
                Short by {formatNaira(shortfall)}. Add test funds to continue.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOP_UP_OPTIONS.filter((amount) => amount >= shortfall)
                  .slice(0, 2)
                  .map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => void addFunds(amount)}
                      disabled={topUpLoading}
                      className="btn-secondary btn-sm"
                    >
                      + {formatNaira(amount)}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => void addFunds(Math.max(100_000, Math.ceil(shortfall / 10_000) * 10_000))}
                  disabled={topUpLoading}
                  className="btn-secondary btn-sm"
                >
                  {topUpLoading ? "Adding…" : "Add exact top-up"}
                </button>
              </div>
            </div>
          )}

          {notice && (
            <p className="mt-3 rounded-xl border border-leaf-200 bg-leaf-50 px-3 py-2 text-xs text-leaf-700">
              {notice}
            </p>
          )}

          <button
            type="button"
            onClick={() => void pay()}
            disabled={!quote || paying || quoteLoading}
            className="btn-primary mt-4 w-full"
          >
            {paying
              ? "Holding demo funds…"
              : quote
                ? `Pay ${formatNaira(quote.quote.total_kobo)} (demo)`
                : "Get a quote to pay"}
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
            Paying moves test funds from your demo wallet into escrow. The vendor
            is paid only when the order is completed. Cancellations and
            rejections refund automatically.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-paper/60 px-4 py-3 text-[11px] leading-relaxed text-muted">
          <strong className="text-ink">No real payment.</strong> OrderDesk is a
          prototype. The wallet ledger is simulated and no money leaves your
          account.
        </div>
      </aside>
    </div>
  );
}

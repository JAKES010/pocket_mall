"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { vendorActions } from "@/lib/format";
import type { Fulfilment, OrderStatus } from "@/lib/types";

interface ApiErrorBody {
  error?: { message?: string };
}

async function postAction(
  orderId: string,
  action: string,
  reason?: string,
): Promise<string | null> {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
  if (response.ok) return null;
  const data = (await response.json()) as ApiErrorBody;
  return data?.error?.message ?? "The order could not be updated.";
}

export function OrderActions({
  orderId,
  status,
  fulfilment,
}: {
  orderId: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const actions = vendorActions(status, fulfilment);

  async function run(action: string, withReason?: string) {
    setBusy(action);
    setError(null);
    const message = await postAction(orderId, action, withReason);
    if (message) {
      setError(message);
      setBusy(null);
      return;
    }
    setRejecting(false);
    setReason("");
    setBusy(null);
    router.refresh();
  }

  if (actions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
        Vendor actions
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.action}
            type="button"
            disabled={busy !== null}
            onClick={() => {
              if (action.action === "reject") {
                setRejecting(true);
                setError(null);
                return;
              }
              void run(action.action);
            }}
            className={
              action.tone === "primary"
                ? "btn-primary btn-sm"
                : action.tone === "danger"
                  ? "btn-secondary btn-sm text-rose-700"
                  : "btn-secondary btn-sm"
            }
          >
            {busy === action.action ? "Working…" : action.label}
          </button>
        ))}
      </div>

      {rejecting && (
        <div className="mt-3 rounded-xl border border-line bg-white p-3">
          <label htmlFor="reject-reason" className="label">
            Reason shown to the customer
          </label>
          <input
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Kitchen closed early — sorry!"
            className="field"
            maxLength={300}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy !== null || reason.trim().length < 2}
              onClick={() => void run("reject", reason.trim())}
              className="btn-primary btn-sm bg-rose-700 hover:bg-rose-800"
            >
              {busy === "reject" ? "Rejecting…" : "Reject & refund"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
              className="btn-ghost btn-sm"
            >
              Keep order
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-800">{error}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Accepted orders hold the customer&apos;s demo funds in escrow. Completing
        the order settles them to your payable balance; rejecting refunds them.
      </p>
    </div>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("Cancel this order? Your demo payment is refunded.")) {
      return;
    }
    setBusy(true);
    setError(null);
    const message = await postAction(orderId, "cancel", "Cancelled by customer");
    if (message) {
      setError(message);
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void cancel()}
        disabled={busy}
        className="btn-secondary btn-sm text-rose-700"
      >
        {busy ? "Cancelling…" : "Cancel order"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-800">{error}</p>}
    </div>
  );
}

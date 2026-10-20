"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptingToggle({
  vendorId,
  accepting,
}: {
  vendorId: string;
  accepting: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepting_orders: !accepting }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data?.error?.message ?? "Could not update availability.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Storefront availability unchanged.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={accepting}
        aria-label="Accepting orders"
        onClick={() => void toggle()}
        disabled={busy}
        className={`relative h-7 w-12 rounded-full transition ${
          accepting ? "bg-leaf-600" : "bg-stone-300"
        } disabled:opacity-60`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${
            accepting ? "left-[1.4rem]" : "left-0.5"
          }`}
        />
      </button>
      <div>
        <p className="text-xs font-semibold">
          {accepting ? "Accepting orders" : "Paused"}
        </p>
        {error && <p className="text-[11px] text-rose-700">{error}</p>}
      </div>
    </div>
  );
}

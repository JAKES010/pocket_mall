"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatNaira } from "@/lib/money";

export function CartBar() {
  const { cart, count, subtotalKobo, clearCart, ready } = useCart();
  if (!ready || !cart || cart.items.length === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-30 md:inset-x-auto md:bottom-6 md:right-6 md:w-80">
      <div className="card flex items-center gap-3 border-brand-200 bg-paper/95 p-3 shadow-lg backdrop-blur">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-lg">
          🛒
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted">
            {cart.vendor_name}
          </p>
          <p className="text-sm font-bold">
            {count} item{count === 1 ? "" : "s"} · {formatNaira(subtotalKobo)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Clear this cart?")) clearCart();
          }}
          className="btn-ghost btn-sm"
          aria-label="Clear cart"
        >
          Clear
        </button>
        <Link href="/checkout" className="btn-primary btn-sm">
          Review
        </Link>
      </div>
    </div>
  );
}

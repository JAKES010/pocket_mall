"use client";

import { useCart } from "@/components/cart-provider";
import { formatNaira } from "@/lib/money";

interface Item {
  id: string;
  name: string;
  price_kobo: number;
  image_url: string | null;
  available: number;
}

export function AddToCartButton({
  item,
  vendor,
  paused = false,
}: {
  item: Item;
  vendor: { id: string; name: string; slug: string };
  paused?: boolean;
}) {
  const { cart, addItem, setQuantity } = useCart();
  const line =
    cart?.vendor_id === vendor.id
      ? cart.items.find((entry) => entry.menu_item_id === item.id)
      : undefined;

  function add() {
    if (cart && cart.vendor_id !== vendor.id && cart.items.length > 0) {
      const confirmed = window.confirm(
        `Your cart has items from ${cart.vendor_name}. Replace it with items from ${vendor.name}?`,
      );
      if (!confirmed) return;
      addItem(
        {
          menu_item_id: item.id,
          name: item.name,
          price_kobo: item.price_kobo,
          image_url: item.image_url,
        },
        vendor,
        { replace: true },
      );
      return;
    }
    addItem(
      {
        menu_item_id: item.id,
        name: item.name,
        price_kobo: item.price_kobo,
        image_url: item.image_url,
      },
      vendor,
    );
  }

  if (!item.available) {
    return (
      <span className="badge bg-stone-200 text-stone-600">Out of stock</span>
    );
  }

  if (line) {
    return (
      <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1">
        <button
          type="button"
          onClick={() => setQuantity(item.id, line.quantity - 1)}
          className="grid size-7 place-items-center rounded-full text-lg leading-none text-muted hover:bg-brand-50 hover:text-ink"
          aria-label={`Remove one ${item.name}`}
        >
          −
        </button>
        <span className="min-w-6 text-center text-sm font-bold">
          {line.quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity(item.id, line.quantity + 1)}
          disabled={line.quantity >= 20}
          className="grid size-7 place-items-center rounded-full text-lg leading-none text-muted hover:bg-brand-50 hover:text-ink disabled:opacity-40"
          aria-label={`Add one ${item.name}`}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={paused}
      className="btn-secondary btn-sm"
    >
      {paused ? "Paused" : `Add · ${formatNaira(item.price_kobo)}`}
    </button>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface CartItem {
  menu_item_id: string;
  name: string;
  price_kobo: number;
  quantity: number;
  image_url?: string | null;
  available?: boolean;
}

export interface CartState {
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  items: CartItem[];
}

interface CartContextValue {
  cart: CartState | null;
  ready: boolean;
  count: number;
  subtotalKobo: number;
  addItem: (
    item: Omit<CartItem, "quantity"> & { quantity?: number },
    vendor: { id: string; name: string; slug: string },
    options?: { replace?: boolean },
  ) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "orderdesk_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed && parsed.vendor_id && Array.isArray(parsed.items)) {
          setCart(parsed);
        }
      }
    } catch {
      // ignore corrupt cart state
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (cart && cart.items.length > 0) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // storage may be unavailable in private mode
    }
  }, [cart, ready]);

  const addItem = useCallback<CartContextValue["addItem"]>(
    (item, vendor, options) => {
      setCart((current) => {
        const replace =
          options?.replace ||
          !current ||
          current.vendor_id !== vendor.id ||
          current.items.length === 0;
        const base: CartState = replace
          ? {
              vendor_id: vendor.id,
              vendor_name: vendor.name,
              vendor_slug: vendor.slug,
              items: [],
            }
          : current!;
        const existing = base.items.find(
          (line) => line.menu_item_id === item.menu_item_id,
        );
        const items = existing
          ? base.items.map((line) =>
              line.menu_item_id === item.menu_item_id
                ? {
                    ...line,
                    quantity: Math.min(
                      20,
                      line.quantity + (item.quantity ?? 1),
                    ),
                  }
                : line,
            )
          : [
              ...base.items,
              { ...item, quantity: Math.min(20, item.quantity ?? 1) },
            ];
        return { ...base, items };
      });
    },
    [],
  );

  const setQuantity = useCallback((menuItemId: string, quantity: number) => {
    setCart((current) => {
      if (!current) return current;
      if (quantity <= 0) {
        const items = current.items.filter(
          (line) => line.menu_item_id !== menuItemId,
        );
        return items.length > 0 ? { ...current, items } : null;
      }
      return {
        ...current,
        items: current.items.map((line) =>
          line.menu_item_id === menuItemId
            ? { ...line, quantity: Math.min(20, quantity) }
            : line,
        ),
      };
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCart((current) => {
      if (!current) return current;
      const items = current.items.filter(
        (line) => line.menu_item_id !== menuItemId,
      );
      return items.length > 0 ? { ...current, items } : null;
    });
  }, []);

  const clearCart = useCallback(() => setCart(null), []);

  const value = useMemo<CartContextValue>(() => {
    const count =
      cart?.items.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
    const subtotalKobo =
      cart?.items.reduce(
        (sum, line) => sum + line.price_kobo * line.quantity,
        0,
      ) ?? 0;
    return {
      cart,
      ready,
      count,
      subtotalKobo,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    };
  }, [cart, ready, addItem, setQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}

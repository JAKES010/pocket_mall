"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/checkout"
      className="relative inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink transition hover:border-brand-300"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
        <path
          d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 8H7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20" r="1.2" fill="currentColor" />
        <circle cx="18" cy="20" r="1.2" fill="currentColor" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {ready && count > 0 && (
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button type="button" onClick={signOut} className="btn-ghost btn-sm">
      Sign out
    </button>
  );
}

export function MobileNav({ hasVendor }: { hasVendor: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Explore", icon: "🍽️" },
    { href: "/messages", label: "Chats", icon: "💬" },
    { href: "/orders", label: "Orders", icon: "🧾" },
    { href: "/wallet", label: "Wallet", icon: "👛" },
    hasVendor
      ? { href: "/sell", label: "Sell", icon: "🏪" }
      : { href: "/sell/onboarding", label: "Sell", icon: "🏪" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold ${
                  active ? "text-brand-600" : "text-muted"
                }`}
              >
                <span className="relative text-base leading-none">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

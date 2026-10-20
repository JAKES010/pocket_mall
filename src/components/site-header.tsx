import Link from "next/link";
import { getCurrentUser, getVendorForOwner } from "@/lib/auth/session";
import { CartButton, MobileNav, SignOutButton } from "@/components/nav-client";
import { Logo } from "@/components/logo";

const CUSTOMER_LINKS = [
  { href: "/messages", label: "Messages" },
  { href: "/orders", label: "Orders" },
  { href: "/wallet", label: "Wallet" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const vendor = user ? getVendorForOwner(user.id) : null;
  const initials = user?.display_name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-brand-50"
          >
            Explore
          </Link>
          {user &&
            CUSTOMER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-brand-50 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          {user && (
            <Link
              href={vendor ? "/sell" : "/sell/onboarding"}
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-brand-50 hover:text-ink"
            >
              {vendor ? "Vendor desk" : "Become a vendor"}
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CartButton />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3 sm:flex">
                <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  {initials || "U"}
                </span>
                <span className="max-w-24 truncate text-xs font-semibold">
                  {user.display_name.split(" ")[0]}
                </span>
              </span>
              <SignOutButton />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link href="/sign-in" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn-primary btn-sm">
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
      {user && (
        <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {CUSTOMER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="chip shrink-0">
              {link.label}
            </Link>
          ))}
          <Link
            href={vendor ? "/sell" : "/sell/onboarding"}
            className="chip shrink-0"
          >
            {vendor ? "Vendor desk" : "Become a vendor"}
          </Link>
        </div>
      )}
      <MobileNav hasVendor={Boolean(vendor)} />
    </header>
  );
}

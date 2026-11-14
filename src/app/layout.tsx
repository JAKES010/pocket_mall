import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OrderDesk | Otukpo's local food marketplace",
  description:
    "Discover local kitchens in Otukpo, explore their menus, and place an order with clear item and delivery pricing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-16 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-line/80 bg-paper/70">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
              <div className="flex items-start gap-3">
                <Logo compact />
                <div className="text-xs leading-relaxed text-muted">
                  <p className="font-semibold text-ink">OrderDesk · Otukpo&apos;s local food marketplace.</p>
                  <p>Preview experience. Listings and orders use sample data; wallet funds are simulated.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted">
                <Link href="/" className="hover:text-ink">Explore</Link>
                <Link href="/sell/onboarding" className="hover:text-ink">Sell on OrderDesk</Link>
                <Link href="/wallet" className="hover:text-ink">Wallet</Link>
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}

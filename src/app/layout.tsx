import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OrderDesk — Otukpo fast food, ordered properly",
  description:
    "Discover fast-food vendors in Otukpo, describe what you want, review an accurate order, and pay with a demo wallet.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">
            {children}
          </main>
          <footer className="border-t border-line/80 bg-paper/60">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Logo compact />
                <div className="text-xs leading-relaxed text-muted">
                  <p className="font-semibold text-ink">
                    OrderDesk — an AI-assisted fast-food marketplace for Otukpo.
                  </p>
                  <p>
                    Demo build. Vendors are fictional, and wallet funds are
                    simulated test money — no real payments.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted">
                <Link href="/" className="hover:text-ink">
                  Explore
                </Link>
                <Link href="/sell/onboarding" className="hover:text-ink">
                  Sell on OrderDesk
                </Link>
                <Link href="/wallet" className="hover:text-ink">
                  Demo wallet
                </Link>
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}

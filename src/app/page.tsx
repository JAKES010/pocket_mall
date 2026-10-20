import Link from "next/link";
import { AssistantWidget } from "@/components/assistant-widget";
import { VendorCard } from "@/components/vendor-card";
import { EmptyState } from "@/components/ui";
import { listPublishedVendors } from "@/lib/catalogue/service";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; accepting?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const acceptingOnly = params.accepting === "1";
  const vendors = listPublishedVendors({ q, acceptingOnly });
  const acceptingCount = vendors.filter(
    (vendor) => vendor.accepting_orders === 1,
  ).length;

  return (
    <div className="space-y-8">
      <section className="grid items-center gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-brand-100 text-brand-700">
              Otukpo, Benue · Fast food
            </span>
            <span className="badge bg-paper text-muted ring-1 ring-line">
              Demo wallet · test funds
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
            Good food,
            <br />
            <span className="text-brand-600">properly ordered.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
            Discover fast-food vendors around Otukpo, describe what you want,
            review an accurate order, and pay from one demo wallet. Any vendor
            can open a storefront.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#vendors" className="btn-primary">
              Browse {vendors.length} kitchens
            </a>
            <Link href="/sell/onboarding" className="btn-secondary">
              Sell your food
            </Link>
          </div>
          <dl className="mt-6 grid max-w-lg grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-line bg-paper/70 px-3 py-2.5">
              <dt className="text-muted">Open now</dt>
              <dd className="mt-0.5 text-lg font-bold">{acceptingCount}</dd>
            </div>
            <div className="rounded-xl border border-line bg-paper/70 px-3 py-2.5">
              <dt className="text-muted">Delivery zones</dt>
              <dd className="mt-0.5 text-lg font-bold">Per vendor</dd>
            </div>
            <div className="rounded-xl border border-line bg-paper/70 px-3 py-2.5">
              <dt className="text-muted">Payments</dt>
              <dd className="mt-0.5 text-lg font-bold">Demo</dd>
            </div>
          </dl>
        </div>

        <div className="relative hidden min-h-72 lg:block" aria-hidden="true">
          <div className="absolute right-4 top-0 w-56 rotate-3 rounded-3xl border border-line bg-paper p-2 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/food/rice.svg" alt="" className="w-full rounded-2xl" />
            <p className="px-2 pb-1 pt-2 text-sm font-semibold">Rice & chicken</p>
          </div>
          <div className="absolute left-0 top-24 w-52 -rotate-6 rounded-3xl border border-line bg-paper p-2 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/food/burger.svg" alt="" className="w-full rounded-2xl" />
            <p className="px-2 pb-1 pt-2 text-sm font-semibold">Campus burger</p>
          </div>
          <div className="absolute bottom-0 right-16 w-48 rotate-6 rounded-3xl border border-line bg-paper p-2 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/food/suya.svg" alt="" className="w-full rounded-2xl" />
            <p className="px-2 pb-1 pt-2 text-sm font-semibold">Evening suya</p>
          </div>
        </div>
      </section>

      <AssistantWidget />

      <section id="vendors" className="scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">
              Marketplace
            </p>
            <h2 className="section-title">
              {q ? `Results for “${q}”` : "Otukpo kitchens"}
            </h2>
          </div>
          <form
            method="get"
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
          >
            <label htmlFor="vendor-search" className="sr-only">
              Search vendors or menu items
            </label>
            <input
              id="vendor-search"
              name="q"
              defaultValue={q}
              placeholder="Search vendors or dishes"
              className="field sm:w-64"
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
              <input
                type="checkbox"
                name="accepting"
                value="1"
                defaultChecked={acceptingOnly}
                className="size-4 accent-brand-600"
              />
              Accepting orders
            </label>
            <button type="submit" className="btn-secondary btn-sm">
              Search
            </button>
          </form>
        </div>

        {vendors.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="No kitchens match that search"
            href="/"
            action="Clear search"
          >
            {q
              ? `Nothing matched “${q}”. Try a dish name like rice, suya or burger.`
              : "No storefronts are published yet. A vendor can create one in minutes."}
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        {[
          {
            step: "01",
            title: "Discover",
            body: "Search vendors or describe your meal and budget to the assistant.",
          },
          {
            step: "02",
            title: "Review",
            body: "The server prices every item and delivery fee before you confirm.",
          },
          {
            step: "03",
            title: "Pay & track",
            body: "Pay from the demo wallet, then follow the vendor's status updates.",
          },
        ].map((item) => (
          <div key={item.step}>
            <span className="text-[11px] font-bold tracking-[0.16em] text-brand-600">
              {item.step}
            </span>
            <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

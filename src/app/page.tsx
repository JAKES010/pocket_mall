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
  const acceptingCount = vendors.filter((vendor) => vendor.accepting_orders === 1).length;

  return (
    <div className="marketplace space-y-14 sm:space-y-20">
      <section className="hero-panel relative isolate overflow-hidden rounded-[2rem]">
        <div className="hero-grain" aria-hidden="true" />
        <div className="relative grid min-h-[520px] items-center gap-8 px-6 py-12 sm:px-10 lg:min-h-[590px] lg:grid-cols-[1.03fr_.97fr] lg:px-14 lg:py-16">
          <div className="relative z-10 max-w-xl">
            <div className="hero-kicker"><span className="hero-live-dot" /> OTUKPO, BENUE · MADE FOR YOUR NEIGHBOURHOOD</div>
            <h1 className="hero-title mt-7 text-[3.45rem] font-semibold leading-[.99] tracking-[-.055em] sm:text-6xl lg:text-[4.5rem]">
              Good food finds <span>its way</span> to you.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70 sm:text-lg">
              Find the kitchen you&apos;re craving. Choose your meal. We&apos;ll make ordering feel easy.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#vendors" className="hero-cta">Explore local kitchens <span aria-hidden="true">↗</span></a>
              <Link href="/sell/onboarding" className="hero-secondary">Open your storefront</Link>
            </div>
            <div className="hero-proof mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
              <div><strong>{vendors.length.toString().padStart(2, "0")}</strong><span>local kitchens</span></div>
              <div><strong>{acceptingCount.toString().padStart(2, "0")}</strong><span>taking orders now</span></div>
              <div className="hero-proof-note"><span className="hero-proof-icon">✳</span><span>Independent kitchens.<br />One easy place to order.</span></div>
            </div>
          </div>

          <div className="food-stage relative mx-auto h-[330px] w-full max-w-[500px] sm:h-[400px] lg:h-[470px]" aria-label="A selection of dishes from local kitchens">
            <div className="food-orbit food-orbit-one" /><div className="food-orbit food-orbit-two" />
            <div className="food-note food-note-top"><span className="food-note-star">✳</span><span><b>A good day</b><small>starts with good food</small></span></div>
            <div className="food-card food-card-main">
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/food/rice.svg" alt="Rice and chicken" />
              <div><span>THE COMFORT PICK</span><b>Rice &amp; chicken</b></div>
            </div>
            <div className="food-card food-card-small food-card-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/food/suya.svg" alt="Fresh suya" /><div><span>FIRE &amp; FLAVOUR</span><b>Evening suya</b></div>
            </div>
            <div className="food-card food-card-small food-card-right">
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/food/burger.svg" alt="Burger and chips" /><div><span>THE CROWD FAVOURITE</span><b>Campus burger</b></div>
            </div>
            <div className="food-stamp"><span>GOOD FOOD</span><b>✳</b><span>GOOD MOOD</span></div>
          </div>
        </div>
        <div className="hero-bottomline"><span>LOCAL FLAVOUR, A LITTLE CLOSER</span><span>01 — MADE IN OTUKPO</span></div>
      </section>

      <section id="vendors" className="scroll-mt-28">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">THE NEIGHBOURHOOD TABLE</p>
            <h2 className="section-title mt-2 text-3xl sm:text-4xl">{q ? `Results for “${q}”` : "Find your next favourite."}</h2>
            <p className="mt-2 text-sm text-muted">Good people, cooking good things, right here in Otukpo.</p>
          </div>
          <form method="get" className="vendor-search flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label htmlFor="vendor-search" className="sr-only">Search vendors or menu items</label>
            <div className="search-field-wrap"><span aria-hidden="true">⌕</span><input id="vendor-search" name="q" defaultValue={q} placeholder="A dish, a kitchen, a craving…" className="field sm:w-72" /></div>
            <label className="flex cursor-pointer items-center gap-2 px-1 text-xs font-semibold text-muted"><input type="checkbox" name="accepting" value="1" defaultChecked={acceptingOnly} className="size-4 accent-brand-600" />Open now</label>
            <button type="submit" className="btn-primary">Find food</button>
          </form>
        </div>
        {vendors.length === 0 ? (
          <EmptyState emoji="🔎" title="No kitchens match that search" href="/" action="Clear search">
            {q ? `Nothing matched “${q}”. Try a dish name like rice, suya or burger.` : "No storefronts are published yet. A vendor can create one in minutes."}
          </EmptyState>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{vendors.map((vendor, index) => <VendorCard key={vendor.id} vendor={vendor} index={index} />)}</div>
        )}
      </section>

      <AssistantWidget />

      <section className="how-section">
        <div className="mb-7"><p className="eyebrow">A LITTLE LESS HASSLE</p><h2 className="section-title mt-2 text-3xl sm:text-4xl">From craving to confirmed.</h2></div>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
          {[
            { step: "01", title: "Find something good", body: "Browse Otukpo kitchens or tell the food assistant what sounds good." },
            { step: "02", title: "Know what it costs", body: "See your items and delivery charge together before you confirm." },
            { step: "03", title: "Follow your order", body: "Keep up with order updates and message the kitchen when you need to." },
          ].map((item) => <div key={item.step} className="how-card"><span>{item.step}</span><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
      </section>
    </div>
  );
}

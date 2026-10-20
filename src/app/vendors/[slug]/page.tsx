import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { CartBar } from "@/components/cart-bar";
import { MessageVendorButton } from "@/components/message-vendor-button";
import { getPublicVendorBySlug } from "@/lib/catalogue/service";
import { formatNaira } from "@/lib/money";

export default async function VendorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = getPublicVendorBySlug(slug);
  if (!vendor) notFound();

  const accepting = vendor.accepting_orders === 1;
  const available = vendor.menu.filter((item) => item.available && !item.archived);
  const unavailable = vendor.menu.filter((item) => !item.available && !item.archived);
  const cartVendor = { id: vendor.id, name: vendor.name, slug: vendor.slug };
  const whatsappHref = `https://wa.me/${vendor.whatsapp}?text=${encodeURIComponent(
    `Hi ${vendor.name}, I'd like to order from OrderDesk.`,
  )}`;

  return (
    <div className="space-y-6">
      <Link href="/" className="btn-ghost btn-sm -ml-2">
        ← Back to marketplace
      </Link>

      <section className="card overflow-hidden">
        <div className="relative h-44 bg-brand-100 sm:h-56">
          {vendor.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.image_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-6xl">
              {vendor.emoji}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 text-white">
            <div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span
                  className={`badge ${accepting ? "bg-white/95 text-leaf-700" : "bg-white/95 text-stone-600"}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${accepting ? "bg-leaf-600" : "bg-stone-400"}`}
                  />
                  {accepting ? "Accepting orders" : "Not accepting orders"}
                </span>
                {vendor.is_sample === 1 && (
                  <span className="badge bg-white/90 text-stone-600">
                    Sample vendor
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {vendor.emoji} {vendor.name}
              </h1>
              <p className="mt-1 text-sm text-white/85">
                {vendor.address} · {vendor.opening_hours}
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="text-sm leading-relaxed text-muted">
              {vendor.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MessageVendorButton vendorId={vendor.id} className="btn-primary" />
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                WhatsApp
              </a>
              <span className="chip">
                {vendor.category} · {vendor.city}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-brand-50/50 p-4 text-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-700">
              Pickup & delivery
            </h2>
            <ul className="mt-2 space-y-1.5 text-muted">
              <li className="flex justify-between gap-3">
                <span>Pickup</span>
                <span className="font-semibold text-ink">Free</span>
              </li>
              {vendor.zones.length === 0 && (
                <li className="text-xs">
                  Delivery is not configured for this vendor yet.
                </li>
              )}
              {vendor.zones.map((zone) => (
                <li key={zone.id} className="flex justify-between gap-3">
                  <span>{zone.name}</span>
                  <span className="font-semibold text-ink">
                    {formatNaira(zone.fee_kobo)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Delivery is handled by the vendor. Fees are set per zone and added
              to the server-issued quote.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">
              Menu
            </p>
            <h2 className="section-title">What&apos;s cooking</h2>
          </div>
          <span className="text-xs text-muted">
            {available.length} available
          </span>
        </div>

        {available.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            This vendor has no available items right now. Check back later or
            send them a message.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((item) => (
              <article key={item.id} className="card flex flex-col overflow-hidden">
                <div className="aspect-[16/10] bg-brand-50">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-4xl">
                      {vendor.emoji}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold leading-snug">{item.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                    {item.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="text-base font-bold">
                      {formatNaira(item.price_kobo)}
                    </span>
                    <AddToCartButton
                      item={item}
                      vendor={cartVendor}
                      paused={!accepting}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {unavailable.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Out of stock
            </h3>
            <div className="card divide-y divide-line">
              {unavailable.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-muted">{item.name}</span>
                  <span className="badge bg-stone-200 text-stone-600">
                    Out of stock
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <strong>Demo notice:</strong> this storefront is sample data for the
        OrderDesk prototype. Orders and wallet payments use simulated test
        funds — no real money moves, and no real food is dispatched.
      </section>

      <CartBar />
    </div>
  );
}

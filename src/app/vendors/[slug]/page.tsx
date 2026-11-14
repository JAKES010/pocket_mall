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
    <div className="vendor-page space-y-9 sm:space-y-12">
      <Link href="/" className="vendor-back"><span aria-hidden="true">←</span> All kitchens</Link>

      <section className="vendor-profile overflow-hidden rounded-[1.75rem] border border-line bg-paper">
        <div className="vendor-cover relative">
          {vendor.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.image_url} alt={`${vendor.name} kitchen`} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-7xl" aria-hidden="true">{vendor.emoji}</div>
          )}
          <div className="vendor-cover-shade" />
          <div className="vendor-cover-label"><span className="vendor-cover-pulse" /> A KITCHEN IN OTUKPO</div>
          <div className="vendor-cover-bottom">
            <div className="flex flex-wrap gap-2">
              <span className={`badge ${accepting ? "bg-[#e4f4ca] text-[#305a31]" : "bg-white/90 text-stone-600"}`}>
                <span className={`size-1.5 rounded-full ${accepting ? "bg-[#438845]" : "bg-stone-400"}`} />
                {accepting ? "Taking orders" : "Temporarily paused"}
              </span>
              {vendor.is_sample === 1 && <span className="badge bg-white/90 text-stone-600">Preview listing</span>}
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-5xl">{vendor.name}</h1>
            <p className="mt-2 text-xs text-white/85 sm:text-sm">{vendor.address}<span className="px-2 text-white/50">·</span>{vendor.opening_hours}</p>
          </div>
          <span className="vendor-mark" aria-hidden="true">{vendor.emoji}</span>
        </div>

        <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.12fr_.88fr] lg:p-9">
          <div className="flex flex-col items-start">
            <p className="vendor-description text-sm leading-7 text-muted">{vendor.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <MessageVendorButton vendorId={vendor.id} className="btn-primary" />
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-secondary">WhatsApp <span aria-hidden="true">↗</span></a>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              <span className="chip">{vendor.category}</span>
              <span className="chip">{vendor.city}</span>
              <span className="chip">{available.length} menu items</span>
            </div>
          </div>
          <aside className="delivery-panel">
            <div className="flex items-center justify-between gap-2">
              <div><p className="eyebrow">GET IT YOUR WAY</p><h2 className="mt-1 text-xl font-semibold">Pickup &amp; delivery</h2></div>
              <span className="delivery-symbol" aria-hidden="true">↗</span>
            </div>
            <ul className="mt-4 divide-y divide-[#e7e0d4]">
              <li className="flex justify-between gap-3 py-3 text-sm"><span>Pickup</span><span className="font-semibold text-ink">Free</span></li>
              {vendor.zones.length === 0 && <li className="py-3 text-xs text-muted">Delivery is not configured for this kitchen yet.</li>}
              {vendor.zones.map((zone) => <li key={zone.id} className="flex justify-between gap-3 py-3 text-sm"><span>{zone.name}</span><span className="font-semibold text-ink">{formatNaira(zone.fee_kobo)}</span></li>)}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">Delivery is handled by the kitchen. The applicable fee is shown again before you confirm your order.</p>
          </aside>
        </div>
      </section>

      <section id="menu" className="scroll-mt-28">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
          <div><p className="eyebrow">FRESH FROM THE KITCHEN</p><h2 className="section-title mt-2 text-3xl sm:text-4xl">On the menu</h2></div>
          <span className="menu-count"><b>{String(available.length).padStart(2, "0")}</b> available today</span>
        </div>

        {available.length === 0 ? (
          <div className="vendor-empty"><span aria-hidden="true">✳</span><h3>Nothing on the menu just yet</h3><p>This kitchen has no available items right now. Check back later or send them a message.</p><MessageVendorButton vendorId={vendor.id} className="btn-secondary mt-4" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((item, index) => (
              <article key={item.id} className="menu-card group" style={{ animationDelay: `${index * 65}ms` }}>
                <div className="menu-card-image">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="size-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : <div className="grid size-full place-items-center text-5xl" aria-hidden="true">{vendor.emoji}</div>}
                  <span className="menu-image-sheen" />
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3"><h3 className="menu-title text-lg font-semibold leading-snug">{item.name}</h3><span className="menu-price">{formatNaira(item.price_kobo)}</span></div>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted">{item.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4"><span className="menu-made"><span /> Made to order</span><AddToCartButton item={item} vendor={cartVendor} paused={!accepting} /></div>
                </div>
              </article>
            ))}
          </div>
        )}

        {unavailable.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3"><h3 className="text-xs font-extrabold uppercase tracking-[.16em] text-muted">Currently unavailable</h3><span className="h-px flex-1 bg-line" /></div>
            <div className="unavailable-list">{unavailable.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="text-muted">{item.name}</span><span className="badge bg-stone-100 text-stone-600">Sold out</span></div>)}</div>
          </div>
        )}
      </section>

      <section className="preview-notice"><span className="preview-notice-icon" aria-hidden="true">i</span><p><strong>OrderDesk preview.</strong> This listing uses sample data. Orders and wallet payments use simulated funds; no real money moves and no food is dispatched.</p></section>
      <CartBar />
    </div>
  );
}

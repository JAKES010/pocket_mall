import Link from "next/link";
import type { VendorCard as VendorCardType } from "@/lib/catalogue/service";
import { formatNaira } from "@/lib/money";

export function VendorCard({ vendor }: { vendor: VendorCardType }) {
  const accepting = vendor.accepting_orders === 1;
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-brand-50">
        {vendor.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.image_url}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-5xl">
            {vendor.emoji}
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span
            className={`badge backdrop-blur ${
              accepting
                ? "bg-white/90 text-leaf-700"
                : "bg-white/90 text-stone-600"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                accepting ? "bg-leaf-600" : "bg-stone-400"
              }`}
            />
            {accepting ? "Accepting orders" : "Paused"}
          </span>
          {vendor.is_sample === 1 && (
            <span className="badge bg-white/90 text-stone-600">Sample</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold leading-tight">{vendor.name}</h3>
            <p className="mt-0.5 text-xs text-muted">{vendor.address}</p>
          </div>
          <span className="text-xl" aria-hidden="true">
            {vendor.emoji}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {vendor.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
          <span className="font-semibold text-ink">
            {vendor.min_price_kobo !== null
              ? `From ${formatNaira(vendor.min_price_kobo)}`
              : "Menu coming soon"}
          </span>
          <span className="text-muted">
            {vendor.item_count} item{vendor.item_count === 1 ? "" : "s"} ·{" "}
            {vendor.city}
          </span>
        </div>
      </div>
    </Link>
  );
}

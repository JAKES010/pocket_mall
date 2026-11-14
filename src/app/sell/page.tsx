import Link from "next/link";
import { redirect } from "next/navigation";
import { AcceptingToggle } from "@/components/accepting-toggle";
import { OrderActions } from "@/components/order-actions";
import { EmptyState, PaymentBadge, StatusBadge } from "@/components/ui";
import { getCurrentUser, getVendorForOwner } from "@/lib/auth/session";
import { ORDER_STATUS_META, fulfilmentLabel } from "@/lib/format";
import { formatNaira, formatDateTime } from "@/lib/money";
import { listVendorOrders } from "@/lib/orders/service";
import { getVendorEarnings } from "@/lib/wallet/service";

export const dynamic = "force-dynamic";

const LIVE_STATUSES = ["submitted", "accepted", "preparing", "ready", "out_for_delivery"] as const;

export default async function VendorDeskPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsell");

  const vendor = getVendorForOwner(user.id);
  if (!vendor) redirect("/sell/onboarding");

  const earnings = getVendorEarnings(vendor.id);
  const orders = listVendorOrders(vendor.id);
  const live = orders
    .filter((order) => (LIVE_STATUSES as readonly string[]).includes(order.status))
    .sort((a, b) => {
      if (a.status === "submitted" && b.status !== "submitted") return -1;
      if (b.status === "submitted" && a.status !== "submitted") return 1;
      return a.created_at < b.created_at ? 1 : -1;
    });
  const history = orders.filter((order) => !(LIVE_STATUSES as readonly string[]).includes(order.status)).slice(0, 8);
  const needsAction = live.filter((order) => order.status === "submitted").length;
  const published = Boolean(vendor.published_at);

  return (
    <div className="vendor-desk space-y-9 sm:space-y-12">
      <section className="desk-hero">
        <div className="desk-hero-texture" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-9">
          <div className="flex items-start gap-4">
            <span className="desk-avatar">{vendor.emoji}</span>
            <div>
              <p className="desk-eyebrow">YOUR KITCHEN · VENDOR DESK</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{vendor.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">
                <span className="inline-flex items-center gap-1.5"><i className={`desk-status-dot ${published ? "is-live" : ""}`} />{published ? "Storefront published" : "Storefront unpublished"}</span>
                <span className="hidden text-white/30 sm:inline">/</span>
                {published ? <Link href={`/vendors/${vendor.slug}`} className="font-semibold text-[#d5f080] hover:underline">View public storefront ↗</Link> : <span>Customers cannot see you yet.</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="desk-toggle"><AcceptingToggle vendorId={vendor.id} accepting={vendor.accepting_orders === 1} /></div>
            <div className="flex flex-wrap gap-2">
              <Link href="/sell/menu" className="desk-link-primary">Manage menu <span>↗</span></Link>
              <Link href="/sell/profile" className="desk-link-secondary">Storefront settings</Link>
            </div>
          </div>
        </div>
        {!published && <div className="relative z-10 mx-6 mb-6 rounded-xl border border-[#f0d99d55] bg-[#f5dfa91c] px-4 py-3 text-xs leading-relaxed text-[#fff0c9] sm:mx-8 lg:mx-10"><strong>Almost ready to open.</strong> Add an available menu item, then publish your storefront from <Link href="/sell/profile" className="font-bold underline">storefront settings</Link>.</div>}
        <div className="desk-hero-footer"><span>ORDERDESK KITCHEN CONSOLE</span><span>{vendor.city.toUpperCase()} · LOCAL COMMERCE</span></div>
      </section>

      <section aria-label="Business overview" className="grid gap-3 sm:grid-cols-3">
        <article className="desk-metric"><div className="desk-metric-top"><span>PAYABLE BALANCE</span><span className="desk-metric-icon">₦</span></div><p className="desk-metric-value">{formatNaira(earnings.payable_balance_kobo)}</p><p className="desk-metric-caption">Demo funds settled on completion</p></article>
        <article className="desk-metric"><div className="desk-metric-top"><span>COMPLETED ORDERS</span><span className="desk-metric-icon">✓</span></div><p className="desk-metric-value">{earnings.completed_orders}</p><p className="desk-metric-caption">All time</p></article>
        <article className="desk-metric"><div className="desk-metric-top"><span>COMPLETED GROSS</span><span className="desk-metric-icon">↗</span></div><p className="desk-metric-value">{formatNaira(earnings.completed_gross_kobo)}</p><p className="desk-metric-caption">Simulated order totals</p></article>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">INCOMING WORK</p><h2 className="section-title mt-2 text-3xl sm:text-4xl">Kitchen queue</h2><p className="mt-1 text-xs text-muted">Keep this page open to manage active orders.</p></div>
          <span className={`queue-counter ${needsAction > 0 ? "queue-counter-alert" : ""}`}><i />{needsAction > 0 ? `${needsAction} awaiting your response` : `${live.length} active orders`}</span>
        </div>
        {live.length === 0 ? (
          <div className="desk-empty"><span aria-hidden="true">✳</span><h3>You&apos;re all caught up.</h3><p>New orders will appear here when customers place them.</p></div>
        ) : (
          <div className="space-y-4">
            {live.map((order, index) => (
              <article key={order.id} className={`order-ticket ${order.status === "submitted" ? "order-ticket-new" : ""}`} style={{ animationDelay: `${index * 60}ms` }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3"><span className="ticket-number">{String(index + 1).padStart(2, "0")}</span><div><p className="font-semibold">{order.customer_name}<span className="ml-2 font-mono text-[10px] text-muted">#{order.id.slice(0, 8)}</span></p><p className="mt-1 text-xs text-muted">{formatDateTime(order.created_at)}<span className="px-1.5">·</span>{fulfilmentLabel(order.fulfilment)}{order.zone_name ? ` · ${order.zone_name}` : ""}</p></div></div>
                  <div className="flex flex-wrap items-center gap-2"><StatusBadge status={order.status} /><PaymentBadge status={order.payment_status} /><span className="order-ticket-total">{formatNaira(order.total_kobo)}</span></div>
                </div>
                <div className="order-ticket-detail"><span>{ORDER_STATUS_META[order.status].hint}{order.delivery_address ? ` Deliver to: ${order.delivery_address}.` : ""}</span><span className="shrink-0">Contact: <a href={`tel:${order.contact_phone}`} className="font-semibold text-ink hover:text-brand-700">{order.contact_phone}</a></span></div>
                <div className="mt-4"><OrderActions orderId={order.id} status={order.status} fulfilment={order.fulfilment} /></div>
                <div className="mt-3 text-right"><Link href={`/orders/${order.id}`} className="text-xs font-bold text-brand-700 hover:underline">Order details ↗</Link></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">PAST ACTIVITY</p><h2 className="mt-1 text-2xl font-semibold">Recent orders</h2></div><span className="text-xs text-muted">Latest {history.length}</span></div>
        {history.length === 0 ? <EmptyState emoji="▤" title="Your order history starts here">Finished and cancelled orders will be available in this list.</EmptyState> : (
          <div className="history-list">{history.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="history-row"><div className="min-w-0"><p className="truncate font-semibold">{order.customer_name}</p><p className="mt-1 text-xs text-muted">{formatDateTime(order.created_at)}<span className="px-1.5">·</span>{fulfilmentLabel(order.fulfilment)}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><StatusBadge status={order.status} /><PaymentBadge status={order.payment_status} /><span className="w-20 text-right text-sm font-semibold">{formatNaira(order.total_kobo)}</span></div></Link>)}</div>
        )}
      </section>
    </div>
  );
}

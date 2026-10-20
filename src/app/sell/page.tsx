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

const LIVE_STATUSES = [
  "submitted",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
] as const;

export default async function VendorDeskPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsell");

  const vendor = getVendorForOwner(user.id);
  if (!vendor) redirect("/sell/onboarding");

  const earnings = getVendorEarnings(vendor.id);
  const orders = listVendorOrders(vendor.id);
  const live = orders
    .filter((order) =>
      (LIVE_STATUSES as readonly string[]).includes(order.status),
    )
    .sort((a, b) => {
      if (a.status === "submitted" && b.status !== "submitted") return -1;
      if (b.status === "submitted" && a.status !== "submitted") return 1;
      return a.created_at < b.created_at ? 1 : -1;
    });
  const history = orders
    .filter(
      (order) =>
        !(LIVE_STATUSES as readonly string[]).includes(order.status),
    )
    .slice(0, 8);
  const needsAction = live.filter((order) => order.status === "submitted").length;
  const published = Boolean(vendor.published_at);

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-2xl">
              {vendor.emoji}
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">
                Vendor desk
              </p>
              <h1 className="text-2xl font-semibold">{vendor.name}</h1>
              <p className="text-xs text-muted">
                {published ? (
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    View public storefront →
                  </Link>
                ) : (
                  "Not published — customers cannot see you yet."
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <AcceptingToggle
              vendorId={vendor.id}
              accepting={vendor.accepting_orders === 1}
            />
            <div className="flex flex-wrap gap-1.5">
              <Link href="/sell/menu" className="btn-secondary btn-sm">
                Manage menu
              </Link>
              <Link href="/sell/profile" className="btn-secondary btn-sm">
                Storefront settings
              </Link>
            </div>
          </div>
        </div>

        {!published && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
            <strong>Finish setup to go live.</strong> Add at least one available
            menu item, then publish from{" "}
            <Link href="/sell/profile" className="font-semibold underline">
              storefront settings
            </Link>
            .
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">
            Payable balance
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatNaira(earnings.payable_balance_kobo)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Demo funds settled on completion
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">
            Completed orders
          </p>
          <p className="mt-1 text-2xl font-bold">{earnings.completed_orders}</p>
          <p className="mt-0.5 text-[11px] text-muted">All time</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">
            Completed gross
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatNaira(earnings.completed_gross_kobo)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">Demo money only</p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">
              Kitchen queue
            </p>
            <h2 className="section-title">Live orders</h2>
          </div>
          <span className="text-xs text-muted">
            {needsAction > 0
              ? `${needsAction} awaiting your response`
              : `${live.length} active`}
          </span>
        </div>

        {live.length === 0 ? (
          <div className="card px-5 py-10 text-center text-sm text-muted">
            No live orders. New orders appear here automatically — keep this page
            open during the demo.
          </div>
        ) : (
          <div className="space-y-3">
            {live.map((order) => (
              <article key={order.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {order.customer_name}
                      <span className="ml-2 font-mono text-[10px] text-muted">
                        {order.id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(order.created_at)} ·{" "}
                      {fulfilmentLabel(order.fulfilment)}
                      {order.zone_name ? ` · ${order.zone_name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.status} />
                    <PaymentBadge status={order.payment_status} />
                    <span className="text-base font-bold">
                      {formatNaira(order.total_kobo)}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted">
                  {ORDER_STATUS_META[order.status].hint}
                  {order.delivery_address
                    ? ` Deliver to: ${order.delivery_address}.`
                    : ""}{" "}
                  Contact: {order.contact_phone}.
                </p>

                <div className="mt-3">
                  <OrderActions
                    orderId={order.id}
                    status={order.status}
                    fulfilment={order.fulfilment}
                  />
                </div>

                <div className="mt-2 text-right">
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Open order details →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Recent history
        </h2>
        {history.length === 0 ? (
          <EmptyState emoji="📦" title="Nothing in history yet">
            Completed, rejected and cancelled orders are archived here.
          </EmptyState>
        ) : (
          <div className="card divide-y divide-line">
            {history.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition hover:bg-brand-50/40"
              >
                <div>
                  <p className="font-semibold">{order.customer_name}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(order.created_at)} ·{" "}
                    {fulfilmentLabel(order.fulfilment)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.payment_status} />
                  <span className="w-20 text-right font-semibold">
                    {formatNaira(order.total_kobo)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

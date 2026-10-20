import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeading, PaymentBadge, StatusBadge } from "@/components/ui";
import { getCurrentUser, getVendorForOwner } from "@/lib/auth/session";
import { ORDER_STATUS_META, fulfilmentLabel } from "@/lib/format";
import { formatNaira, formatDateTime } from "@/lib/money";
import { listCustomerOrders } from "@/lib/orders/service";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Forders");

  const orders = listCustomerOrders(user.id);
  const vendor = getVendorForOwner(user.id);

  return (
    <div>
      <PageHeading eyebrow="Your orders" title="Orders">
        Follow each order from submission to completion. Demo payments are held
        until the order is done, then refunded or settled automatically.
      </PageHeading>

      {vendor && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-leaf-200 bg-leaf-50 px-4 py-3 text-sm text-leaf-700">
          <span>
            You also manage <strong>{vendor.name}</strong>. Incoming orders are in
            your vendor desk.
          </span>
          <Link href="/sell" className="btn-secondary btn-sm">
            Open vendor desk
          </Link>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="No orders yet"
          href="/"
          action="Browse kitchens"
        >
          Pick a vendor, review a server-priced quote, then pay with demo funds.
          Your orders and their status updates appear here.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const meta = ORDER_STATUS_META[order.status];
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="card block p-4 transition hover:border-brand-300 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-xl">
                      {order.vendor_emoji}
                    </span>
                    <div>
                      <p className="font-semibold">{order.vendor_name}</p>
                      <p className="text-xs text-muted">
                        {formatDateTime(order.created_at)} ·{" "}
                        {fulfilmentLabel(order.fulfilment)}
                        {order.zone_name ? ` · ${order.zone_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <PaymentBadge status={order.payment_status} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3">
                  <p className="text-xs text-muted">{meta.hint}</p>
                  <p className="text-lg font-bold">{formatNaira(order.total_kobo)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

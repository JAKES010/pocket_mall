import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelOrderButton, OrderActions } from "@/components/order-actions";
import { PaymentBadge, StatusBadge } from "@/components/ui";
import { getCurrentUser, getVendorById } from "@/lib/auth/session";
import {
  CUSTOMER_TIMELINE,
  ORDER_STATUS_META,
  fulfilmentLabel,
  timelineIndex,
} from "@/lib/format";
import { formatNaira, formatDateTime } from "@/lib/money";
import { getOrderDetail } from "@/lib/orders/service";

export const dynamic = "force-dynamic";

const ACTOR_LABELS: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  system: "System",
  assistant: "Assistant",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=%2Forders%2F${encodeURIComponent(id)}`);

  const detail = getOrderDetail(id, user.id);
  if (!detail) notFound();

  const vendor = getVendorById(detail.order.vendor_id);
  const isVendor = vendor?.owner_id === user.id;
  const { order, items, events } = detail;
  const meta = ORDER_STATUS_META[order.status];
  const terminal = order.status === "cancelled" || order.status === "rejected";
  const activeStep = timelineIndex(order.status, order.fulfilment);
  const lastStepLabel = order.fulfilment === "delivery" ? "Delivered" : "Completed";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={isVendor ? "/sell" : "/orders"}
          className="btn-ghost btn-sm -ml-2"
        >
          ← {isVendor ? "Vendor desk" : "All orders"}
        </Link>
        <span className="font-mono text-[11px] text-muted">
          Order {order.id.slice(0, 8)}
        </span>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-2xl">
              {detail.vendor.emoji}
            </span>
            <div>
              <Link
                href={`/vendors/${detail.vendor.slug}`}
                className="text-xl font-semibold hover:text-brand-700"
              >
                {detail.vendor.name}
              </Link>
              <p className="text-xs text-muted">
                Placed {formatDateTime(order.created_at)}
                {isVendor ? ` by ${detail.customer_name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment_status} />
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-line bg-cream/50 px-3.5 py-2.5 text-sm text-muted">
          {meta.hint}
        </p>

        {terminal && (
          <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-700">
            <strong>
              {order.status === "rejected" ? "Vendor rejected" : "You cancelled"}{" "}
              this order.
            </strong>{" "}
            {order.rejection_reason ??
              "The demo payment was refunded to the customer wallet."}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!isVendor && order.status === "submitted" && (
            <CancelOrderButton orderId={order.id} />
          )}
          {!isVendor && (
            <Link
              href={`/vendors/${detail.vendor.slug}`}
              className="btn-secondary btn-sm"
            >
              Order again
            </Link>
          )}
          {isVendor && (
            <Link href="/sell" className="btn-secondary btn-sm">
              All incoming orders
            </Link>
          )}
        </div>
      </section>

      {isVendor && (
        <OrderActions
          orderId={order.id}
          status={order.status}
          fulfilment={order.fulfilment}
        />
      )}

      {!terminal && (
        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Progress
          </h2>
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {CUSTOMER_TIMELINE.map((step, index) => {
              const done = index <= activeStep;
              const current = index === activeStep;
              return (
                <li key={step.status} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      done
                        ? "bg-brand-600 text-white"
                        : "border border-line bg-white text-muted"
                    } ${current ? "ring-4 ring-brand-100" : ""}`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        done ? "text-ink" : "text-muted"
                      }`}
                    >
                      {index === CUSTOMER_TIMELINE.length - 1
                        ? lastStepLabel
                        : step.label}
                    </p>
                    {current && (
                      <p className="text-[10px] text-brand-700">Now</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {order.fulfilment === "delivery" && order.status === "ready" && (
            <p className="mt-3 text-xs text-muted">
              The vendor will mark this out for delivery before completing it.
            </p>
          )}
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Receipt</h2>
          <ul className="mt-3 divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2.5 text-sm">
                <span>
                  {item.quantity}× {item.name_snapshot}
                  <span className="ml-2 text-xs text-muted">
                    {formatNaira(item.unit_price_kobo)} each
                  </span>
                </span>
                <span className="font-semibold">
                  {formatNaira(item.line_total_kobo)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatNaira(order.subtotal_kobo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                Delivery{order.zone_name ? ` · ${order.zone_name}` : ""}
              </dt>
              <dd>{formatNaira(order.delivery_kobo)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatNaira(order.total_kobo)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Demo funds only. Payment status: {order.payment_status}. No real
            transfer took place.
          </p>
        </section>

        <section className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              Fulfilment
            </h2>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">Method</dt>
                <dd className="font-semibold">
                  {fulfilmentLabel(order.fulfilment)}
                  {order.zone_name ? ` · ${order.zone_name}` : ""}
                </dd>
              </div>
              {order.delivery_address && (
                <div>
                  <dt className="text-xs text-muted">Delivery address</dt>
                  <dd className="font-semibold">{order.delivery_address}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted">Contact phone</dt>
                <dd className="font-semibold">{order.contact_phone}</dd>
              </div>
              {isVendor && (
                <div>
                  <dt className="text-xs text-muted">Customer</dt>
                  <dd className="font-semibold">{detail.customer_name}</dd>
                </div>
              )}
              {!isVendor && (
                <div>
                  <dt className="text-xs text-muted">Vendor location</dt>
                  <dd className="font-semibold">{detail.vendor.address}</dd>
                  <dd className="text-xs text-muted">
                    {detail.vendor.opening_hours}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              Order history
            </h2>
            <ol className="mt-3 space-y-3">
              {events.map((event) => (
                <li key={event.id} className="flex gap-2.5">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">
                      {ORDER_STATUS_META[event.next_status as keyof typeof ORDER_STATUS_META]
                        ?.label ?? event.next_status}
                      <span className="ml-1.5 font-normal text-muted">
                        · {ACTOR_LABELS[event.actor_kind] ?? event.actor_kind}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatDateTime(event.created_at)}
                    </p>
                    {event.reason && (
                      <p className="mt-0.5 text-[11px] text-muted">“{event.reason}”</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

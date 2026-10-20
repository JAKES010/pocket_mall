import Link from "next/link";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/lib/format";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return <span className={`badge ${meta.tone}`}>{meta.label}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <span className={`badge ${meta.tone}`}>{meta.label}</span>;
}

export function DemoBadge() {
  return (
    <span className="badge bg-brand-100 text-brand-700">
      <span aria-hidden="true">●</span> Demo funds
    </span>
  );
}

export function EmptyState({
  emoji,
  title,
  children,
  href,
  action,
}: {
  emoji: string;
  title: string;
  children?: React.ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <span className="mb-3 text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          {children}
        </p>
      )}
      {href && action && (
        <Link href={href} className="btn-primary mt-5">
          {action}
        </Link>
      )}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {children && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {children}
        </p>
      )}
    </div>
  );
}

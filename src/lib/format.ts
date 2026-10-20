import type { Fulfilment, OrderStatus, PaymentStatus } from "@/lib/types";

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: string; hint: string }
> = {
  submitted: {
    label: "Awaiting vendor",
    tone: "bg-amber-100 text-amber-800",
    hint: "Payment is held. The vendor has been notified.",
  },
  accepted: {
    label: "Accepted",
    tone: "bg-sky-100 text-sky-800",
    hint: "The vendor accepted your order.",
  },
  preparing: {
    label: "Preparing",
    tone: "bg-orange-100 text-orange-800",
    hint: "Your food is being prepared.",
  },
  ready: {
    label: "Ready",
    tone: "bg-violet-100 text-violet-800",
    hint: "Ready for pickup or dispatch.",
  },
  out_for_delivery: {
    label: "Out for delivery",
    tone: "bg-indigo-100 text-indigo-800",
    hint: "The vendor is on the way.",
  },
  completed: {
    label: "Completed",
    tone: "bg-emerald-100 text-emerald-800",
    hint: "Fulfilled and settled to the vendor.",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-100 text-rose-800",
    hint: "Rejected by the vendor. Demo funds refunded.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-stone-200 text-stone-700",
    hint: "Cancelled by the customer. Demo funds refunded.",
  },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: string }> = {
  held: { label: "Held in demo escrow", tone: "bg-amber-100 text-amber-800" },
  settled: { label: "Settled", tone: "bg-emerald-100 text-emerald-800" },
  refunded: { label: "Refunded", tone: "bg-stone-200 text-stone-700" },
};

export interface VendorAction {
  action:
    | "accept"
    | "reject"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "completed";
  label: string;
  tone: "primary" | "secondary" | "danger";
}

export function vendorActions(
  status: OrderStatus,
  fulfilment: Fulfilment,
): VendorAction[] {
  switch (status) {
    case "submitted":
      return [
        { action: "accept", label: "Accept order", tone: "primary" },
        { action: "reject", label: "Reject", tone: "danger" },
      ];
    case "accepted":
      return [{ action: "preparing", label: "Start preparing", tone: "primary" }];
    case "preparing":
      return [{ action: "ready", label: "Mark ready", tone: "primary" }];
    case "ready":
      return fulfilment === "pickup"
        ? [{ action: "completed", label: "Handed over", tone: "primary" }]
        : [
            {
              action: "out_for_delivery",
              label: "Send for delivery",
              tone: "primary",
            },
          ];
    case "out_for_delivery":
      return [{ action: "completed", label: "Mark delivered", tone: "primary" }];
    default:
      return [];
  }
}

export function fulfilmentLabel(fulfilment: Fulfilment): string {
  return fulfilment === "delivery" ? "Delivery" : "Pickup";
}

export const CUSTOMER_TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "submitted", label: "Submitted" },
  { status: "accepted", label: "Accepted" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

export function timelineIndex(
  status: OrderStatus,
  fulfilment: Fulfilment,
): number {
  if (status === "completed") return 4;
  if (status === "out_for_delivery") return 3;
  const index = CUSTOMER_TIMELINE.findIndex((step) => step.status === status);
  if (index >= 0) return index;
  return 0;
}

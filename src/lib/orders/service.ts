import type { DatabaseSync } from "node:sqlite";
import { ApiError } from "@/lib/api";
import { all, get, transaction } from "@/lib/db";
import { nowIso } from "@/lib/money";
import type {
  DeliveryZone,
  MenuItem,
  Order,
  OrderEvent,
  OrderItem,
  Quote,
  QuoteItem,
  Vendor,
} from "@/lib/types";
import {
  applyLedgerTransaction,
} from "@/lib/wallet/ledger";
import {
  ensureCustomerAccount,
  ensureVendorAccount,
} from "@/lib/wallet/service";

export const QUOTE_TTL_MINUTES = 30;

export interface CartLineInput {
  menu_item_id: string;
  quantity: number;
}

export interface PricedLine {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price_kobo: number;
  line_total_kobo: number;
}

function mergeItems(items: CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.menu_item_id, (merged.get(item.menu_item_id) ?? 0) + item.quantity);
  }
  return [...merged.entries()].map(([menu_item_id, quantity]) => ({
    menu_item_id,
    quantity,
  }));
}

export function priceCart(
  vendorId: string,
  items: CartLineInput[],
): { lines: PricedLine[]; subtotal_kobo: number } {
  const merged = mergeItems(items);
  if (merged.length === 0) {
    throw new ApiError(422, "EMPTY_CART", "Add at least one item to the cart.");
  }
  if (merged.length > 30) {
    throw new ApiError(422, "CART_TOO_LARGE", "Too many distinct items in one order.");
  }

  const lines: PricedLine[] = [];
  for (const item of merged) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw new ApiError(422, "INVALID_QUANTITY", "Quantities must be between 1 and 20.");
    }
    const menuItem = get<MenuItem>(
      "SELECT * FROM menu_items WHERE id = ? AND vendor_id = ?",
      item.menu_item_id,
      vendorId,
    );
    if (!menuItem || menuItem.archived) {
      throw new ApiError(409, "ITEM_UNAVAILABLE", "An item in your cart is no longer on the menu.");
    }
    if (!menuItem.available) {
      throw new ApiError(409, "ITEM_UNAVAILABLE", `${menuItem.name} is out of stock right now.`);
    }
    lines.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      quantity: item.quantity,
      unit_price_kobo: menuItem.price_kobo,
      line_total_kobo: menuItem.price_kobo * item.quantity,
    });
  }

  const subtotal_kobo = lines.reduce((sum, line) => sum + line.line_total_kobo, 0);
  return { lines, subtotal_kobo };
}

export interface CreateQuoteInput {
  vendor_id: string;
  fulfilment: "pickup" | "delivery";
  zone_id?: string | null;
  delivery_address?: string;
  contact_phone: string;
  items: CartLineInput[];
}

export interface QuoteResult {
  quote: Quote;
  items: QuoteItem[];
  vendor: Pick<Vendor, "id" | "name" | "slug" | "whatsapp" | "address" | "accepting_orders">;
}

export function createQuote(
  customerId: string,
  input: CreateQuoteInput,
): QuoteResult {
  const vendor = get<Vendor>(
    "SELECT * FROM vendors WHERE id = ? AND published_at IS NOT NULL",
    input.vendor_id,
  );
  if (!vendor) {
    throw new ApiError(404, "VENDOR_NOT_FOUND", "That storefront could not be found.");
  }
  if (!vendor.accepting_orders) {
    throw new ApiError(409, "VENDOR_NOT_ACCEPTING", "This vendor is not accepting orders right now.");
  }

  const { lines, subtotal_kobo } = priceCart(vendor.id, input.items);

  let delivery_kobo = 0;
  let zone: DeliveryZone | null = null;
  let address: string | null = null;

  if (input.fulfilment === "delivery") {
    if (!input.zone_id) {
      throw new ApiError(422, "ZONE_REQUIRED", "Choose a delivery zone for this vendor.");
    }
    zone = get<DeliveryZone>(
      "SELECT * FROM delivery_zones WHERE id = ? AND vendor_id = ? AND active = 1",
      input.zone_id,
      vendor.id,
    ) ?? null;
    if (!zone) {
      throw new ApiError(422, "INVALID_ZONE", "That delivery zone is not offered by this vendor.");
    }
    delivery_kobo = zone.fee_kobo;
    address = (input.delivery_address ?? "").trim();
    if (address.length < 5) {
      throw new ApiError(422, "ADDRESS_REQUIRED", "Enter a delivery address.");
    }
  } else {
    address = null;
  }

  const quoteId = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(
    Date.now() + QUOTE_TTL_MINUTES * 60_000,
  ).toISOString();
  const total_kobo = subtotal_kobo + delivery_kobo;
  const contactPhone = input.contact_phone.trim();

  transaction((db) => {
    db.prepare(
      `INSERT INTO quotes
        (id, customer_id, vendor_id, fulfilment, zone_id, zone_name, delivery_address,
         contact_phone, subtotal_kobo, delivery_kobo, total_kobo, expires_at, consumed_order_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    ).run(
      quoteId,
      customerId,
      vendor.id,
      input.fulfilment,
      zone?.id ?? null,
      zone?.name ?? null,
      address,
      contactPhone,
      subtotal_kobo,
      delivery_kobo,
      total_kobo,
      expiresAt,
      createdAt,
    );
    const insertLine = db.prepare(
      `INSERT INTO quote_items (id, quote_id, menu_item_id, name_snapshot, quantity, unit_price_kobo)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const line of lines) {
      insertLine.run(
        crypto.randomUUID(),
        quoteId,
        line.menu_item_id,
        line.name,
        line.quantity,
        line.unit_price_kobo,
      );
    }
  });

  const quote = get<Quote>("SELECT * FROM quotes WHERE id = ?", quoteId)!;
  const quoteItems = all<QuoteItem>(
    "SELECT * FROM quote_items WHERE quote_id = ?",
    quoteId,
  );

  return {
    quote,
    items: quoteItems,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      whatsapp: vendor.whatsapp,
      address: vendor.address,
      accepting_orders: vendor.accepting_orders,
    },
  };
}

export interface PlaceOrderInput {
  quote_id: string;
  idempotency_key: string;
}

export interface PlaceOrderResult {
  order: Order;
  items: OrderItem[];
  duplicate: boolean;
}

export function placeOrder(
  customerId: string,
  input: PlaceOrderInput,
): PlaceOrderResult {
  return transaction((db) => {
    const quote = db
      .prepare("SELECT * FROM quotes WHERE id = ?")
      .get(input.quote_id) as Quote | undefined;
    if (!quote) {
      throw new ApiError(404, "QUOTE_NOT_FOUND", "That quote could not be found.");
    }
    if (quote.customer_id !== customerId) {
      throw new ApiError(403, "FORBIDDEN", "This quote belongs to another customer.");
    }

    const operationKey = `order:${customerId}:${input.idempotency_key}`;
    const requestHash = `quote:${quote.id}`;

    const existingTx = db
      .prepare(
        "SELECT id, request_hash, order_id FROM ledger_transactions WHERE operation_key = ?",
      )
      .get(operationKey) as
      | { id: string; request_hash: string | null; order_id: string | null }
      | undefined;

    if (existingTx) {
      if (existingTx.request_hash !== requestHash) {
        throw new ApiError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This retry key was already used for a different quote.",
        );
      }
      if (existingTx.order_id) {
        const existingOrder = db
          .prepare("SELECT * FROM orders WHERE id = ?")
          .get(existingTx.order_id) as Order | undefined;
        if (existingOrder) {
          return {
            order: existingOrder,
            items: all<OrderItem>(
              "SELECT * FROM order_items WHERE order_id = ?",
              existingOrder.id,
            ),
            duplicate: true,
          };
        }
      }
    }

    if (quote.consumed_order_id) {
      throw new ApiError(
        409,
        "QUOTE_ALREADY_USED",
        "This quote has already been used for an order.",
      );
    }
    if (new Date(quote.expires_at).getTime() < Date.now()) {
      throw new ApiError(
        409,
        "QUOTE_EXPIRED",
        "This quote has expired. Review a fresh quote before paying.",
      );
    }

    const vendor = db
      .prepare("SELECT * FROM vendors WHERE id = ?")
      .get(quote.vendor_id) as Vendor | undefined;
    if (!vendor || !vendor.published_at || !vendor.accepting_orders) {
      throw new ApiError(
        409,
        "VENDOR_NOT_ACCEPTING",
        "This vendor is no longer accepting orders.",
      );
    }

    const quoteItems = db
      .prepare("SELECT * FROM quote_items WHERE quote_id = ?")
      .all(quote.id) as unknown as QuoteItem[];
    if (quoteItems.length === 0) {
      throw new ApiError(409, "QUOTE_STALE", "This quote has no items.");
    }

    let subtotal = 0;
    for (const line of quoteItems) {
      const menuItem = db
        .prepare("SELECT * FROM menu_items WHERE id = ? AND vendor_id = ?")
        .get(line.menu_item_id, quote.vendor_id) as MenuItem | undefined;
      if (!menuItem || menuItem.archived || !menuItem.available) {
        throw new ApiError(
          409,
          "QUOTE_STALE",
          `${line.name_snapshot} is no longer available. Please review a fresh quote.`,
        );
      }
      if (menuItem.price_kobo !== line.unit_price_kobo) {
        throw new ApiError(
          409,
          "QUOTE_STALE",
          `The price of ${line.name_snapshot} changed. Please confirm a fresh quote.`,
        );
      }
      subtotal += line.unit_price_kobo * line.quantity;
    }

    let deliveryFee = 0;
    if (quote.fulfilment === "delivery") {
      const zone = db
        .prepare(
          "SELECT * FROM delivery_zones WHERE id = ? AND vendor_id = ? AND active = 1",
        )
        .get(quote.zone_id, quote.vendor_id) as DeliveryZone | undefined;
      if (!zone) {
        throw new ApiError(
          409,
          "QUOTE_STALE",
          "The selected delivery zone is no longer available.",
        );
      }
      if (zone.fee_kobo !== quote.delivery_kobo) {
        throw new ApiError(
          409,
          "QUOTE_STALE",
          "The delivery fee changed. Please confirm a fresh quote.",
        );
      }
      deliveryFee = zone.fee_kobo;
      if (!quote.delivery_address || quote.delivery_address.trim().length < 5) {
        throw new ApiError(422, "ADDRESS_REQUIRED", "This quote has no delivery address.");
      }
    }

    const total = subtotal + deliveryFee;
    if (
      subtotal !== quote.subtotal_kobo ||
      deliveryFee !== quote.delivery_kobo ||
      total !== quote.total_kobo
    ) {
      throw new ApiError(
        409,
        "QUOTE_STALE",
        "The order total changed. Please confirm a fresh quote.",
      );
    }

    const account = ensureCustomerAccount(db, customerId);
    if (account.balance_kobo < total) {
      throw new ApiError(
        409,
        "INSUFFICIENT_BALANCE",
        "Your demo wallet does not have enough funds for this order.",
        {
          balance_kobo: account.balance_kobo,
          total_kobo: total,
          shortfall_kobo: total - account.balance_kobo,
        },
      );
    }

    const clearing = db
      .prepare("SELECT id FROM wallet_accounts WHERE account_kind = 'demo_clearing' LIMIT 1")
      .get() as { id: string } | undefined;
    if (!clearing) throw new Error("Demo clearing account missing");

    const orderId = crypto.randomUUID();
    const createdAt = nowIso();

    db.prepare(
      `INSERT INTO orders
        (id, quote_id, customer_id, vendor_id, fulfilment, zone_name, delivery_address, contact_phone,
         subtotal_kobo, delivery_kobo, total_kobo, status, payment_status, rejection_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 'held', NULL, ?, ?)`,
    ).run(
      orderId,
      quote.id,
      customerId,
      quote.vendor_id,
      quote.fulfilment,
      quote.zone_name,
      quote.delivery_address,
      quote.contact_phone,
      subtotal,
      deliveryFee,
      total,
      createdAt,
      createdAt,
    );

    const insertOrderItem = db.prepare(
      `INSERT INTO order_items
        (id, order_id, menu_item_id, name_snapshot, quantity, unit_price_kobo, line_total_kobo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const line of quoteItems) {
      insertOrderItem.run(
        crypto.randomUUID(),
        orderId,
        line.menu_item_id,
        line.name_snapshot,
        line.quantity,
        line.unit_price_kobo,
        line.unit_price_kobo * line.quantity,
      );
    }

    db.prepare(
      `INSERT INTO order_events
        (id, order_id, actor_kind, actor_id, previous_status, next_status, reason, created_at)
       VALUES (?, ?, 'customer', ?, NULL, 'submitted', NULL, ?)`,
    ).run(crypto.randomUUID(), orderId, customerId, createdAt);

    applyLedgerTransaction(db, {
      kind: "order_hold",
      initiator_user_id: customerId,
      operation_key: operationKey,
      request_hash: requestHash,
      order_id: orderId,
      note: "Demo payment held for order",
      entries: [
        { account_id: account.id, amount_kobo: -total },
        { account_id: clearing.id, amount_kobo: total },
      ],
    });

    const consumed = db
      .prepare("UPDATE quotes SET consumed_order_id = ? WHERE id = ? AND consumed_order_id IS NULL")
      .run(orderId, quote.id);
    if (consumed.changes !== 1) {
      throw new ApiError(409, "QUOTE_ALREADY_USED", "This quote has already been used.");
    }

    const order = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(orderId) as unknown as Order;

    return {
      order,
      items: all<OrderItem>(
        "SELECT * FROM order_items WHERE order_id = ?",
        orderId,
      ),
      duplicate: false,
    };
  });
}

type Action =
  | "accept"
  | "reject"
  | "cancel"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed";

const VENDOR_RULES: Partial<
  Record<Action, { from: Order["status"][]; to: Order["status"] }>
> = {
  accept: { from: ["submitted"], to: "accepted" },
  reject: { from: ["submitted"], to: "rejected" },
  preparing: { from: ["accepted"], to: "preparing" },
  ready: { from: ["preparing"], to: "ready" },
  out_for_delivery: { from: ["ready"], to: "out_for_delivery" },
};

export function transitionOrder(
  actorId: string,
  orderId: string,
  action: Action,
  reason?: string,
): { order: Order; duplicate: boolean } {
  return transaction((db) => {
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(orderId) as unknown as Order | undefined;
    if (!order) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "That order could not be found.");
    }
    const vendor = db
      .prepare("SELECT * FROM vendors WHERE id = ?")
      .get(order.vendor_id) as Vendor | undefined;
    if (!vendor) throw new Error("Order vendor missing");

    const isCustomer = order.customer_id === actorId;
    const isVendorOwner = vendor.owner_id === actorId;
    if (!isCustomer && !isVendorOwner) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to this order.");
    }

    if (action === "cancel") {
      if (!isCustomer) {
        throw new ApiError(403, "FORBIDDEN", "Only the customer can cancel this order.");
      }
      if (order.status === "cancelled") return { order, duplicate: true };
      if (order.status !== "submitted") {
        throw new ApiError(
          409,
          "INVALID_TRANSITION",
          "Orders can only be cancelled before the vendor accepts them.",
        );
      }
      refundOrder(db, order, actorId, "customer", reason ?? "Cancelled by customer");
      return {
        order: db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as unknown as Order,
        duplicate: false,
      };
    }

    if (!isVendorOwner) {
      throw new ApiError(403, "FORBIDDEN", "Only the vendor can update fulfilment.");
    }

    if (action === "reject") {
      if (order.status === "rejected") return { order, duplicate: true };
      if (order.status !== "submitted") {
        throw new ApiError(
          409,
          "INVALID_TRANSITION",
          "Only a newly submitted order can be rejected.",
        );
      }
      if (!reason || reason.trim().length < 2) {
        throw new ApiError(422, "REASON_REQUIRED", "Give a short reason for rejecting the order.");
      }
      refundOrder(db, order, actorId, "vendor", reason.trim());
      return {
        order: db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as unknown as Order,
        duplicate: false,
      };
    }

    if (action === "completed") {
      if (order.status === "completed") return { order, duplicate: true };
      const validFrom =
        order.fulfilment === "pickup"
          ? order.status === "ready"
          : order.status === "out_for_delivery";
      if (!validFrom) {
        throw new ApiError(
          409,
          "INVALID_TRANSITION",
          order.fulfilment === "pickup"
            ? "A pickup order can be completed once it is ready."
            : "A delivery order must be out for delivery before completion.",
        );
      }
      settleOrder(db, order, actorId);
      return {
        order: db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as unknown as Order,
        duplicate: false,
      };
    }

    const rule = VENDOR_RULES[action];
    if (!rule) {
      throw new ApiError(422, "INVALID_ACTION", "Unknown order action.");
    }
    if (!rule.from.includes(order.status)) {
      throw new ApiError(
        409,
        "INVALID_TRANSITION",
        `Cannot move a ${order.status.replaceAll("_", " ")} order to ${rule.to.replaceAll("_", " ")}.`,
      );
    }
    if (action === "out_for_delivery" && order.fulfilment !== "delivery") {
      throw new ApiError(409, "INVALID_TRANSITION", "Pickup orders are not dispatched.");
    }

    const now = nowIso();
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(
      rule.to,
      now,
      orderId,
    );
    db.prepare(
      `INSERT INTO order_events
        (id, order_id, actor_kind, actor_id, previous_status, next_status, reason, created_at)
       VALUES (?, ?, 'vendor', ?, ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      orderId,
      actorId,
      order.status,
      rule.to,
      reason?.trim() || null,
      now,
    );

    return {
      order: db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as unknown as Order,
      duplicate: false,
    };
  });
}

function refundOrder(
  db: DatabaseSync,
  order: Order,
  actorId: string,
  actorKind: "customer" | "vendor",
  reason: string,
) {
  const customer = ensureCustomerAccount(db, order.customer_id);
  const clearing = db
    .prepare("SELECT id FROM wallet_accounts WHERE account_kind = 'demo_clearing' LIMIT 1")
    .get() as { id: string } | undefined;
  if (!clearing) throw new Error("Demo clearing account missing");

  applyLedgerTransaction(db, {
    kind: "order_refund",
    initiator_user_id: actorId,
    operation_key: `order_refund:${order.id}`,
    request_hash: null,
    order_id: order.id,
    note: reason,
    entries: [
      { account_id: clearing.id, amount_kobo: -order.total_kobo },
      { account_id: customer.id, amount_kobo: order.total_kobo },
    ],
  });

  const now = nowIso();
  const nextStatus = actorKind === "customer" ? "cancelled" : "rejected";
  db.prepare(
    `UPDATE orders
        SET status = ?, payment_status = 'refunded', rejection_reason = ?, updated_at = ?
      WHERE id = ?`,
  ).run(nextStatus, reason, now, order.id);
  db.prepare(
    `INSERT INTO order_events
      (id, order_id, actor_kind, actor_id, previous_status, next_status, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    order.id,
    actorKind,
    actorId,
    order.status,
    nextStatus,
    reason,
    now,
  );
}

function settleOrder(db: DatabaseSync, order: Order, actorId: string) {
  const payable = ensureVendorAccount(db, order.vendor_id);
  const clearing = db
    .prepare("SELECT id FROM wallet_accounts WHERE account_kind = 'demo_clearing' LIMIT 1")
    .get() as { id: string } | undefined;
  if (!clearing) throw new Error("Demo clearing account missing");

  applyLedgerTransaction(db, {
    kind: "order_settlement",
    initiator_user_id: actorId,
    operation_key: `order_settle:${order.id}`,
    request_hash: null,
    order_id: order.id,
    note: "Demo earnings settled to vendor payable",
    entries: [
      { account_id: clearing.id, amount_kobo: -order.total_kobo },
      { account_id: payable.id, amount_kobo: order.total_kobo },
    ],
  });

  const now = nowIso();
  db.prepare(
    "UPDATE orders SET status = 'completed', payment_status = 'settled', updated_at = ? WHERE id = ?",
  ).run(now, order.id);
  db.prepare(
    `INSERT INTO order_events
      (id, order_id, actor_kind, actor_id, previous_status, next_status, reason, created_at)
     VALUES (?, ?, 'vendor', ?, ?, 'completed', NULL, ?)`,
  ).run(crypto.randomUUID(), order.id, actorId, order.status, now);
}

export interface OrderSummary extends Order {
  vendor_name: string;
  vendor_slug: string;
  vendor_emoji: string;
  customer_name: string;
}

export function listCustomerOrders(customerId: string): OrderSummary[] {
  return all<OrderSummary>(
    `SELECT o.*, v.name AS vendor_name, v.slug AS vendor_slug, v.emoji AS vendor_emoji,
            u.display_name AS customer_name
       FROM orders o
       JOIN vendors v ON v.id = o.vendor_id
       JOIN users u ON u.id = o.customer_id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC`,
    customerId,
  );
}

export function listVendorOrders(vendorId: string): OrderSummary[] {
  return all<OrderSummary>(
    `SELECT o.*, v.name AS vendor_name, v.slug AS vendor_slug, v.emoji AS vendor_emoji,
            u.display_name AS customer_name
       FROM orders o
       JOIN vendors v ON v.id = o.vendor_id
       JOIN users u ON u.id = o.customer_id
      WHERE o.vendor_id = ?
      ORDER BY o.created_at DESC`,
    vendorId,
  );
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
  events: OrderEvent[];
  vendor: Pick<Vendor, "id" | "name" | "slug" | "whatsapp" | "address" | "emoji" | "opening_hours">;
  customer_name: string;
}

export function getOrderDetail(
  orderId: string,
  userId: string,
): OrderDetail | null {
  const order = get<Order>("SELECT * FROM orders WHERE id = ?", orderId);
  if (!order) return null;
  const vendor = get<Vendor>("SELECT * FROM vendors WHERE id = ?", order.vendor_id);
  if (!vendor) return null;
  const customer = get<{ display_name: string }>(
    "SELECT display_name FROM users WHERE id = ?",
    order.customer_id,
  );
  const allowed = order.customer_id === userId || vendor.owner_id === userId;
  if (!allowed) return null;

  return {
    order,
    items: all<OrderItem>(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY name_snapshot ASC",
      order.id,
    ),
    events: all<OrderEvent>(
      "SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC",
      order.id,
    ),
    vendor: {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      whatsapp: vendor.whatsapp,
      address: vendor.address,
      emoji: vendor.emoji,
      opening_hours: vendor.opening_hours,
    },
    customer_name: customer?.display_name ?? "Customer",
  };
}

export function findOrderByQuote(quoteId: string): Order | null {
  return get<Order>("SELECT * FROM orders WHERE quote_id = ?", quoteId) ?? null;
}

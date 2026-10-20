export type AccountKind =
  | "customer"
  | "vendor_payable"
  | "demo_source"
  | "demo_clearing";

export type OrderStatus =
  | "submitted"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "rejected"
  | "cancelled";

export type PaymentStatus = "held" | "settled" | "refunded";
export type Fulfilment = "pickup" | "delivery";
export type AuthorKind = "customer" | "vendor" | "assistant" | "system";

export interface User {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  city: string;
  address: string;
  whatsapp: string;
  opening_hours: string;
  accepting_orders: number;
  published_at: string | null;
  emoji: string;
  image_url: string | null;
  is_sample: number;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  vendor_id: string;
  name: string;
  fee_kobo: number;
  active: number;
}

export interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  tags: string;
  image_url: string | null;
  price_kobo: number;
  available: number;
  archived: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  vendor_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  author_kind: AuthorKind;
  body: string;
  metadata_json: string | null;
  created_at: string;
}

export interface Quote {
  id: string;
  customer_id: string;
  vendor_id: string;
  fulfilment: Fulfilment;
  zone_id: string | null;
  zone_name: string | null;
  delivery_address: string | null;
  contact_phone: string;
  subtotal_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  expires_at: string;
  consumed_order_id: string | null;
  created_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  menu_item_id: string;
  name_snapshot: string;
  quantity: number;
  unit_price_kobo: number;
}

export interface Order {
  id: string;
  quote_id: string;
  customer_id: string;
  vendor_id: string;
  fulfilment: Fulfilment;
  zone_name: string | null;
  delivery_address: string | null;
  contact_phone: string;
  subtotal_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  quantity: number;
  unit_price_kobo: number;
  line_total_kobo: number;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  actor_kind: string;
  actor_id: string | null;
  previous_status: string | null;
  next_status: string;
  reason: string | null;
  created_at: string;
}

export interface WalletAccount {
  id: string;
  owner_user_id: string | null;
  vendor_id: string | null;
  account_kind: AccountKind;
  currency: string;
  mode: string;
  balance_kobo: number;
}

export interface LedgerEntryWithTransaction {
  entry_id: string;
  transaction_id: string;
  amount_kobo: number;
  kind: string;
  note: string | null;
  order_id: string | null;
  created_at: string;
}

export interface AssistantCartItem {
  menu_item_id: string;
  quantity: number;
  name?: string;
  unit_price_kobo?: number;
}

export interface AssistantSuggestion {
  intent: "draft_order" | "discovery" | "clarify" | "none";
  vendor_id?: string;
  items: AssistantCartItem[];
  fulfilment: Fulfilment | null;
  clarifications: string[];
  message: string;
  options?: AssistantDiscoveryOption[];
  source: "model" | "local";
}

export interface AssistantDiscoveryOption {
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  items: { menu_item_id: string; name: string; quantity: number; unit_price_kobo: number }[];
  subtotal_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  zone_id: string | null;
  zone_name: string | null;
  note?: string;
}

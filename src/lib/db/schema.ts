export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Fast food',
  city TEXT NOT NULL DEFAULT 'Otukpo',
  address TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  opening_hours TEXT NOT NULL DEFAULT '',
  accepting_orders INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  emoji TEXT NOT NULL DEFAULT '🍲',
  image_url TEXT,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vendors_published ON vendors(published_at);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee_kobo INTEGER NOT NULL CHECK (fee_kobo >= 0),
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_zones_vendor ON delivery_zones(vendor_id);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  price_kobo INTEGER NOT NULL CHECK (price_kobo >= 0),
  available INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_menu_vendor ON menu_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(available, archived);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(customer_id, vendor_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor ON conversations(vendor_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES users(id),
  author_kind TEXT NOT NULL CHECK (author_kind IN ('customer','vendor','assistant','system')),
  body TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  fulfilment TEXT NOT NULL CHECK (fulfilment IN ('pickup','delivery')),
  zone_id TEXT REFERENCES delivery_zones(id),
  zone_name TEXT,
  delivery_address TEXT,
  contact_phone TEXT NOT NULL,
  subtotal_kobo INTEGER NOT NULL CHECK (subtotal_kobo >= 0),
  delivery_kobo INTEGER NOT NULL CHECK (delivery_kobo >= 0),
  total_kobo INTEGER NOT NULL CHECK (total_kobo >= 0),
  expires_at TEXT NOT NULL,
  consumed_order_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id, created_at);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kobo INTEGER NOT NULL CHECK (unit_price_kobo >= 0)
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  fulfilment TEXT NOT NULL CHECK (fulfilment IN ('pickup','delivery')),
  zone_name TEXT,
  delivery_address TEXT,
  contact_phone TEXT NOT NULL,
  subtotal_kobo INTEGER NOT NULL,
  delivery_kobo INTEGER NOT NULL,
  total_kobo INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted','accepted','preparing','ready','out_for_delivery','completed','rejected','cancelled')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('held','settled','refunded')),
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kobo INTEGER NOT NULL,
  line_total_kobo INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_kind TEXT NOT NULL,
  actor_id TEXT,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id),
  vendor_id TEXT REFERENCES vendors(id),
  account_kind TEXT NOT NULL CHECK (account_kind IN ('customer','vendor_payable','demo_source','demo_clearing')),
  currency TEXT NOT NULL DEFAULT 'NGN',
  mode TEXT NOT NULL DEFAULT 'demo',
  balance_kobo INTEGER NOT NULL DEFAULT 0,
  CHECK (account_kind = 'demo_source' OR balance_kobo >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_customer ON wallet_accounts(owner_user_id) WHERE account_kind = 'customer';
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_vendor ON wallet_accounts(vendor_id) WHERE account_kind = 'vendor_payable';

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  initiator_user_id TEXT REFERENCES users(id),
  operation_key TEXT UNIQUE,
  request_hash TEXT,
  order_id TEXT REFERENCES orders(id),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_order ON ledger_transactions(order_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES ledger_transactions(id),
  account_id TEXT NOT NULL REFERENCES wallet_accounts(id),
  amount_kobo INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id, transaction_id);
`;

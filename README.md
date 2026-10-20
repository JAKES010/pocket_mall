# OrderDesk

An AI-assisted fast-food marketplace for Otukpo, built as a working demo for
the Talent Nation AI Rebuild Challenge (21 October 2026).

Customers can discover vendors, describe a meal to an assistant, review a
server-priced quote, pay from a simulated wallet, track fulfilment, and message
the vendor. Vendors can open a storefront, manage a menu and delivery zones, and
work incoming orders through to settlement.

**Everything is demo data.** No real payments, payouts or food deliveries occur.

## Run it

Requires **Node.js 22+** (the app uses the built-in `node:sqlite` module).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The SQLite database (`data/orderdesk.db`) is
created and seeded automatically on first request. The `ExperimentalWarning:
SQLite is an experimental feature` line in the terminal is expected.

Production check:

```bash
npm run build
npm start
```

## Demo accounts

Password for every seeded account: `demo1234`

| Role | Email | Notes |
| --- | --- | --- |
| Customer | `customer@demo.orderdesk` | Ada Customer · ₦25,000 demo wallet |
| Vendor | `mama@demo.orderdesk` | Mama Ngozi's Kitchen · accepting orders |
| Vendor | `grill@demo.orderdesk` | Otukpo Grill House |
| Vendor | `burger@demo.orderdesk` | Campus Burger & Chips |
| Vendor | `idoma@demo.orderdesk` | Idoma Delicacy Pot |
| Vendor | `sunrise@demo.orderdesk` | Sunrise Pastries & Shawarma · paused |

The sign-in page also has one-click buttons for the customer and Mama Ngozi.

## Suggested demo (two browser windows)

Use a normal window for the customer and a private window for the vendor.

1. **Discover.** On the marketplace, type:
   *“Rice and chicken for two people, under ₦6,000 including delivery.”*
   The assistant returns real catalogue options; Mama Ngozi's 2× Rice & Chicken
   Combo comes to **₦5,900 including delivery**. The source chip says
   “Model-assisted” when a Claude key is configured, otherwise “Local
   assistant”.
2. **Review.** Choose *Use this cart*, open checkout, pick the Campus zone, and
   get a server quote. Point out that every price and the delivery fee come from
   the quote, not the browser.
3. **Pay.** Pay with demo funds. The balance drops immediately and the money sits
   in a demo clearing account; no order exists until the quote revalidates.
4. **Vendor side.** Sign in as Mama in the second window. The order appears in
   the vendor desk. Accept → preparing → ready → send for delivery → delivered.
5. **Settlement.** The customer's order shows *settled*; the vendor's payable
   balance increases by the full order total. Every ledger transaction balances
   to zero.
6. **Refund path (optional).** Place another order, then cancel it as the
   customer or reject it as the vendor. The demo wallet is refunded automatically.
7. **Messaging (optional).** From the storefront, open *Message vendor*; the
   customer and vendor can chat, and the customer can ask the in-chat assistant
   to adjust the draft (“make it three in total”).

## What is implemented

- Marketplace search across vendors and menu items.
- Vendor onboarding, storefront settings, publish/unpublish, open/paused toggle.
- Menu manager with prices, stock status and archiving.
- AI discovery and in-chat order drafting with structured outputs; deterministic
  local fallback when no model key is present.
- Server-issued quotes (30-minute TTL) with item snapshotting and revalidation
  at payment time.
- Double-entry demo ledger: top-ups, held payments, refunds, vendor settlement.
- Atomic order placement with idempotency keys and request hashing.
- Order state machine and status history for customers and vendors.
- Cookie sessions, scrypt password hashing, ownership checks and basic rate
  limiting.
- Polling chat (4 seconds) instead of websockets, so the demo needs no extra
  infrastructure.

## AI configuration (optional)

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` to enable the
Claude-backed assistant:

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5-5
```

Without a key, the app uses a deterministic local parser and labels results as
“Local assistant” in the UI. This is deliberate: the demo must work offline.

If you intentionally want to use an ambient `ANTHROPIC_AUTH_TOKEN` instead of
`ANTHROPIC_API_KEY` (for example inside a managed environment), also set:

```bash
ORDERDESK_ENABLE_MODEL=1
```

Set `ORDERDESK_DISABLE_MODEL=1` to force local mode.

The model only proposes menu item IDs and quantities. The server validates the
IDs against the vendor's catalogue and computes every price; model output never
sets a price, takes payment, or mutates an order directly.

## Data and reset

- Database: `data/orderdesk.db` by default; override with `ORDERDESK_DB`.
- Reset to the seeded demo state:

```bash
rm -f data/orderdesk.db data/orderdesk.db-wal data/orderdesk.db-shm
npm run dev
```

- Seeds run only when the database has no users, so restarts preserve state.
- Wallet balances are cached alongside append-only ledger entries. Each
  transaction's entries sum to zero.

## Money and time

- All amounts are integer **kobo** (₦1 = 100 kobo).
- Display formatting uses NGN; times are shown in `Africa/Lagos`.
- Seed amounts are in naira and converted at insert time.

## Project shape

```
src/app/                 routes (marketplace, checkout, orders, messages, sell, APIs)
src/components/          client UI (cart, checkout, chat, vendor tools)
src/lib/db/              schema, seed, SQLite singleton
src/lib/orders/          quoting, atomic order placement, transitions
src/lib/wallet/          double-entry ledger and wallet operations
src/lib/ai/              Claude adapter + deterministic local fallback
src/lib/*/service.ts     catalogue, conversations, auth helpers
```

## Known limitations

- Single-process SQLite and in-memory rate limiting are demo-grade, not
  horizontally scalable.
- Sessions are stored in SQLite and expire after seven days.
- Chat uses polling, not push.
- The demo wallet is funded from an explicitly negative demo source account; it
  is not a real financial ledger.
- Seed vendors and dishes are fictional.

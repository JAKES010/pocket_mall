import type { DatabaseSync } from "node:sqlite";
import { ApiError } from "@/lib/api";
import { all, get, transaction } from "@/lib/db";
import { nowIso } from "@/lib/money";
import type {
  LedgerEntryWithTransaction,
  WalletAccount,
} from "@/lib/types";
import { applyLedgerTransaction } from "./ledger";

export const MAX_TOP_UP_KOBO = 5_000_000;

export function customerAccountId(userId: string): string {
  return `wa_customer_${userId}`;
}

export function vendorAccountId(vendorId: string): string {
  return `wa_payable_${vendorId}`;
}

export function ensureCustomerAccount(
  db: DatabaseSync,
  userId: string,
): WalletAccount {
  const existingByOwner = db
    .prepare(
      "SELECT * FROM wallet_accounts WHERE owner_user_id = ? AND account_kind = 'customer'",
    )
    .get(userId) as unknown as WalletAccount | undefined;
  if (existingByOwner) return existingByOwner;

  const id = customerAccountId(userId);
  const existing = db
    .prepare("SELECT * FROM wallet_accounts WHERE id = ?")
    .get(id) as unknown as WalletAccount | undefined;
  if (existing) return existing;

  db.prepare(
    `INSERT INTO wallet_accounts (id, owner_user_id, vendor_id, account_kind, currency, mode, balance_kobo)
     VALUES (?, ?, NULL, 'customer', 'NGN', 'demo', 0)`,
  ).run(id, userId);
  return db
    .prepare("SELECT * FROM wallet_accounts WHERE id = ?")
    .get(id) as unknown as WalletAccount;
}

export function ensureVendorAccount(
  db: DatabaseSync,
  vendorId: string,
): WalletAccount {
  const id = vendorAccountId(vendorId);
  const existing = db
    .prepare("SELECT * FROM wallet_accounts WHERE id = ?")
    .get(id) as WalletAccount | undefined;
  if (existing) return existing;

  db.prepare(
    `INSERT INTO wallet_accounts (id, owner_user_id, vendor_id, account_kind, currency, mode, balance_kobo)
     VALUES (?, NULL, ?, 'vendor_payable', 'NGN', 'demo', 0)`,
  ).run(id, vendorId);
  return db
    .prepare("SELECT * FROM wallet_accounts WHERE id = ?")
    .get(id) as unknown as WalletAccount;
}

export function getCustomerAccount(userId: string): WalletAccount {
  return transaction((db) => ensureCustomerAccount(db, userId));
}

export function getVendorAccount(vendorId: string): WalletAccount {
  return transaction((db) => ensureVendorAccount(db, vendorId));
}

export function getWalletHistory(
  accountId: string,
  limit = 50,
): LedgerEntryWithTransaction[] {
  return all<LedgerEntryWithTransaction>(
    `SELECT e.id AS entry_id, e.transaction_id, e.amount_kobo,
            t.kind, t.note, t.order_id, t.created_at
       FROM ledger_entries e
       JOIN ledger_transactions t ON t.id = e.transaction_id
      WHERE e.account_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?`,
    accountId,
    limit,
  );
}

export function getWalletSummary(userId: string) {
  const account = getCustomerAccount(userId);
  return {
    account,
    entries: getWalletHistory(account.id),
  };
}

export function topUpWallet(
  userId: string,
  amountKobo: number,
  idempotencyKey: string,
) {
  if (amountKobo < 10_000 || amountKobo > MAX_TOP_UP_KOBO) {
    throw new ApiError(
      422,
      "INVALID_AMOUNT",
      "Test top-ups must be between ₦100 and ₦50,000.",
    );
  }

  return transaction((db) => {
    const account = ensureCustomerAccount(db, userId);
    const operationKey = `topup:${userId}:${idempotencyKey}`;
    const result = applyLedgerTransaction(db, {
      kind: "demo_top_up",
      initiator_user_id: userId,
      operation_key: operationKey,
      request_hash: `amount:${amountKobo}`,
      order_id: null,
      note: "Demo wallet test top-up",
      entries: [
        { account_id: "wa_demo_source", amount_kobo: -amountKobo },
        { account_id: account.id, amount_kobo: amountKobo },
      ],
    });

    const fresh = db
      .prepare("SELECT balance_kobo FROM wallet_accounts WHERE id = ?")
      .get(account.id) as { balance_kobo: number };

    return {
      balance_kobo: fresh.balance_kobo,
      transaction_id: result.transaction_id,
      duplicate: !result.created,
    };
  });
}

export interface VendorEarnings {
  payable_balance_kobo: number;
  completed_orders: number;
  completed_gross_kobo: number;
}

export function getVendorEarnings(vendorId: string): VendorEarnings {
  const account = getVendorAccount(vendorId);
  const stats = get<{ completed_orders: number; completed_gross_kobo: number }>(
    `SELECT COUNT(*) AS completed_orders,
            COALESCE(SUM(total_kobo), 0) AS completed_gross_kobo
       FROM orders WHERE vendor_id = ? AND status = 'completed'`,
    vendorId,
  );
  return {
    payable_balance_kobo: account.balance_kobo,
    completed_orders: stats?.completed_orders ?? 0,
    completed_gross_kobo: stats?.completed_gross_kobo ?? 0,
  };
}

export function getInternalAccount(kind: "demo_source" | "demo_clearing") {
  return get<WalletAccount>(
    "SELECT * FROM wallet_accounts WHERE account_kind = ? LIMIT 1",
    kind,
  );
}

export function reconcileAccount(accountId: string): {
  cached_kobo: number;
  ledger_kobo: number;
} {
  const cached = get<{ balance_kobo: number }>(
    "SELECT balance_kobo FROM wallet_accounts WHERE id = ?",
    accountId,
  );
  const ledger = get<{ total: number }>(
    "SELECT COALESCE(SUM(amount_kobo), 0) AS total FROM ledger_entries WHERE account_id = ?",
    accountId,
  );
  return {
    cached_kobo: cached?.balance_kobo ?? 0,
    ledger_kobo: ledger?.total ?? 0,
  };
}

export { nowIso };

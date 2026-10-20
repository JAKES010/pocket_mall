import type { DatabaseSync } from "node:sqlite";
import { ApiError } from "@/lib/api";
import { nowIso } from "@/lib/money";

export interface LedgerEntryInput {
  account_id: string;
  amount_kobo: number;
}

export interface LedgerTransactionInput {
  kind: string;
  initiator_user_id: string | null;
  operation_key: string;
  request_hash: string | null;
  order_id: string | null;
  note: string | null;
  entries: LedgerEntryInput[];
}

export interface LedgerResult {
  transaction_id: string;
  created: boolean;
  balance_kobo?: number;
}

/**
 * Append-only double-entry write. Every transaction must sum to zero.
 * Balances are cached in wallet_accounts and updated in the same SQL
 * transaction; the CHECK constraint prevents non-demo accounts going negative.
 */
export function applyLedgerTransaction(
  db: DatabaseSync,
  input: LedgerTransactionInput,
): LedgerResult {
  const sum = input.entries.reduce((total, entry) => total + entry.amount_kobo, 0);
  if (sum !== 0) {
    throw new Error(`Unbalanced ledger transaction: ${sum}`);
  }

  const existing = db
    .prepare(
      "SELECT id, request_hash FROM ledger_transactions WHERE operation_key = ?",
    )
    .get(input.operation_key) as
    | { id: string; request_hash: string | null }
    | undefined;

  if (existing) {
    if (
      input.request_hash !== null &&
      existing.request_hash !== null &&
      existing.request_hash !== input.request_hash
    ) {
      throw new ApiError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This retry key was already used with a different request.",
      );
    }
    return { transaction_id: existing.id, created: false };
  }

  const transactionId = crypto.randomUUID();
  const createdAt = nowIso();

  db.prepare(
    `INSERT INTO ledger_transactions
      (id, kind, initiator_user_id, operation_key, request_hash, order_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    transactionId,
    input.kind,
    input.initiator_user_id,
    input.operation_key,
    input.request_hash,
    input.order_id,
    input.note,
    createdAt,
  );

  const insertEntry = db.prepare(
    "INSERT INTO ledger_entries (id, transaction_id, account_id, amount_kobo) VALUES (?, ?, ?, ?)",
  );
  const updateBalance = db.prepare(
    "UPDATE wallet_accounts SET balance_kobo = balance_kobo + ? WHERE id = ?",
  );

  for (const entry of input.entries) {
    const account = db
      .prepare(
        "SELECT id, account_kind FROM wallet_accounts WHERE id = ?",
      )
      .get(entry.account_id) as
      | { id: string; account_kind: string }
      | undefined;
    if (!account) {
      throw new Error(`Unknown wallet account: ${entry.account_id}`);
    }
    insertEntry.run(
      crypto.randomUUID(),
      transactionId,
      entry.account_id,
      entry.amount_kobo,
    );
    updateBalance.run(entry.amount_kobo, entry.account_id);
  }

  return { transaction_id: transactionId, created: true };
}

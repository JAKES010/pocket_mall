import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";

const globalForDb = globalThis as unknown as {
  __orderdeskDb?: DatabaseSync;
};

export function getDb(): DatabaseSync {
  if (globalForDb.__orderdeskDb) return globalForDb.__orderdeskDb;

  const file =
    process.env.ORDERDESK_DB ||
    path.join(process.cwd(), "data", "orderdesk.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  db.exec(SCHEMA_SQL);
  seedDatabase(db);
  globalForDb.__orderdeskDb = db;
  return db;
}

export function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  const rows = getDb().prepare(sql).all(...params);
  // node:sqlite returns null-prototype rows, which cannot cross the
  // server/client component boundary. Spread them into plain objects.
  return rows.map((row) => ({ ...row })) as unknown as T[];
}

export function get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  const row = getDb().prepare(sql).get(...params);
  return row ? ({ ...row } as unknown as T) : undefined;
}

export function run(sql: string, ...params: SQLInputValue[]) {
  return getDb().prepare(sql).run(...params);
}

export function transaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore rollback failure; the original error is more useful
    }
    throw error;
  }
}

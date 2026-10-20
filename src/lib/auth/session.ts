import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { get, run } from "@/lib/db";
import type { User, Vendor } from "@/lib/types";

export const SESSION_COOKIE = "orderdesk_session";
const SESSION_DAYS = 7;

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  run(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    token,
    userId,
    createdAt.toISOString(),
    expiresAt.toISOString(),
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    run("DELETE FROM sessions WHERE token = ?", token);
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = get<User & { token: string; expires_at: string }>(
    `SELECT u.id, u.email, u.display_name, u.phone, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    token,
  );
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    run("DELETE FROM sessions WHERE token = ?", token);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    phone: row.phone,
    created_at: row.created_at,
  };
}

export function getVendorForOwner(userId: string): Vendor | null {
  return (
    get<Vendor>("SELECT * FROM vendors WHERE owner_id = ?", userId) ?? null
  );
}

export function getVendorById(id: string): Vendor | null {
  return get<Vendor>("SELECT * FROM vendors WHERE id = ?", id) ?? null;
}

export function getVendorBySlug(slug: string): Vendor | null {
  return get<Vendor>("SELECT * FROM vendors WHERE slug = ?", slug) ?? null;
}

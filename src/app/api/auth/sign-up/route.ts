import { fail, ok, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { get, transaction } from "@/lib/db";
import { nowIso } from "@/lib/money";
import { parseWith, signUpSchema } from "@/lib/validation";
import { ensureCustomerAccount } from "@/lib/wallet/service";

export async function POST(request: Request) {
  try {
    const input = parseWith(signUpSchema, await readJson(request));
    const existing = get<{ id: string }>(
      "SELECT id FROM users WHERE email = ?",
      input.email,
    );
    if (existing) {
      return ok(
        { error: { code: "EMAIL_TAKEN", message: "An account with that email already exists." } },
        409,
      );
    }

    const userId = crypto.randomUUID();
    const createdAt = nowIso();
    transaction((db) => {
      db.prepare(
        "INSERT INTO users (id, email, password_hash, display_name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        userId,
        input.email,
        hashPassword(input.password),
        input.display_name,
        input.phone ?? null,
        createdAt,
      );
      ensureCustomerAccount(db, userId);
    });
    await createSession(userId);

    return ok(
      {
        user: {
          id: userId,
          email: input.email,
          display_name: input.display_name,
          phone: input.phone ?? null,
        },
      },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}

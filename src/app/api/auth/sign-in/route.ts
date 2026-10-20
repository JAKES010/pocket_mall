import { fail, ok, readJson } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { get } from "@/lib/db";
import { parseWith, signInSchema } from "@/lib/validation";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const input = parseWith(signInSchema, await readJson(request));
    const user = get<User & { password_hash: string }>(
      "SELECT * FROM users WHERE email = ?",
      input.email,
    );
    if (!user || !verifyPassword(input.password, user.password_hash)) {
      return ok(
        { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } },
        401,
      );
    }
    await createSession(user.id);
    return ok({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

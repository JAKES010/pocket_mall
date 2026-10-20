import { fail, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  try {
    await destroySession();
    return ok({ signedOut: true });
  } catch (error) {
    return fail(error);
  }
}

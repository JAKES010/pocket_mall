import { fail, ok, readJson, requireUser } from "@/lib/api";
import { parseWith, topUpSchema } from "@/lib/validation";
import {
  getCustomerAccount,
  getWalletHistory,
  topUpWallet,
} from "@/lib/wallet/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = parseWith(topUpSchema, await readJson(request));
    const result = topUpWallet(
      user.id,
      input.amount_kobo,
      input.idempotency_key,
    );
    const entries = getWalletHistory(
      getCustomerAccount(user.id).id,
    );
    return ok({ ...result, entries });
  } catch (error) {
    return fail(error);
  }
}

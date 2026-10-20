import { fail, ok, requireUser } from "@/lib/api";
import {
  getWalletHistory,
  getWalletSummary,
  MAX_TOP_UP_KOBO,
} from "@/lib/wallet/service";

export async function GET() {
  try {
    const user = await requireUser();
    const summary = getWalletSummary(user.id);
    return ok({
      balance_kobo: summary.account.balance_kobo,
      account_id: summary.account.id,
      mode: "demo",
      currency: "NGN",
      limit_kobo: MAX_TOP_UP_KOBO,
      entries: summary.entries,
    });
  } catch (error) {
    return fail(error);
  }
}

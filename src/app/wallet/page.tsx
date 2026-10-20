import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui";
import { WalletClient } from "@/components/wallet-client";
import { getCurrentUser } from "@/lib/auth/session";
import { getWalletSummary, MAX_TOP_UP_KOBO } from "@/lib/wallet/service";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fwallet");

  const summary = getWalletSummary(user.id);

  return (
    <div>
      <PageHeading eyebrow="Demo money" title="Your wallet">
        Pay for orders from one simulated NGN balance. No card, bank transfer or
        real money is involved.
      </PageHeading>
      <WalletClient
        initialBalanceKobo={summary.account.balance_kobo}
        initialEntries={summary.entries}
        limitKobo={MAX_TOP_UP_KOBO}
      />
    </div>
  );
}

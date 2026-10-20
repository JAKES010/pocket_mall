import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/onboarding-client";
import { PageHeading } from "@/components/ui";
import { getCurrentUser, getVendorForOwner } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function VendorOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsell%2Fonboarding");
  if (getVendorForOwner(user.id)) redirect("/sell");

  return (
    <div>
      <Link href="/" className="btn-ghost btn-sm -ml-2 mb-2">
        ← Back to marketplace
      </Link>
      <PageHeading eyebrow="Sell on OrderDesk" title="Open your storefront">
        Set up your kitchen, delivery zones and first dish in one pass. You can
        edit everything later. This is a prototype — storefronts and payouts are
        simulated.
      </PageHeading>
      <OnboardingClient />
    </div>
  );
}

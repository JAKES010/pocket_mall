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
    <div className="onboarding-page">
      <Link href="/" className="btn-ghost btn-sm -ml-2 mb-2">← Back to marketplace</Link>
      <PageHeading eyebrow="SELL ON ORDERDESK" title="Set up your kitchen">
        Add your business details, delivery zones and first dish. New kitchens
        stay hidden until an operator verifies their listing. This preview uses
        sample orders and simulated wallet funds.
      </PageHeading>
      <OnboardingClient />
    </div>
  );
}

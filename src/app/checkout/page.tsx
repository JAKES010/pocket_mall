import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/checkout-client";
import { PageHeading } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fcheckout");

  return (
    <div>
      <Link href="/" className="btn-ghost btn-sm -ml-2 mb-2">
        ← Keep browsing
      </Link>
      <PageHeading eyebrow="Checkout" title="Review & pay">
        Prices, delivery fees and totals come from a server-issued quote. Your
        demo wallet holds test funds only.
      </PageHeading>
      <CheckoutClient initialPhone={user.phone ?? ""} />
    </div>
  );
}

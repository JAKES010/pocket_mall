import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileManager } from "@/components/profile-manager";
import { PageHeading } from "@/components/ui";
import { getCurrentUser, getVendorForOwner } from "@/lib/auth/session";
import { getZones } from "@/lib/catalogue/service";

export const dynamic = "force-dynamic";

export default async function VendorProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsell%2Fprofile");

  const vendor = getVendorForOwner(user.id);
  if (!vendor) redirect("/sell/onboarding");

  const zones = getZones(vendor.id, true);

  return (
    <div>
      <Link href="/sell" className="btn-ghost btn-sm -ml-2 mb-2">
        ← Vendor desk
      </Link>
      <PageHeading eyebrow={vendor.name} title="Storefront settings">
        Update what customers see, manage delivery zones and publish or hide your
        storefront.
      </PageHeading>
      <ProfileManager vendor={vendor} zones={zones} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { MenuManager } from "@/components/menu-manager";
import { PageHeading } from "@/components/ui";
import { getCurrentUser, getVendorForOwner } from "@/lib/auth/session";
import { getMenuItems } from "@/lib/catalogue/service";

export const dynamic = "force-dynamic";

export default async function VendorMenuPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsell%2Fmenu");

  const vendor = getVendorForOwner(user.id);
  if (!vendor) redirect("/sell/onboarding");

  const items = getMenuItems(vendor.id, true);

  return (
    <div>
      <Link href="/sell" className="btn-ghost btn-sm -ml-2 mb-2">
        ← Vendor desk
      </Link>
      <PageHeading eyebrow={vendor.name} title="Menu manager">
        Prices you save here are used by the server on every new quote. Archived
        dishes disappear from your storefront but stay on past order receipts.
      </PageHeading>
      <MenuManager vendorId={vendor.id} items={items} />
    </div>
  );
}

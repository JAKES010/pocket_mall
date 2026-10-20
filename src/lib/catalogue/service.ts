import { all, get } from "@/lib/db";
import type { DeliveryZone, MenuItem, Vendor } from "@/lib/types";

export interface VendorCard extends Vendor {
  min_price_kobo: number | null;
  item_count: number;
}

export interface VendorPublic extends Vendor {
  zones: DeliveryZone[];
  menu: MenuItem[];
}

export function listPublishedVendors(options?: {
  q?: string;
  acceptingOnly?: boolean;
}): VendorCard[] {
  const q = (options?.q ?? "").trim();
  const acceptingOnly = options?.acceptingOnly ?? false;
  const like = `%${q}%`;

  const conditions = ["v.published_at IS NOT NULL"];
  const params: (string | number)[] = [];

  if (q) {
    conditions.push(`(
      v.name LIKE ? OR v.description LIKE ? OR v.address LIKE ?
      OR EXISTS (
        SELECT 1 FROM menu_items m
        WHERE m.vendor_id = v.id AND m.archived = 0
          AND (m.name LIKE ? OR m.tags LIKE ? OR m.description LIKE ?)
      )
    )`);
    params.push(like, like, like, like, like, like);
  }
  if (acceptingOnly) {
    conditions.push("v.accepting_orders = 1");
  }

  return all<VendorCard>(
    `SELECT v.*,
       (SELECT MIN(m.price_kobo) FROM menu_items m
         WHERE m.vendor_id = v.id AND m.archived = 0 AND m.available = 1) AS min_price_kobo,
       (SELECT COUNT(*) FROM menu_items m
         WHERE m.vendor_id = v.id AND m.archived = 0 AND m.available = 1) AS item_count
     FROM vendors v
     WHERE ${conditions.join(" AND ")}
     ORDER BY v.accepting_orders DESC, v.name ASC`,
    ...params,
  );
}

export function getPublicVendorBySlug(slug: string): VendorPublic | null {
  const vendor = get<Vendor>(
    "SELECT * FROM vendors WHERE slug = ? AND published_at IS NOT NULL",
    slug,
  );
  if (!vendor) return null;
  return decorateVendor(vendor);
}

export function getPublicVendorById(id: string): VendorPublic | null {
  const vendor = get<Vendor>(
    "SELECT * FROM vendors WHERE id = ? AND published_at IS NOT NULL",
    id,
  );
  if (!vendor) return null;
  return decorateVendor(vendor);
}

function decorateVendor(vendor: Vendor): VendorPublic {
  const zones = all<DeliveryZone>(
    "SELECT * FROM delivery_zones WHERE vendor_id = ? AND active = 1 ORDER BY fee_kobo ASC",
    vendor.id,
  );
  const menu = all<MenuItem>(
    `SELECT * FROM menu_items
      WHERE vendor_id = ? AND archived = 0
      ORDER BY available DESC, name ASC`,
    vendor.id,
  );
  return { ...vendor, zones, menu };
}

export function getMenuItems(
  vendorId: string,
  includeArchived = false,
): MenuItem[] {
  if (includeArchived) {
    return all<MenuItem>(
      "SELECT * FROM menu_items WHERE vendor_id = ? ORDER BY archived ASC, name ASC",
      vendorId,
    );
  }
  return all<MenuItem>(
    "SELECT * FROM menu_items WHERE vendor_id = ? AND archived = 0 ORDER BY available DESC, name ASC",
    vendorId,
  );
}

export function getZones(vendorId: string, includeInactive = false): DeliveryZone[] {
  return all<DeliveryZone>(
    includeInactive
      ? "SELECT * FROM delivery_zones WHERE vendor_id = ? ORDER BY name ASC"
      : "SELECT * FROM delivery_zones WHERE vendor_id = ? AND active = 1 ORDER BY fee_kobo ASC",
    vendorId,
  );
}

export function getMenuItemsByIds(vendorId: string, ids: string[]): MenuItem[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  return all<MenuItem>(
    `SELECT * FROM menu_items WHERE vendor_id = ? AND id IN (${placeholders})`,
    vendorId,
    ...ids,
  );
}

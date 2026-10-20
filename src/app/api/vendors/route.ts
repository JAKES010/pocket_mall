import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { listPublishedVendors } from "@/lib/catalogue/service";
import { get, transaction } from "@/lib/db";
import { ensureVendorAccount } from "@/lib/wallet/service";
import { parseWith, vendorCreateSchema } from "@/lib/validation";
import type { Vendor } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const acceptingOnly = url.searchParams.get("accepting") === "1";
    return ok({ vendors: listPublishedVendors({ q, acceptingOnly }) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = parseWith(vendorCreateSchema, await readJson(request));

    if (get("SELECT id FROM vendors WHERE owner_id = ?", user.id)) {
      throw new ApiError(409, "VENDOR_EXISTS", "You already manage a storefront.");
    }
    if (get("SELECT id FROM vendors WHERE slug = ?", input.slug)) {
      throw new ApiError(409, "SLUG_TAKEN", "That storefront link is already in use.");
    }

    const vendorId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    transaction((db) => {
      db.prepare(
        `INSERT INTO vendors
          (id, owner_id, slug, name, description, category, city, address, whatsapp,
           opening_hours, accepting_orders, published_at, emoji, image_url, is_sample, created_at)
         VALUES (?, ?, ?, ?, ?, 'Fast food', 'Otukpo', ?, ?, ?, 1, NULL, ?, NULL, 0, ?)`,
      ).run(
        vendorId,
        user.id,
        input.slug,
        input.name,
        input.description,
        input.address,
        input.whatsapp,
        input.opening_hours,
        input.emoji,
        createdAt,
      );
      const insertZone = db.prepare(
        "INSERT INTO delivery_zones (id, vendor_id, name, fee_kobo, active) VALUES (?, ?, ?, ?, 1)",
      );
      for (const zone of input.zones) {
        insertZone.run(crypto.randomUUID(), vendorId, zone.name, zone.fee_kobo);
      }
      ensureVendorAccount(db, vendorId);
    });

    return ok(
      { vendor: get<Vendor>("SELECT * FROM vendors WHERE id = ?", vendorId) },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}

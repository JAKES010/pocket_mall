import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { getVendorForOwner } from "@/lib/auth/session";
import { get, run } from "@/lib/db";
import { nowIso } from "@/lib/money";
import { menuItemCreateSchema, parseWith } from "@/lib/validation";
import type { MenuItem } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const vendor = getVendorForOwner(user.id);
    if (!vendor || vendor.id !== id) {
      throw new ApiError(403, "FORBIDDEN", "You do not manage this storefront.");
    }
    const input = parseWith(menuItemCreateSchema, await readJson(request));
    const itemId = crypto.randomUUID();
    run(
      `INSERT INTO menu_items
        (id, vendor_id, name, description, tags, image_url, price_kobo, available, archived, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      itemId,
      vendor.id,
      input.name,
      input.description,
      input.tags,
      input.image_url ?? null,
      input.price_kobo,
      input.available ? 1 : 0,
      nowIso(),
    );
    return ok(
      { item: get<MenuItem>("SELECT * FROM menu_items WHERE id = ?", itemId) },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}

import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { getVendorForOwner } from "@/lib/auth/session";
import { get, run } from "@/lib/db";
import { menuItemUpdateSchema, parseWith } from "@/lib/validation";
import type { MenuItem } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const vendor = getVendorForOwner(user.id);
    if (!vendor) {
      throw new ApiError(403, "FORBIDDEN", "You do not manage a storefront.");
    }
    const item = get<MenuItem>(
      "SELECT * FROM menu_items WHERE id = ? AND vendor_id = ?",
      id,
      vendor.id,
    );
    if (!item) {
      throw new ApiError(404, "ITEM_NOT_FOUND", "Menu item not found on your storefront.");
    }
    const input = parseWith(menuItemUpdateSchema, await readJson(request));

    const fields: string[] = [];
    const values: (string | number)[] = [];
    const assign = (column: string, value: string | number | undefined) => {
      if (value !== undefined) {
        fields.push(`${column} = ?`);
        values.push(value);
      }
    };
    assign("name", input.name);
    assign("description", input.description);
    assign("tags", input.tags);
    assign("price_kobo", input.price_kobo);
    if (input.available !== undefined) assign("available", input.available ? 1 : 0);
    if (input.archived !== undefined) assign("archived", input.archived ? 1 : 0);

    if (fields.length > 0) {
      run(`UPDATE menu_items SET ${fields.join(", ")} WHERE id = ?`, ...values, item.id);
    }

    return ok({
      item: get<MenuItem>("SELECT * FROM menu_items WHERE id = ?", item.id),
    });
  } catch (error) {
    return fail(error);
  }
}

import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { getVendorForOwner } from "@/lib/auth/session";
import {
  getPublicVendorById,
  getPublicVendorBySlug,
} from "@/lib/catalogue/service";
import { get, run } from "@/lib/db";
import { nowIso } from "@/lib/money";
import { parseWith, vendorUpdateSchema } from "@/lib/validation";
import type { MenuItem, Vendor } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const vendor = getPublicVendorById(id) ?? getPublicVendorBySlug(id);
    if (!vendor) {
      throw new ApiError(404, "VENDOR_NOT_FOUND", "That storefront could not be found.");
    }
    return ok({ vendor });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
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
    const input = parseWith(vendorUpdateSchema, await readJson(request));

    if (input.publish === true) {
      const item = get<MenuItem>(
        "SELECT id FROM menu_items WHERE vendor_id = ? AND archived = 0 LIMIT 1",
        vendor.id,
      );
      if (!item) {
        throw new ApiError(
          422,
          "MENU_REQUIRED",
          "Add at least one menu item before publishing.",
        );
      }
      if (!vendor.published_at) {
        run("UPDATE vendors SET published_at = ? WHERE id = ?", nowIso(), vendor.id);
      }
    }
    if (input.publish === false) {
      run("UPDATE vendors SET published_at = NULL WHERE id = ?", vendor.id);
    }

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
    assign("address", input.address);
    assign("whatsapp", input.whatsapp);
    assign("opening_hours", input.opening_hours);
    assign("emoji", input.emoji);
    if (input.accepting_orders !== undefined) {
      assign("accepting_orders", input.accepting_orders ? 1 : 0);
    }
    if (fields.length > 0) {
      run(`UPDATE vendors SET ${fields.join(", ")} WHERE id = ?`, ...values, vendor.id);
    }

    return ok({ vendor: get<Vendor>("SELECT * FROM vendors WHERE id = ?", vendor.id) });
  } catch (error) {
    return fail(error);
  }
}

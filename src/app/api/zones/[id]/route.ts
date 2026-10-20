import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { getVendorForOwner } from "@/lib/auth/session";
import { get, run } from "@/lib/db";
import { parseWith, zoneUpdateSchema } from "@/lib/validation";
import type { DeliveryZone } from "@/lib/types";

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
    const zone = get<DeliveryZone>(
      "SELECT * FROM delivery_zones WHERE id = ? AND vendor_id = ?",
      id,
      vendor.id,
    );
    if (!zone) {
      throw new ApiError(404, "ZONE_NOT_FOUND", "Delivery zone not found.");
    }
    const input = parseWith(zoneUpdateSchema, await readJson(request));
    const fields: string[] = [];
    const values: (string | number)[] = [];
    if (input.name !== undefined) { fields.push("name = ?"); values.push(input.name); }
    if (input.fee_kobo !== undefined) { fields.push("fee_kobo = ?"); values.push(input.fee_kobo); }
    if (input.active !== undefined) { fields.push("active = ?"); values.push(input.active ? 1 : 0); }
    if (fields.length > 0) {
      run(`UPDATE delivery_zones SET ${fields.join(", ")} WHERE id = ?`, ...values, zone.id);
    }
    return ok({
      zone: get<DeliveryZone>("SELECT * FROM delivery_zones WHERE id = ?", zone.id),
    });
  } catch (error) {
    return fail(error);
  }
}

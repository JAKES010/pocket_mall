import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { getVendorForOwner } from "@/lib/auth/session";
import { get, run } from "@/lib/db";
import { parseWith, zoneCreateSchema } from "@/lib/validation";
import type { DeliveryZone } from "@/lib/types";

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
    const input = parseWith(zoneCreateSchema, await readJson(request));
    const zoneId = crypto.randomUUID();
    run(
      "INSERT INTO delivery_zones (id, vendor_id, name, fee_kobo, active) VALUES (?, ?, ?, ?, 1)",
      zoneId,
      vendor.id,
      input.name,
      input.fee_kobo,
    );
    return ok(
      {
        zone: get<DeliveryZone>(
          "SELECT * FROM delivery_zones WHERE id = ?",
          zoneId,
        ),
      },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}

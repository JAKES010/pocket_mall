import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { getVendorForOwner } from "@/lib/auth/session";
import {
  listCustomerOrders,
  listVendorOrders,
  placeOrder,
} from "@/lib/orders/service";
import { parseWith, placeOrderSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    if (url.searchParams.get("as") === "vendor") {
      const vendor = getVendorForOwner(user.id);
      if (!vendor) {
        throw new ApiError(403, "NO_VENDOR", "You do not manage a storefront.");
      }
      return ok({ orders: listVendorOrders(vendor.id), vendor });
    }
    return ok({ orders: listCustomerOrders(user.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = parseWith(placeOrderSchema, await readJson(request));
    const result = placeOrder(user.id, {
      quote_id: input.quote_id,
      idempotency_key: input.idempotency_key,
    });
    return ok(result, result.duplicate ? 200 : 201);
  } catch (error) {
    return fail(error);
  }
}

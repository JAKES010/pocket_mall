import { fail, ok, readJson, requireUser } from "@/lib/api";
import { createQuote } from "@/lib/orders/service";
import { parseWith, quoteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = parseWith(quoteSchema, await readJson(request));
    const result = createQuote(user.id, {
      vendor_id: input.vendor_id,
      fulfilment: input.fulfilment,
      zone_id: input.zone_id ?? null,
      delivery_address: input.delivery_address,
      contact_phone: input.contact_phone,
      items: input.items,
    });
    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}

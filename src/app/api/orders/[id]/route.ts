import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { getOrderDetail, transitionOrder } from "@/lib/orders/service";
import { parseWith, transitionSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const detail = getOrderDetail(id, user.id);
    if (!detail) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "That order could not be found.");
    }
    return ok(detail);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = parseWith(transitionSchema, await readJson(request));
    const result = transitionOrder(user.id, id, input.action, input.reason);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

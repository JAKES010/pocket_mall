import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import {
  canAccessConversation,
  getMessages,
  sendMessage,
} from "@/lib/conversations/service";
import { messageSchema, parseWith } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const access = canAccessConversation(id, user.id);
    if (!access) {
      throw new ApiError(403, "FORBIDDEN", "You are not part of this conversation.");
    }
    return ok({
      conversation: access.conversation,
      vendor: {
        id: access.vendor.id,
        name: access.vendor.name,
        slug: access.vendor.slug,
        emoji: access.vendor.emoji,
        owner_id: access.vendor.owner_id,
      },
      messages: getMessages(id),
      viewer: {
        id: user.id,
        role: access.isVendor ? "vendor" : "customer",
      },
    });
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
    const input = parseWith(messageSchema, await readJson(request));
    const message = sendMessage(id, user.id, input.body);
    return ok({ message }, 201);
  } catch (error) {
    return fail(error);
  }
}

import { ApiError, fail, ok, readJson, requireUser } from "@/lib/api";
import { discoveryAssistant, vendorOrderAssistant } from "@/lib/ai/assistant";
import { getPublicVendorById } from "@/lib/catalogue/service";
import {
  addAssistantMessage,
  canAccessConversation,
} from "@/lib/conversations/service";
import { parseWith, assistantSchema } from "@/lib/validation";

const buckets = new Map<string, number[]>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const windowStart = now - 60_000;
  const previous = (buckets.get(userId) ?? []).filter((time) => time > windowStart);
  if (previous.length >= 20) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many assistant requests. Wait a moment and try again.",
    );
  }
  previous.push(now);
  buckets.set(userId, previous);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    checkRateLimit(user.id);
    const input = parseWith(assistantSchema, await readJson(request));

    if (input.mode === "discovery") {
      const suggestion = await discoveryAssistant(
        input.message,
        input.zone_id ?? null,
      );
      return ok({ suggestion });
    }

    if (!input.vendor_id) {
      throw new ApiError(422, "VENDOR_REQUIRED", "Choose a vendor for an order suggestion.");
    }
    const vendor = getPublicVendorById(input.vendor_id);
    if (!vendor) {
      throw new ApiError(404, "VENDOR_NOT_FOUND", "That storefront could not be found.");
    }

    const suggestion = await vendorOrderAssistant(
      input.message,
      vendor,
      input.cart ?? [],
    );

    if (input.conversation_id) {
      const access = canAccessConversation(input.conversation_id, user.id);
      if (!access) {
        throw new ApiError(403, "FORBIDDEN", "You are not part of this conversation.");
      }
      if (access.conversation.vendor_id !== vendor.id) {
        throw new ApiError(
          422,
          "VENDOR_MISMATCH",
          "That conversation belongs to a different vendor.",
        );
      }
      addAssistantMessage(input.conversation_id, suggestion.message, suggestion);
    }

    return ok({ suggestion });
  } catch (error) {
    return fail(error);
  }
}

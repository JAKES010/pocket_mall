import { fail, ok, readJson, requireUser } from "@/lib/api";
import {
  getOrCreateConversation,
  listConversations,
} from "@/lib/conversations/service";
import { z } from "zod";
import { parseWith } from "@/lib/validation";

const createConversationSchema = z.object({
  vendor_id: z.string().min(1),
});

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ conversations: listConversations(user.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = parseWith(createConversationSchema, await readJson(request));
    const conversation = getOrCreateConversation(user.id, input.vendor_id);
    return ok({ conversation }, 201);
  } catch (error) {
    return fail(error);
  }
}

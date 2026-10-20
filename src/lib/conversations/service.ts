import { ApiError } from "@/lib/api";
import { all, get, run, transaction } from "@/lib/db";
import { nowIso } from "@/lib/money";
import type { Conversation, Message, Vendor } from "@/lib/types";

export interface ConversationSummary {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  vendor_emoji: string;
  customer_id: string;
  customer_name: string;
  last_message: string | null;
  last_message_at: string | null;
  last_author_kind: string | null;
  messages_count: number;
}

export function getOrCreateConversation(
  customerId: string,
  vendorId: string,
): Conversation {
  const vendor = get<Vendor>(
    "SELECT * FROM vendors WHERE id = ? AND published_at IS NOT NULL",
    vendorId,
  );
  if (!vendor) {
    throw new ApiError(404, "VENDOR_NOT_FOUND", "That storefront could not be found.");
  }

  const existing = get<Conversation>(
    "SELECT * FROM conversations WHERE customer_id = ? AND vendor_id = ?",
    customerId,
    vendorId,
  );
  if (existing) return existing;

  const id = crypto.randomUUID();
  const now = nowIso();
  run(
    "INSERT INTO conversations (id, customer_id, vendor_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    id,
    customerId,
    vendorId,
    now,
    now,
  );
  return get<Conversation>("SELECT * FROM conversations WHERE id = ?", id)!;
}

export function canAccessConversation(
  conversationId: string,
  userId: string,
): { conversation: Conversation; vendor: Vendor; isCustomer: boolean; isVendor: boolean } | null {
  const conversation = get<Conversation>(
    "SELECT * FROM conversations WHERE id = ?",
    conversationId,
  );
  if (!conversation) return null;
  const vendor = get<Vendor>("SELECT * FROM vendors WHERE id = ?", conversation.vendor_id);
  if (!vendor) return null;
  const isCustomer = conversation.customer_id === userId;
  const isVendor = vendor.owner_id === userId;
  if (!isCustomer && !isVendor) return null;
  return { conversation, vendor, isCustomer, isVendor };
}

export function listConversations(userId: string): ConversationSummary[] {
  return all<ConversationSummary>(
    `SELECT c.id, c.vendor_id, c.customer_id,
            v.name AS vendor_name, v.slug AS vendor_slug, v.emoji AS vendor_emoji,
            u.display_name AS customer_name,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
            (SELECT m.author_kind FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_author_kind,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS messages_count
       FROM conversations c
       JOIN vendors v ON v.id = c.vendor_id
       JOIN users u ON u.id = c.customer_id
      WHERE c.customer_id = ? OR v.owner_id = ?
      ORDER BY COALESCE((SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id), c.updated_at) DESC`,
    userId,
    userId,
  );
}

export function getMessages(conversationId: string, limit = 200): Message[] {
  return all<Message>(
    `SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?)
     ORDER BY created_at ASC`,
    conversationId,
    limit,
  );
}

export function sendMessage(
  conversationId: string,
  userId: string,
  body: string,
): Message {
  const access = canAccessConversation(conversationId, userId);
  if (!access) {
    throw new ApiError(403, "FORBIDDEN", "You are not part of this conversation.");
  }
  const trimmed = body.trim();
  if (!trimmed) {
    throw new ApiError(422, "EMPTY_MESSAGE", "Write a message first.");
  }
  if (trimmed.length > 2000) {
    throw new ApiError(422, "MESSAGE_TOO_LONG", "Messages are limited to 2,000 characters.");
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const authorKind = access.isVendor ? "vendor" : "customer";

  transaction((db) => {
    db.prepare(
      "INSERT INTO messages (id, conversation_id, sender_id, author_kind, body, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)",
    ).run(id, conversationId, userId, authorKind, trimmed, now);
    db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(
      now,
      conversationId,
    );
  });

  return get<Message>("SELECT * FROM messages WHERE id = ?", id)!;
}

export function addAssistantMessage(
  conversationId: string,
  body: string,
  metadata?: unknown,
): Message {
  const id = crypto.randomUUID();
  const now = nowIso();
  run(
    "INSERT INTO messages (id, conversation_id, sender_id, author_kind, body, metadata_json, created_at) VALUES (?, ?, NULL, 'assistant', ?, ?, ?)",
    id,
    conversationId,
    body,
    metadata ? JSON.stringify(metadata) : null,
    now,
  );
  run("UPDATE conversations SET updated_at = ? WHERE id = ?", now, conversationId);
  return get<Message>("SELECT * FROM messages WHERE id = ?", id)!;
}

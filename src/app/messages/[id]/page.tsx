import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canAccessConversation,
  getMessages,
} from "@/lib/conversations/service";
import { get } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=%2Fmessages%2F${encodeURIComponent(id)}`);

  const access = canAccessConversation(id, user.id);
  if (!access) notFound();

  const messages = getMessages(id);
  const customer = get<{ display_name: string }>(
    "SELECT display_name FROM users WHERE id = ?",
    access.conversation.customer_id,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/messages" className="btn-ghost btn-sm -ml-2">
          ← All messages
        </Link>
        <span className="text-xs text-muted">
          {access.isVendor ? "Viewing as vendor" : "Viewing as customer"}
          {customer ? ` · ${customer.display_name}` : ""}
        </span>
      </div>
      <ChatPanel
        conversationId={id}
        vendor={{
          id: access.vendor.id,
          name: access.vendor.name,
          slug: access.vendor.slug,
          emoji: access.vendor.emoji,
        }}
        initialMessages={messages}
        viewerRole={access.isVendor ? "vendor" : "customer"}
      />
    </div>
  );
}

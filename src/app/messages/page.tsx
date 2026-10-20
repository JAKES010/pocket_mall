import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeading } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { listConversations } from "@/lib/conversations/service";
import { timeAgo } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fmessages");

  const conversations = listConversations(user.id);

  return (
    <div>
      <PageHeading eyebrow="Inbox" title="Messages">
        Chat with vendors about your order, or reply to customers from your
        storefront. New messages appear automatically.
      </PageHeading>

      {conversations.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="No conversations yet"
          href="/"
          action="Find a vendor"
        >
          Open a storefront and tap “Message vendor” to start a conversation.
        </EmptyState>
      ) : (
        <div className="card divide-y divide-line">
          {conversations.map((conversation) => {
            const asVendor = conversation.customer_id !== user.id;
            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-4 px-4 py-4 transition hover:bg-brand-50/40 sm:px-5"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-xl">
                  {conversation.vendor_emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold">
                      {asVendor
                        ? conversation.customer_name
                        : conversation.vendor_name}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted">
                      {conversation.last_message_at
                        ? timeAgo(conversation.last_message_at)
                        : "No messages"}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted">
                    {conversation.last_message ?? "Say hello to start the chat."}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted">
                    {asVendor ? (
                      <span className="badge bg-leaf-50 text-leaf-700">
                        Your storefront
                      </span>
                    ) : (
                      <span className="badge bg-brand-50 text-brand-700">
                        Customer
                      </span>
                    )}
                    <span className="self-center">
                      {conversation.messages_count} message
                      {conversation.messages_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span className="text-muted" aria-hidden="true">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

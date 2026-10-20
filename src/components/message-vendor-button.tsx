"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MessageVendorButton({
  vendorId,
  className = "btn-secondary",
}: {
  vendorId: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openConversation() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      if (response.status === 401) {
        router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "Could not open the conversation.");
        return;
      }
      router.push(`/messages/${data.conversation.id}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={openConversation}
        disabled={loading}
        className={className}
      >
        {loading ? "Opening…" : "Message vendor"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}

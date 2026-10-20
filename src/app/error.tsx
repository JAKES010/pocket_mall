"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto max-w-lg px-6 py-14 text-center">
      <p className="text-4xl" aria-hidden="true">
        ⚠️
      </p>
      <h1 className="mt-3 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {error.message || "An unexpected error interrupted this page."} No demo
        funds move unless an order confirms successfully.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}

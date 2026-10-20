import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg px-6 py-14 text-center">
      <p className="text-4xl" aria-hidden="true">
        🍽️
      </p>
      <h1 className="mt-3 text-2xl font-semibold">That page is off the menu</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The link may be broken, or the storefront or order may no longer be
        available to you.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">
          Back to marketplace
        </Link>
        <Link href="/orders" className="btn-secondary">
          Your orders
        </Link>
      </div>
    </div>
  );
}

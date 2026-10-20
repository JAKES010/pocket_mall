import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-lg text-white shadow-sm transition group-hover:bg-brand-700">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
          <path
            d="M4 11h16a8 8 0 0 1-16 0Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M8 8c0-1.5 1.2-2.5 2.5-2.5M13 8c0-2 1.5-3.5 3-3.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-semibold tracking-tight">OrderDesk</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600">
            Otukpo
          </span>
        </span>
      )}
    </Link>
  );
}

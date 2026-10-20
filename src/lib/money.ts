export const DEMO_PASSWORD = "demo1234";

export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: naira % 1 === 0 ? 0 : 2,
  }).format(naira);
}

export function parseNairaToKobo(input: string | number): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }
  const cleaned = input.replace(/[₦,\s]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

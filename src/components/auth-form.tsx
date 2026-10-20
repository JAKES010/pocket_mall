"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_ACCOUNTS = [
  {
    label: "Customer demo",
    email: "customer@demo.orderdesk",
    password: "demo1234",
    hint: "Ada Customer · ₦25,000 demo wallet",
  },
  {
    label: "Vendor demo",
    email: "mama@demo.orderdesk",
    password: "demo1234",
    hint: "Mama Ngozi's Kitchen",
  },
];

export function AuthForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up";
      const body =
        mode === "sign-in"
          ? { email, password }
          : { email, password, display_name: displayName, phone: phone || undefined };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "Something went wrong.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function demoSignIn(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email, password: account.password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "Demo sign-in failed.");
        return;
      }
      router.push(
        account.email.startsWith("mama") ? "/sell" : next,
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 py-6 lg:grid-cols-[1fr_1fr]">
      <div className="card p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "sign-in"
            ? "Sign in to order, message vendors or manage your storefront."
            : "One account works for ordering and for selling. You can add a storefront later."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "sign-up" && (
            <div>
              <label htmlFor="display-name" className="label">
                Your name
              </label>
              <input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                minLength={2}
                autoComplete="name"
                className="field"
                placeholder="e.g. Ada Oche"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="field"
              placeholder="you@example.com"
            />
          </div>
          {mode === "sign-up" && (
            <div>
              <label htmlFor="phone" className="label">
                Phone <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                className="field"
                placeholder="0803 000 0000"
              />
            </div>
          )}
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={mode === "sign-up" ? 8 : 1}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="field"
              placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? "Please wait…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted">
          {mode === "sign-in" ? (
            <>
              New here?{" "}
              <Link
                href={`/sign-up?next=${encodeURIComponent(next)}`}
                className="font-semibold text-brand-700 hover:underline"
              >
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href={`/sign-in?next=${encodeURIComponent(next)}`}
                className="font-semibold text-brand-700 hover:underline"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>

      <aside className="card bg-gradient-to-br from-brand-50 to-paper p-6 sm:p-8">
        <span className="badge bg-brand-600 text-white">Demo access</span>
        <h2 className="mt-3 text-xl font-semibold">Jump straight in</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Seeded accounts make the two-sided demo easy. The customer wallet
          already holds ₦25,000 in simulated test funds.
        </p>
        <div className="mt-4 space-y-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => void demoSignIn(account)}
              disabled={loading}
              className="w-full rounded-xl border border-line bg-white p-3 text-left transition hover:border-brand-300"
            >
              <span className="block text-sm font-semibold">{account.label}</span>
              <span className="block text-xs text-muted">{account.hint}</span>
              <span className="mt-1 block font-mono text-[10px] text-muted">
                {account.email} · {account.password}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          <strong>Test funds only.</strong> The wallet is a simulated ledger. No
          bank transfer, card charge or real payment occurs.
        </div>
      </aside>
    </div>
  );
}

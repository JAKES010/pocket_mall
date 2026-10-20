"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNaira, parseNairaToKobo } from "@/lib/money";
import type { MenuItem } from "@/lib/types";

interface ApiErrorBody {
  error?: { message?: string };
}

async function patchItem(
  itemId: string,
  body: Record<string, unknown>,
): Promise<string | null> {
  const response = await fetch(`/api/menu/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  const data = (await response.json()) as ApiErrorBody;
  return data?.error?.message ?? "The menu item could not be updated.";
}

function ItemRow({ item }: { item: MenuItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [tags, setTags] = useState(item.tags);
  const [price, setPrice] = useState(String(item.price_kobo / 100));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    const message = await patchItem(item.id, body);
    setBusy(null);
    if (message) {
      setError(message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function save() {
    const priceKobo = parseNairaToKobo(price);
    if (priceKobo === null) {
      setError("Enter a valid price in naira.");
      return;
    }
    const saved = await run("save", {
      name: name.trim(),
      description: description.trim(),
      tags: tags.trim(),
      price_kobo: priceKobo,
    });
    if (saved) setEditing(false);
  }

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{item.name}</p>
            {item.archived === 1 && (
              <span className="badge bg-stone-200 text-stone-600">Archived</span>
            )}
            {item.archived === 0 && (
              <span
                className={`badge ${
                  item.available
                    ? "bg-leaf-50 text-leaf-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {item.available ? "Available" : "Out of stock"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {item.description || "No description"}
            {item.tags ? ` · ${item.tags}` : ""}
          </p>
        </div>
        <p className="text-base font-bold">{formatNaira(item.price_kobo)}</p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.archived === 0 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("availability", { available: !item.available })}
            className="btn-secondary btn-sm"
          >
            {busy === "availability"
              ? "Updating…"
              : item.available
                ? "Mark out of stock"
                : "Mark available"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="btn-secondary btn-sm"
        >
          {editing ? "Close editor" : "Edit"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (
              item.archived === 0 &&
              !window.confirm(`Archive “${item.name}”? Customers will no longer see it.`)
            ) {
              return;
            }
            void run("archive", { archived: item.archived === 0 });
          }}
          className="btn-ghost btn-sm text-muted"
        >
          {busy === "archive"
            ? "Working…"
            : item.archived === 0
              ? "Archive"
              : "Restore"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 rounded-xl border border-line bg-cream/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`name-${item.id}`}>
                Name
              </label>
              <input
                id={`name-${item.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="field"
                maxLength={80}
              />
            </div>
            <div>
              <label className="label" htmlFor={`price-${item.id}`}>
                Price (₦)
              </label>
              <input
                id={`price-${item.id}`}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="field"
                inputMode="decimal"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`desc-${item.id}`}>
                Description
              </label>
              <textarea
                id={`desc-${item.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                className="field resize-y"
                maxLength={400}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`tags-${item.id}`}>
                Search tags
              </label>
              <input
                id={`tags-${item.id}`}
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="field"
                maxLength={200}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy !== null}
            className="btn-primary btn-sm mt-3"
          >
            {busy === "save" ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-800">{error}</p>}
    </li>
  );
}

export function MenuManager({
  vendorId,
  items,
}: {
  vendorId: string;
  items: MenuItem[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const active = items.filter((item) => item.archived === 0);
  const archived = items.filter((item) => item.archived === 1);

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const priceKobo = parseNairaToKobo(price);
    if (priceKobo === null) {
      setError("Enter a valid price in naira, e.g. 2500.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendorId}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          tags: tags.trim(),
          price_kobo: priceKobo,
          available,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "The dish could not be added.");
        return;
      }
      setName("");
      setDescription("");
      setTags("");
      setPrice("");
      setAvailable(true);
      setNotice("Dish added to your menu.");
      router.refresh();
    } catch {
      setError("Network error. The dish was not added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
      <section className="card h-fit p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Add a dish</h2>
        <p className="mt-1 text-xs text-muted">
          Online immediately, unless you mark it out of stock.
        </p>
        <form onSubmit={addItem} className="mt-3 space-y-3">
          <div>
            <label htmlFor="new-item-name" className="label">
              Name
            </label>
            <input
              id="new-item-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              className="field"
              placeholder="e.g. Peppered chicken"
            />
          </div>
          <div>
            <label htmlFor="new-item-price" className="label">
              Price (₦)
            </label>
            <input
              id="new-item-price"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
              inputMode="decimal"
              className="field"
              placeholder="1800"
            />
          </div>
          <div>
            <label htmlFor="new-item-description" className="label">
              Description
            </label>
            <textarea
              id="new-item-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={400}
              className="field resize-y"
              placeholder="Optional, but helps discovery."
            />
          </div>
          <div>
            <label htmlFor="new-item-tags" className="label">
              Search tags
            </label>
            <input
              id="new-item-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              maxLength={200}
              className="field"
              placeholder="chicken, spicy, lunch"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => setAvailable(event.target.checked)}
              className="size-4 accent-brand-600"
            />
            Available now
          </label>
          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl border border-leaf-200 bg-leaf-50 px-3 py-2 text-xs text-leaf-700">
              {notice}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Adding…" : "Add to menu"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
            <h2 className="text-lg font-semibold">Current menu</h2>
            <span className="badge bg-paper text-muted ring-1 ring-line">
              {active.length} live
            </span>
          </div>
          {active.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              No live dishes yet. Add your first one on the left.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {active.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {archived.length > 0 && (
          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 sm:px-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                Archived
              </h2>
            </div>
            <ul className="divide-y divide-line">
              {archived.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

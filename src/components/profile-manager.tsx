"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNaira, parseNairaToKobo } from "@/lib/money";
import type { DeliveryZone, Vendor } from "@/lib/types";

const EMOJI_CHOICES = ["🍲", "🍢", "🍔", "🥘", "🥙", "🍗", "🍕", "🥗"];

interface ApiErrorBody {
  error?: { message?: string };
}

function ZoneRow({ zone }: { zone: DeliveryZone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [fee, setFee] = useState(String(zone.fee_kobo / 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/zones/${zone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json()) as ApiErrorBody;
        setError(data?.error?.message ?? "Zone could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Zone unchanged.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    const feeKobo = parseNairaToKobo(fee);
    if (feeKobo === null) {
      setError("Enter a valid fee in naira.");
      return;
    }
    void patch({ name: name.trim(), fee_kobo: feeKobo });
  }

  return (
    <li className="px-4 py-3 sm:px-5">
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field min-w-32 flex-1"
          maxLength={60}
          aria-label={`${zone.name} zone name`}
        />
        <div className="flex items-center rounded-xl border border-line bg-white pl-2">
          <span className="text-xs text-muted">₦</span>
          <input
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            className="w-20 border-0 bg-transparent px-1 py-2.5 text-sm outline-none"
            inputMode="decimal"
            aria-label={`${zone.name} fee in naira`}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-secondary btn-sm">
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void patch({ active: zone.active !== 1 })}
          className="btn-ghost btn-sm text-muted"
        >
          {zone.active === 1 ? "Disable" : "Enable"}
        </button>
        <span
          className={`badge ${
            zone.active === 1
              ? "bg-leaf-50 text-leaf-700"
              : "bg-stone-200 text-stone-600"
          }`}
        >
          {zone.active === 1 ? "Active" : "Off"}
        </span>
      </form>
      {error && <p className="mt-1 text-xs text-rose-800">{error}</p>}
    </li>
  );
}

export function ProfileManager({
  vendor,
  zones,
}: {
  vendor: Vendor;
  zones: DeliveryZone[];
}) {
  const router = useRouter();
  const [name, setName] = useState(vendor.name);
  const [description, setDescription] = useState(vendor.description);
  const [address, setAddress] = useState(vendor.address);
  const [whatsapp, setWhatsapp] = useState(vendor.whatsapp);
  const [openingHours, setOpeningHours] = useState(vendor.opening_hours);
  const [emoji, setEmoji] = useState(vendor.emoji);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("500");
  const [addingZone, setAddingZone] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const published = Boolean(vendor.published_at);
  const activeZones = zones.filter((zone) => zone.active === 1);

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          address: address.trim(),
          whatsapp: whatsapp.replace(/[^0-9]/g, ""),
          opening_hours: openingHours.trim(),
          emoji,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "Storefront could not be saved.");
        return;
      }
      setNotice("Storefront details saved.");
      router.refresh();
    } catch {
      setError("Network error. Storefront unchanged.");
    } finally {
      setSaving(false);
    }
  }

  async function setPublished(next: boolean) {
    if (
      !next &&
      !window.confirm(
        "Unpublish your storefront? Customers will no longer find it until you publish again.",
      )
    ) {
      return;
    }
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: next }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "Publish state could not be changed.");
        return;
      }
      setNotice(next ? "Your storefront is live." : "Your storefront is offline.");
      router.refresh();
    } catch {
      setError("Network error. Publish state unchanged.");
    } finally {
      setPublishing(false);
    }
  }

  async function addZone(event: React.FormEvent) {
    event.preventDefault();
    setZoneError(null);
    const feeKobo = parseNairaToKobo(newZoneFee);
    if (!newZoneName.trim() || feeKobo === null) {
      setZoneError("Enter a zone name and a fee in naira.");
      return;
    }
    setAddingZone(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newZoneName.trim(), fee_kobo: feeKobo }),
      });
      const data = await response.json();
      if (!response.ok) {
        setZoneError(data?.error?.message ?? "Zone could not be added.");
        return;
      }
      setNewZoneName("");
      setNewZoneFee("500");
      router.refresh();
    } catch {
      setZoneError("Network error. Zone not added.");
    } finally {
      setAddingZone(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Visibility</h2>
            <p className="text-xs text-muted">
              {published
                ? "Your storefront is listed in the marketplace."
                : "Your storefront is hidden from customers."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`badge ${
                published
                  ? "bg-leaf-50 text-leaf-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {published ? "Published" : "Unpublished"}
            </span>
            <button
              type="button"
              disabled={publishing}
              onClick={() => void setPublished(!published)}
              className={published ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
            >
              {publishing
                ? "Updating…"
                : published
                  ? "Unpublish"
                  : "Publish storefront"}
            </button>
          </div>
        </div>
        {!published && (
          <p className="mt-2 text-[11px] text-muted">
            Publishing requires at least one non-archived menu item.
          </p>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Storefront details</h2>
        <form onSubmit={saveDetails} className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="label">
              Name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              className="field"
            />
          </div>
          <div>
            <span className="label">Emoji</span>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setEmoji(choice)}
                  aria-pressed={emoji === choice}
                  className={`grid size-9 place-items-center rounded-lg border text-lg ${
                    emoji === choice
                      ? "border-brand-500 bg-brand-50"
                      : "border-line bg-white hover:border-brand-300"
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="profile-description" className="label">
              Description
            </label>
            <textarea
              id="profile-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={500}
              className="field resize-y"
            />
          </div>
          <div>
            <label htmlFor="profile-address" className="label">
              Pickup address
            </label>
            <input
              id="profile-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
              minLength={3}
              maxLength={200}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="profile-whatsapp" className="label">
              WhatsApp number
            </label>
            <input
              id="profile-whatsapp"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              required
              className="field"
              placeholder="2348012345678"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="profile-hours" className="label">
              Opening hours
            </label>
            <input
              id="profile-hours"
              value={openingHours}
              onChange={(event) => setOpeningHours(event.target.value)}
              required
              minLength={3}
              maxLength={120}
              className="field"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 sm:col-span-2">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl border border-leaf-200 bg-leaf-50 px-3 py-2 text-xs text-leaf-700 sm:col-span-2">
              {notice}
            </p>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <h2 className="text-lg font-semibold">Delivery zones</h2>
          <p className="text-xs text-muted">
            Disabled zones stay on past orders but cannot be chosen at checkout.
          </p>
        </div>
        {zones.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            No zones yet. Add one below so customers can choose delivery. Pickup
            is always free.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {zones.map((zone) => (
              <ZoneRow key={zone.id} zone={zone} />
            ))}
          </ul>
        )}
        <form
          onSubmit={addZone}
          className="flex flex-wrap items-end gap-2 border-t border-line bg-cream/40 px-4 py-4 sm:px-5"
        >
          <div className="min-w-40 flex-1">
            <label htmlFor="new-zone-name" className="label">
              New zone
            </label>
            <input
              id="new-zone-name"
              value={newZoneName}
              onChange={(event) => setNewZoneName(event.target.value)}
              className="field"
              placeholder="e.g. Hostels"
              maxLength={60}
            />
          </div>
          <div>
            <label htmlFor="new-zone-fee" className="label">
              Fee (₦)
            </label>
            <input
              id="new-zone-fee"
              value={newZoneFee}
              onChange={(event) => setNewZoneFee(event.target.value)}
              className="field w-24"
              inputMode="decimal"
            />
          </div>
          <button type="submit" disabled={addingZone} className="btn-secondary">
            {addingZone ? "Adding…" : "Add zone"}
          </button>
        </form>
        {zoneError && (
          <p className="px-4 pb-3 text-xs text-rose-800 sm:px-5">{zoneError}</p>
        )}
      </section>

      <p className="rounded-2xl border border-line bg-paper/60 px-4 py-3 text-[11px] leading-relaxed text-muted">
        Delivery fees are demo amounts charged in test funds.{" "}
        {activeZones.length > 0
          ? `Active fees range from ${formatNaira(
              Math.min(...activeZones.map((zone) => zone.fee_kobo)),
            )} to ${formatNaira(
              Math.max(...activeZones.map((zone) => zone.fee_kobo)),
            )}.`
          : ""}{" "}
        No real payouts are made.
      </p>
    </div>
  );
}

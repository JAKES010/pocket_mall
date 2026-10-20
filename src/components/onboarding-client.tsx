"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNaira, parseNairaToKobo } from "@/lib/money";

const EMOJI_CHOICES = ["🍲", "🍢", "🍔", "🥘", "🥙", "🍗", "🍕", "🥗"];

interface ZoneDraft {
  name: string;
  fee: string;
}

interface ApiErrorBody {
  error?: { message?: string };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function OnboardingClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [emoji, setEmoji] = useState("🍲");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [openingHours, setOpeningHours] = useState("Mon–Sat · 9am–8pm");
  const [zones, setZones] = useState<ZoneDraft[]>([
    { name: "Campus", fee: "400" },
    { name: "Town", fee: "700" },
  ]);

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemTags, setItemTags] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdVendorId, setCreatedVendorId] = useState<string | null>(null);

  function updateZone(index: number, patch: Partial<ZoneDraft>) {
    setZones((current) =>
      current.map((zone, position) =>
        position === index ? { ...zone, ...patch } : zone,
      ),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const priceKobo = parseNairaToKobo(itemPrice);
    if (priceKobo === null || priceKobo < 100) {
      setError("Enter a first menu price in naira, e.g. 2500.");
      return;
    }
    const parsedZones: { name: string; fee_kobo: number }[] = [];
    for (const zone of zones) {
      if (!zone.name.trim()) continue;
      const fee = parseNairaToKobo(zone.fee);
      if (fee === null) {
        setError(`Enter a delivery fee for “${zone.name}”.`);
        return;
      }
      parsedZones.push({ name: zone.name.trim(), fee_kobo: fee });
    }

    setBusy(true);
    try {
      setPhase("Creating your storefront…");
      const vendorResponse = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug || slugify(name),
          description: description.trim(),
          address: address.trim(),
          whatsapp: whatsapp.replace(/[^0-9]/g, ""),
          opening_hours: openingHours.trim(),
          emoji,
          zones: parsedZones,
        }),
      });
      const vendorData = await vendorResponse.json();
      if (!vendorResponse.ok) {
        setError(
          (vendorData as ApiErrorBody)?.error?.message ??
            "The storefront could not be created.",
        );
        return;
      }
      const vendorId = vendorData.vendor.id as string;
      setCreatedVendorId(vendorId);

      setPhase("Adding your first dish…");
      const itemResponse = await fetch(`/api/vendors/${vendorId}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName.trim(),
          description: itemDescription.trim(),
          tags: itemTags.trim(),
          price_kobo: priceKobo,
          available: true,
        }),
      });
      if (!itemResponse.ok) {
        const itemData = await itemResponse.json();
        setError(
          (itemData as ApiErrorBody)?.error?.message ??
            "Your storefront exists, but the first dish could not be added. Add it from the menu manager.",
        );
        return;
      }

      setPhase("Publishing your storefront…");
      const publishResponse = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      if (!publishResponse.ok) {
        const publishData = await publishResponse.json();
        setError(
          (publishData as ApiErrorBody)?.error?.message ??
            "Your storefront was created but not published. Publish it from storefront settings.",
        );
        return;
      }

      setPhase("Done — opening your vendor desk…");
      router.push("/sell");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  if (createdVendorId) {
    return (
      <div className="card p-6 sm:p-8">
        <p className="text-3xl">🏪</p>
        <h2 className="mt-2 text-2xl font-semibold">Storefront created</h2>
        <p className="mt-1 text-sm text-muted">
          {error ?? "You can finish setting it up from the vendor desk."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/sell" className="btn-primary">
            Open vendor desk
          </Link>
          <Link href="/sell/menu" className="btn-secondary">
            Add more dishes
          </Link>
          <Link href="/sell/profile" className="btn-secondary">
            Publish storefront
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="badge bg-brand-600 text-white">Step 1</span>
          <h2 className="text-lg font-semibold">Storefront basics</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="vendor-name" className="label">
              Storefront name
            </label>
            <input
              id="vendor-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
              required
              minLength={2}
              maxLength={80}
              className="field"
              placeholder="e.g. Mama Ngozi's Kitchen"
            />
          </div>
          <div>
            <label htmlFor="vendor-slug" className="label">
              Storefront link
            </label>
            <div className="flex items-center rounded-xl border border-line bg-white pl-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
              <span className="text-xs text-muted">/vendors/</span>
              <input
                id="vendor-slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                required
                minLength={3}
                maxLength={60}
                className="w-full rounded-r-xl border-0 bg-transparent px-1 py-2.5 text-sm outline-none"
                placeholder="mama-ngozi-kitchen"
              />
            </div>
          </div>
          <div>
            <span className="label">Storefront emoji</span>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setEmoji(choice)}
                  aria-pressed={emoji === choice}
                  className={`grid size-10 place-items-center rounded-xl border text-xl ${
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
            <label htmlFor="vendor-description" className="label">
              Short description
            </label>
            <textarea
              id="vendor-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={500}
              className="field resize-y"
              placeholder="Hot, honest food cooked fresh on campus."
            />
          </div>
          <div>
            <label htmlFor="vendor-address" className="label">
              Pickup address
            </label>
            <input
              id="vendor-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
              minLength={3}
              maxLength={200}
              className="field"
              placeholder="Behind the Student Union, Otukpo"
            />
          </div>
          <div>
            <label htmlFor="vendor-whatsapp" className="label">
              WhatsApp number
            </label>
            <input
              id="vendor-whatsapp"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              required
              inputMode="numeric"
              className="field"
              placeholder="2348012345678"
            />
            <p className="mt-1 text-[11px] text-muted">
              International format without +, e.g. 2348012345678.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="vendor-hours" className="label">
              Opening hours
            </label>
            <input
              id="vendor-hours"
              value={openingHours}
              onChange={(event) => setOpeningHours(event.target.value)}
              required
              minLength={3}
              maxLength={120}
              className="field"
              placeholder="Mon–Sat · 9am–8pm"
            />
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="badge bg-brand-600 text-white">Step 2</span>
          <h2 className="text-lg font-semibold">Delivery zones</h2>
        </div>
        <p className="mt-1 text-xs text-muted">
          Delivery fees are added to the server quote. Leave the name blank to
          skip a row. Customers can always choose free pickup.
        </p>
        <div className="mt-3 space-y-2">
          {zones.map((zone, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={zone.name}
                onChange={(event) => updateZone(index, { name: event.target.value })}
                className="field flex-1"
                placeholder="Zone name, e.g. Campus"
                maxLength={60}
                aria-label={`Zone ${index + 1} name`}
              />
              <div className="flex items-center rounded-xl border border-line bg-white pl-2">
                <span className="text-xs text-muted">₦</span>
                <input
                  value={zone.fee}
                  onChange={(event) => updateZone(index, { fee: event.target.value })}
                  className="w-20 border-0 bg-transparent px-1 py-2.5 text-sm outline-none"
                  placeholder="400"
                  inputMode="decimal"
                  aria-label={`Zone ${index + 1} fee in naira`}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setZones((current) => current.filter((_, position) => position !== index))
                }
                className="btn-ghost btn-sm text-muted"
                aria-label={`Remove zone ${index + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {zones.length < 10 && (
          <button
            type="button"
            onClick={() => setZones((current) => [...current, { name: "", fee: "500" }])}
            className="btn-ghost btn-sm mt-2 -ml-2"
          >
            + Add another zone
          </button>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="badge bg-brand-600 text-white">Step 3</span>
          <h2 className="text-lg font-semibold">Your first dish</h2>
        </div>
        <p className="mt-1 text-xs text-muted">
          A published storefront needs at least one available menu item.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="item-name" className="label">
              Dish name
            </label>
            <input
              id="item-name"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              className="field"
              placeholder="e.g. Rice & Chicken Combo"
            />
          </div>
          <div>
            <label htmlFor="item-price" className="label">
              Price (₦)
            </label>
            <input
              id="item-price"
              value={itemPrice}
              onChange={(event) => setItemPrice(event.target.value)}
              required
              inputMode="decimal"
              className="field"
              placeholder="2750"
            />
            {itemPrice && parseNairaToKobo(itemPrice) !== null && (
              <p className="mt-1 text-[11px] text-muted">
                Shown as {formatNaira(parseNairaToKobo(itemPrice)!)}.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="item-description" className="label">
              Description
            </label>
            <textarea
              id="item-description"
              value={itemDescription}
              onChange={(event) => setItemDescription(event.target.value)}
              rows={2}
              maxLength={400}
              className="field resize-y"
              placeholder="What is in it? Helps customers and the AI find it."
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="item-tags" className="label">
              Search tags
            </label>
            <input
              id="item-tags"
              value={itemTags}
              onChange={(event) => setItemTags(event.target.value)}
              maxLength={200}
              className="field"
              placeholder="rice, chicken, combo, lunch"
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? (phase ?? "Creating…") : "Create & publish storefront"}
        </button>
        <p className="text-[11px] text-muted">
          Demo storefronts are fictional. No real payments or payouts occur.
        </p>
      </div>
    </form>
  );
}

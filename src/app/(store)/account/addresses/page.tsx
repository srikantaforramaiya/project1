"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Plus, Star, Trash2 } from "lucide-react";

type Address = {
  id: string; label: string; recipientName: string; phone: string;
  addressLine1: string; addressLine2: string | null; landmark: string | null;
  city: string; state: string; postalCode: string; isDefault: boolean;
};

export default function AddressesPage() {
  const router = useRouter();
  const { push } = useToast();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState(false);

  function refresh() {
    fetch("/api/account/addresses").then((r) => r.json()).then((d) => setAddresses(d.addresses)).catch(() => setAddresses([]));
  }
  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/account/addresses", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { push(data?.error ?? "Could not save address.", "error"); return; }
    push("Address saved.");
    setEditing(false);
    refresh();
    router.refresh();
  }

  async function makeDefault(id: string) {
    await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true })
    });
    push("Default address updated.");
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this address? This cannot be undone.")) return;
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    push("Address deleted.");
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Addresses</h1>
        <button className="btn-primary !px-3 !py-2 text-xs" onClick={() => setEditing(!editing)}>
          <Plus className="h-4 w-4" aria-hidden /> Add Address
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="card mt-4 grid gap-3 p-5 sm:grid-cols-2">
          <input name="label" placeholder="Label (Home/Office)" className="input" required />
          <input name="recipientName" placeholder="Recipient name" className="input" required />
          <input name="phone" placeholder="Phone" className="input" required />
          <input name="postalCode" placeholder="PIN code (6 digits)" className="input" inputMode="numeric" pattern="\d{6}" required />
          <input name="addressLine1" placeholder="Address line 1" className="input sm:col-span-2" required />
          <input name="addressLine2" placeholder="Address line 2 (optional)" className="input sm:col-span-2" />
          <input name="landmark" placeholder="Landmark (optional)" className="input sm:col-span-2" />
          <input name="city" placeholder="City" className="input" required />
          <input name="state" placeholder="State" className="input" required />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="isDefault" value="true" className="accent-primary" /> Make default
          </label>
          <button type="submit" className="btn-primary sm:col-span-2">Save Address</button>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {addresses?.length === 0 && (
          <div className="card p-10 text-center text-sm text-text-secondary">No saved addresses yet.</div>
        )}
        {addresses?.map((a) => (
          <div key={a.id} className="card flex flex-wrap items-start justify-between gap-3 p-5">
            <div className="text-sm">
              <p className="font-semibold">{a.label} {a.isDefault && <span className="badge ml-1 bg-primary/10 text-primary">Default</span>}</p>
              <p className="mt-1 text-text-secondary">{a.recipientName} · {a.phone}</p>
              <p className="text-text-secondary">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}{a.landmark ? ` (${a.landmark})` : ""}</p>
              <p className="text-text-secondary">{a.city}, {a.state} - {a.postalCode}</p>
            </div>
            <div className="flex gap-2">
              {!a.isDefault && <button onClick={() => makeDefault(a.id)} className="btn-ghost !px-3 !py-1.5 text-xs"><Star className="h-3.5 w-3.5" aria-hidden /> Make Default</button>}
              <button onClick={() => remove(a.id)} className="btn-danger !px-3 !py-1.5 text-xs" aria-label={`Delete ${a.label} address`}><Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

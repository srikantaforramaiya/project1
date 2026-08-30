"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Smartphone, ShieldCheck, Loader2 } from "lucide-react";
import { formatINR } from "@/lib/store-config";
import { useToast } from "@/components/ui/toast";
import type { CartLine } from "@/types/cart";

type AddressInfo = {
  id: string; label: string; recipientName: string; phone: string;
  addressLine1: string; addressLine2: string | null; landmark: string | null;
  city: string; state: string; postalCode: string; isDefault: boolean;
};

export function CheckoutForm({ lines, addresses, user, subtotal, deliveryCharge, serviceablePostalCodes }: {
  lines: CartLine[];
  addresses: AddressInfo[];
  user: { name: string; email: string; phone: string };
  subtotal: number;
  deliveryCharge: number;
  serviceablePostalCodes: string[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [selectedAddress, setSelectedAddress] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  const address = addresses.find((a) => a.id === selectedAddress);
  const unsupportedPin = address ? !serviceablePostalCodes.includes(address.postalCode) : false;
  const grandTotal = subtotal + deliveryCharge;
  const soldOutItems = lines.filter((l) => !l.isAvailable);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAddress) {
      push("Please select a delivery address.", "error");
      return;
    }
    setPending(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId: selectedAddress, customerNotes: notes })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setPending(false);
      push(data?.error ?? "Could not place the order. Please review your cart.", "error");
      return;
    }
    router.push(`/checkout/pay/${data.orderNumber}`);
  }


  async function addNewAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      push(data?.error ?? "Could not save address.", "error");
      return;
    }
    push("Address saved.");
    setAddingAddress(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Checkout</h1>

      {soldOutItems.length > 0 && (
        <div className="card mt-4 border-danger/50 p-4 text-sm text-danger">
          Some items in your cart are now sold out: {soldOutItems.map((l) => l.name).join(", ")}. Please remove them in the <Link href="/cart" className="underline">cart</Link> before ordering.
        </div>
      )}

      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="card p-6" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="mb-4 font-semibold">Customer Information</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-text-secondary">Name</dt><dd>{user.name}</dd></div>
              <div><dt className="text-text-secondary">Email</dt><dd>{user.email}</dd></div>
              <div><dt className="text-text-secondary">Phone</dt><dd>{user.phone}</dd></div>
            </dl>
          </section>

          <section className="card p-6" aria-labelledby="address-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="address-heading" className="font-semibold">Delivery Address</h2>
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setAddingAddress(!addingAddress)}>
                {addingAddress ? "Cancel" : "+ Add New"}
              </button>
            </div>
            {addresses.length === 0 && <p className="text-sm text-text-secondary">No saved addresses yet — add one below.</p>}
            <div className="space-y-3" role="radiogroup" aria-label="Delivery address">
              {addresses.map((a) => (
                <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${selectedAddress === a.id ? "border-primary/60 bg-primary/5" : "border-border"}`}>
                  <input type="radio" name="addressId" value={a.id} checked={selectedAddress === a.id} onChange={() => setSelectedAddress(a.id)} className="mt-1 accent-primary" />
                  <span className="text-sm">
                    <span className="font-medium">{a.label} {a.isDefault && <span className="badge ml-1 bg-primary/10 text-primary">Default</span>}</span><br />
                    <span className="text-text-secondary">{a.recipientName}, {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}, {a.city}, {a.state} - {a.postalCode}</span>
                    {address && a.id === address.id && !unsupportedPin && (
                      <span className="mt-1 block text-xs text-success">✓ Delivers to your area</span>
                    )}
                    {address && a.id === address.id && unsupportedPin && (
                      <span className="mt-1 block text-xs text-danger">Sorry, delivery is currently unavailable for PIN code {a.postalCode}.</span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {addingAddress && (
              <div className="mt-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                <input form="new-address-form" name="label" placeholder="Label (Home/Office)" className="input" required />
                <input form="new-address-form" name="recipientName" placeholder="Recipient name" className="input" defaultValue={user.name} required />
                <input form="new-address-form" name="phone" placeholder="Phone" className="input" defaultValue={user.phone} required />
                <input form="new-address-form" name="addressLine1" placeholder="Address line 1" className="input" required />
                <input form="new-address-form" name="addressLine2" placeholder="Address line 2 (optional)" className="input" />
                <input form="new-address-form" name="landmark" placeholder="Landmark (optional)" className="input" />
                <input form="new-address-form" name="city" placeholder="City" className="input" required />
                <input form="new-address-form" name="state" placeholder="State" className="input" defaultValue="Karnataka" required />
                <input form="new-address-form" name="postalCode" placeholder="PIN code (6 digits)" className="input" inputMode="numeric" pattern="\d{6}" required />
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input form="new-address-form" type="checkbox" name="isDefault" value="true" className="accent-primary" /> Make default
                </label>
                <button type="submit" form="new-address-form" className="btn-secondary sm:col-span-2">Save Address</button>
              </div>
            )}
            {/* Hidden form host for the address inputs above (keeps them outside the main checkout form) */}
            <form id="new-address-form" onSubmit={addNewAddress} className="hidden" aria-hidden="true" />
          </section>

          <section className="card p-6" aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="mb-4 font-semibold">Payment</h2>
            <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <Smartphone className="h-6 w-6 text-primary" aria-hidden />
              <div>
                <p className="font-medium">UPI Payment</p>
                <p className="text-xs text-text-secondary">GPay, PhonePe, Paytm, BHIM and any UPI app</p>
              </div>
              <ShieldCheck className="ml-auto h-5 w-5 text-accent" aria-hidden />
            </div>
            <p className="mt-2 text-xs text-text-secondary">Payments are processed securely and verified by our server before your order is confirmed.</p>
          </section>

          <section className="card p-6" aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="mb-2 font-semibold">Order Notes (optional)</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder='e.g. "Less spicy", "Call before delivery"'
              className="input"
              aria-label="Order notes"
            />
            <p className="mt-1 text-xs text-text-secondary">We&apos;ll do our best to accommodate your requests.</p>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="card-elevated sticky top-24 p-6">
            <h2 className="mb-4 font-semibold">Order Summary</h2>
            <ul className="space-y-3 text-sm">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="40px" className="object-cover" />}
                  </div>
                  <span className="flex-1 truncate">{l.name} × {l.quantity}</span>
                  <span>{formatINR(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Delivery</dt><dd>{deliveryCharge === 0 ? "FREE" : formatINR(deliveryCharge)}</dd></div>
              <div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><dt>Total</dt><dd className="text-primary">{formatINR(grandTotal)}</dd></div>
            </dl>
            <button
              type="submit"
              className="btn-primary mt-6 w-full py-3 text-base"
              disabled={pending || !selectedAddress || unsupportedPin || soldOutItems.length > 0}
              aria-disabled={pending || !selectedAddress || unsupportedPin}
            >
              {pending ? (
                <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Placing order...</>
              ) : (
                <>Pay {formatINR(grandTotal)} with UPI</>
              )}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}


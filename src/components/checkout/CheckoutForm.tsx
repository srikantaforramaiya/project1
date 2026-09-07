"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Smartphone, ShieldCheck, Loader2, Phone, MessageCircle } from "lucide-react";
import { formatINR, STORE_CONFIG } from "@/lib/store-config";
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
  const [paidOrder, setPaidOrder] = useState<{ orderNumber: string; grandTotal: number } | null>(null);

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
    // Show the UPI QR right here on the checkout page.
    setPaidOrder({ orderNumber: data.orderNumber, grandTotal: data.grandTotal });
    setPending(false);
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
    if (data.address?.id) setSelectedAddress(data.address.id);
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
            {!pending && !selectedAddress && (
              <p className="mt-2 text-xs text-warning">Select or add a delivery address above to enable payment.</p>
            )}
            {!pending && unsupportedPin && (
              <p className="mt-2 text-xs text-danger">Delivery is not available for the selected PIN code.</p>
            )}
          </div>
        </aside>
      </form>

      {/* Add-address modal — rendered outside the main checkout form so nesting stays valid */}
      {addingAddress && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-background/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add delivery address">
          <form onSubmit={addNewAddress} className="card-elevated my-8 w-full max-w-lg p-6">
            <h2 className="mb-4 text-lg font-semibold">Add Delivery Address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="label" placeholder="Label (Home/Office)" className="input" required />
              <input name="recipientName" placeholder="Recipient name" className="input" defaultValue={user.name} required />
              <input name="phone" placeholder="Phone (10 digits)" className="input" defaultValue={user.phone} required />
              <input name="postalCode" placeholder="PIN code (6 digits)" className="input" inputMode="numeric" pattern="\d{6}" required />
              <input name="addressLine1" placeholder="Address line 1" className="input sm:col-span-2" required />
              <input name="addressLine2" placeholder="Address line 2 (optional)" className="input sm:col-span-2" />
              <input name="landmark" placeholder="Landmark (optional)" className="input sm:col-span-2" />
              <input name="city" placeholder="City" className="input" required />
              <input name="state" placeholder="State" className="input" defaultValue="Karnataka" required />
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" name="isDefault" value="true" defaultChecked={addresses.length === 0} className="accent-primary" /> Make default address
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setAddingAddress(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Address</button>
            </div>
          </form>
        </div>
      )}

      {/* UPI QR popup — appears right after the order is placed */}
      {paidOrder && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-background/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Scan and pay with UPI">
          <div className="card-elevated my-8 w-full max-w-md p-6 text-center">
            <h2 className="text-xl font-bold">Scan &amp; Pay with UPI</h2>
            <p className="mt-1 text-sm text-text-secondary">Order {paidOrder.orderNumber}</p>
            <p className="mt-2 text-3xl font-extrabold text-primary">{formatINR(paidOrder.grandTotal)}</p>

            <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 shadow-neon-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/payments/qr?orderNumber=${encodeURIComponent(paidOrder.orderNumber)}`}
                alt={`UPI QR code to pay ${formatINR(paidOrder.grandTotal)} to ${STORE_CONFIG.upiVpa}`}
                width={220}
                height={220}
              />
            </div>

            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs text-text-secondary">Paying to</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-primary">{STORE_CONFIG.upiVpa}</p>
              <p className="text-xs text-text-secondary">({STORE_CONFIG.sellerPhone ? "Seller GPay / UPI" : "Seller UPI"})</p>
            </div>

            <p className="mt-4 text-sm text-text-secondary">
              Scan with GPay, PhonePe, Paytm or any UPI app, or pay directly to the UPI ID shown above. After paying, inform the seller to confirm your order.
            </p>
            <a
              href={`upi://pay?pa=${STORE_CONFIG.upiVpa}&pn=${encodeURIComponent("Neon Bites")}&am=${paidOrder.grandTotal.toFixed(2)}&cu=INR&tr=${paidOrder.orderNumber}`}
              className="btn-secondary mt-3 w-full"
            >
              <Smartphone className="h-4 w-4" aria-hidden /> Open UPI App to Pay
            </a>
            <div className="mt-3 flex justify-center gap-3">
              <a href={`tel:+91${STORE_CONFIG.sellerPhone}`} className="btn-primary !px-4 !py-2 text-sm">
                <Phone className="h-4 w-4" aria-hidden /> Call {STORE_CONFIG.sellerPhone}
              </a>
              <a
                href={`https://wa.me/91${STORE_CONFIG.sellerPhone}?text=${encodeURIComponent(`Hi! I placed order ${paidOrder.orderNumber} on Neon Bites and have paid ${formatINR(paidOrder.grandTotal)} via UPI to ${STORE_CONFIG.upiVpa}. Please confirm my order.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !px-4 !py-2 text-sm"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
              </a>
            </div>

            <Link href={`/account/orders/${paidOrder.orderNumber}`} className="btn-ghost mt-5 w-full">
              Done — View My Orders
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


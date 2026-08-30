"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { formatINR, STORE_CONFIG } from "@/lib/store-config";
import { useToast } from "@/components/ui/toast";
import type { CartLine } from "@/types/cart";



export default function CartPage() {
  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [pending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function refresh() {
    fetch("/api/cart")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setLines(d.items))
      .catch(() => setLines([]));
    startTransition(() => router.refresh());
  }
  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateQty(item: CartLine, quantity: number) {
    const res = await fetch("/api/cart/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, quantity })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      push(data?.error ?? "Could not update quantity.", "error");
    }
    refresh();
  }

  async function removeItem(item: CartLine) {
    await fetch("/api/cart/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id })
    });
    push(`${item.name} removed from cart.`);
    refresh();
  }

  if (lines === null) {
    return <div className="mx-auto max-w-4xl px-4 py-16"><div className="card h-64 animate-pulse" /></div>;
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const deliveryCharge = subtotal === 0 || subtotal >= STORE_CONFIG.freeDeliveryThreshold ? 0 : STORE_CONFIG.deliveryFee;
  const grandTotal = subtotal + deliveryCharge;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Your Cart</h1>

      {lines.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-3 py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-primary" aria-hidden />
          <p className="text-lg font-semibold">Your cart is hungry.</p>
          <p className="text-sm text-text-secondary">Add some delicious dishes to get started.</p>
          <Link href="/menu" className="btn-primary mt-2">Browse Menu</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {lines.map((l) => (
              <div key={l.id} className={`card flex items-center gap-4 p-4 ${!l.isAvailable ? "opacity-60" : ""}`}>
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-elevated">
                  {l.imageUrl ? (
                    <Image src={l.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl" aria-hidden>🍽️</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${l.slug}`} className="font-semibold hover:text-primary">{l.name}</Link>
                  <p className="text-sm text-text-secondary">{formatINR(l.unitPrice)} each</p>
                  {!l.isAvailable && <p className="text-xs text-danger">This item is now sold out — remove it to checkout.</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button aria-label={`Decrease ${l.name} quantity`} className="btn-ghost !px-2 !py-1.5" onClick={() => updateQty(l, l.quantity - 1)}><Minus className="h-3.5 w-3.5" aria-hidden /></button>
                  <span className="w-7 text-center" aria-live="polite">{l.quantity}</span>
                  <button aria-label={`Increase ${l.name} quantity`} className="btn-ghost !px-2 !py-1.5" onClick={() => updateQty(l, l.quantity + 1)}><Plus className="h-3.5 w-3.5" aria-hidden /></button>
                </div>
                <div className="w-20 text-right font-semibold">{formatINR(l.lineTotal)}</div>
                <button aria-label={`Remove ${l.name}`} className="btn-ghost !px-2 !py-1.5 text-danger" onClick={() => removeItem(l)}><Trash2 className="h-4 w-4" aria-hidden /></button>
              </div>
            ))}
          </div>

          <div className="card-elevated mt-8 p-6">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Delivery charge</dt><dd>{deliveryCharge === 0 ? "FREE" : formatINR(deliveryCharge)}</dd></div>
              {deliveryCharge > 0 && (
                <p className="text-xs text-text-secondary">Free delivery on orders above {formatINR(STORE_CONFIG.freeDeliveryThreshold)}.</p>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-lg font-bold">
                <dt>Total</dt><dd className="text-primary">{formatINR(grandTotal)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Link href="/menu" className="btn-ghost">Continue Shopping</Link>
              <Link href="/checkout" className={`btn-primary ${pending ? "opacity-70" : ""}`}>
                Proceed to Checkout <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

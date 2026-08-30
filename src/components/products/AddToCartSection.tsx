"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function AddToCartSection({ productId, isAvailable, minQty, maxQty, stock }: {
  productId: string;
  isAvailable: boolean;
  minQty: number;
  maxQty: number | null;
  stock: number | null;
}) {
  const [qty, setQty] = useState(minQty);
  const [pending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  const upperBound = Math.min(maxQty ?? 99, stock ?? 99, 99);

  if (!isAvailable) {
    return (
      <div className="mt-8">
        <span className="badge bg-danger/20 text-danger">Sold Out — check back soon</span>
      </div>
    );
  }

  async function addToCart() {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: qty })
    });
    if (res.status === 401) {
      push("Please log in to add items to your cart.", "info");
      router.push("/auth/login?next=/cart");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      push(data?.error ?? "Could not add to cart.", "error");
      return;
    }
    push("Added to cart.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-8 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <button aria-label="Decrease quantity" className="btn-ghost !px-3 !py-2.5" onClick={() => setQty(Math.max(minQty, qty - 1))} disabled={qty <= minQty}>
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <span className="w-10 text-center text-lg font-semibold" aria-live="polite">{qty}</span>
        <button aria-label="Increase quantity" className="btn-ghost !px-3 !py-2.5" onClick={() => setQty(Math.min(upperBound, qty + 1))} disabled={qty >= upperBound}>
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <button className="btn-primary flex-1 py-3 text-base" onClick={addToCart} disabled={pending}>
        <ShoppingBag className="h-5 w-5" aria-hidden />
        {pending ? "Adding..." : "Add to Cart"}
      </button>
    </div>
  );
}

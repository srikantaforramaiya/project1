"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Leaf, Flame } from "lucide-react";
import { formatINR } from "@/lib/store-config";
import { useToast } from "@/components/ui/toast";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: string | number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  categoryName: string;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);
  const { push } = useToast();
  const router = useRouter();

  async function addToCart() {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: qty })
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
    push(`${product.name} added to cart.`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
    startTransition(() => router.refresh());
  }

  const soldOut = !product.isAvailable;

  return (
    <article className="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-neon-sm">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-surface-elevated">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden>🍽️</div>
        )}
        {soldOut && (
          <span className="badge absolute left-3 top-3 bg-danger/90 text-white">Sold Out</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-text-secondary">{product.categoryName}</span>
          {product.isVegetarian ? (
            <span className="flex items-center gap-1 text-[11px] text-success" title="Vegetarian"><Leaf className="h-3 w-3" aria-hidden /> Veg</span>
          ) : (
            <span className="text-[11px] text-danger" title="Non-vegetarian">Non-veg</span>
          )}
          {product.isSpicy && <span className="text-[11px] text-warning" title="Spicy"><Flame className="inline h-3 w-3" aria-hidden /> Spicy</span>}
        </div>
        <h3 className="font-semibold leading-tight">
          <Link href={`/product/${product.slug}`} className="hover:text-primary">{product.name}</Link>
        </h3>
        <p className="line-clamp-2 text-sm text-text-secondary">{product.shortDescription}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-primary">{formatINR(product.price)}</span>
          {!soldOut && (
            <div className="flex items-center gap-1.5">
              <button aria-label="Decrease quantity" className="btn-ghost !px-2 !py-1.5" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-3.5 w-3.5" aria-hidden /></button>
              <span className="w-6 text-center text-sm" aria-live="polite">{qty}</span>
              <button aria-label="Increase quantity" className="btn-ghost !px-2 !py-1.5" onClick={() => setQty(Math.min(20, qty + 1))}><Plus className="h-3.5 w-3.5" aria-hidden /></button>
              <button
                className={`btn-primary !px-3 !py-1.5 text-xs ${justAdded ? "animate-pop" : ""}`}
                onClick={addToCart}
                disabled={pending}
              >
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                {justAdded ? "Added!" : "Add"}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

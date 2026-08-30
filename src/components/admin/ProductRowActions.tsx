"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Pencil, Eye, EyeOff, Star } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ProductRowActions({ productId, isAvailable, isFeatured, archived }: {
  productId: string; isAvailable: boolean; isFeatured: boolean; archived: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();

  async function toggle(field: "isAvailable" | "isFeatured", value: boolean, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    const res = await fetch(`/api/admin/products/${productId}/toggle`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value })
    });
    if (!res.ok) { push("Update failed.", "error"); return; }
    push("Product updated.");
    router.refresh();
  }

  async function archive() {
    if (!confirm("Archive this product? It will no longer appear to customers. Existing order history will not be affected.")) return;
    const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    if (!res.ok) { push("Archive failed.", "error"); return; }
    push("Product archived.");
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      <Link href={`/admin/products/${productId}`} className="btn-ghost !px-2 !py-1.5" aria-label="Edit product"><Pencil className="h-3.5 w-3.5" aria-hidden /></Link>
      {!archived && (
        <>
          <button onClick={() => toggle("isAvailable", !isAvailable)} className="btn-ghost !px-2 !py-1.5" aria-label={isAvailable ? "Mark sold out" : "Mark available"}>
            {isAvailable ? <EyeOff className="h-3.5 w-3.5 text-danger" aria-hidden /> : <Eye className="h-3.5 w-3.5 text-success" aria-hidden />}
          </button>
          <button onClick={() => toggle("isFeatured", !isFeatured)} className="btn-ghost !px-2 !py-1.5" aria-label="Toggle featured">
            <Star className={`h-3.5 w-3.5 ${isFeatured ? "fill-warning text-warning" : "text-text-secondary"}`} aria-hidden />
          </button>
          <button onClick={archive} className="btn-ghost !px-2 !py-1.5" aria-label="Archive product"><Archive className="h-3.5 w-3.5 text-danger" aria-hidden /></button>
        </>
      )}
    </div>
  );
}

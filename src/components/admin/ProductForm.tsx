"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { productSchema } from "@/lib/validations";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

type Category = { id: string; name: string };

export type ProductFormValues = {
  name: string; slug: string; sku: string; categoryId: string; shortDescription: string;
  description: string; price: string; compareAtPrice: string; imageUrl: string;
  isVegetarian: boolean; isVegan: boolean; isSpicy: boolean; spiceLevel: number;
  preparationTimeMinutes: number; trackInventory: boolean; stockQuantity: string;
  minimumOrderQuantity: number; maximumOrderQuantity: string;
  isAvailable: boolean; isFeatured: boolean; displayOrder: number;
};

const EMPTY: ProductFormValues = {
  name: "", slug: "", sku: "", categoryId: "", shortDescription: "", description: "", price: "", compareAtPrice: "",
  imageUrl: "", isVegetarian: true, isVegan: false, isSpicy: false, spiceLevel: 0, preparationTimeMinutes: 15,
  trackInventory: false, stockQuantity: "", minimumOrderQuantity: 1, maximumOrderQuantity: "",
  isAvailable: true, isFeatured: false, displayOrder: 0
};

export function ProductForm({ categories, initial }: { categories: Category[]; initial?: ProductFormValues }) {
  const router = useRouter();
  const { push } = useToast();
  const [values, setValues] = useState<ProductFormValues>(initial ?? EMPTY);
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = productSchema.safeParse({
      ...values,
      price: Number(values.price),
      compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : null,
      stockQuantity: values.trackInventory && values.stockQuantity !== "" ? Number(values.stockQuantity) : null,
      maximumOrderQuantity: values.maximumOrderQuantity ? Number(values.maximumOrderQuantity) : null
    });
    if (!parsed.success) {
      push(parsed.error.issues[0]?.message ?? "Please fix the form errors.", "error");
      return;
    }
    setPending(true);
    const res = await fetch(isEdit ? window.location.pathname : "/api/admin/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data)
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      push(data?.error ?? "Save failed.", "error");
      return;
    }
    push(isEdit ? "Product updated." : "Product created.");
    router.push("/admin/products");
    router.refresh();
  }

  const boolField = (key: keyof ProductFormValues, label: string) => (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <input type="checkbox" checked={Boolean(values[key])} onChange={(e) => set(key, e.target.checked as never)} className="accent-primary" /> {label}
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="card mt-6 grid max-w-3xl gap-4 p-6 sm:grid-cols-2">
      <Field id="pf-name" label="Product Name" value={values.name} onChange={(v) => set("name", v)} required full />
      <Field id="pf-sku" label="SKU" value={values.sku} onChange={(v) => set("sku", v)} required />
      <div>
        <label className="label" htmlFor="pf-category">Category</label>
        <select id="pf-category" className="input" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Field id="pf-short" label="Short Description" value={values.shortDescription} onChange={(v) => set("shortDescription", v)} required full maxLength={200} />
      <div className="sm:col-span-2">
        <label className="label" htmlFor="pf-desc">Full Description</label>
        <textarea id="pf-desc" rows={3} className="input" value={values.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <Field id="pf-price" label="Price (₹)" type="number" value={values.price} onChange={(v) => set("price", v)} required />
      <Field id="pf-compare" label="Compare-at Price (₹, optional)" type="number" value={values.compareAtPrice} onChange={(v) => set("compareAtPrice", v)} />
      <Field id="pf-image" label="Image URL" type="url" value={values.imageUrl} onChange={(v) => set("imageUrl", v)} full hint="Dev mode accepts external image URLs; connect Cloudinary/S3 for uploads in production." />
      <Field id="pf-prep" label="Preparation Time (minutes)" type="number" value={String(values.preparationTimeMinutes)} onChange={(v) => set("preparationTimeMinutes", Number(v))} />
      <Field id="pf-spice" label="Spice Level (0–3)" type="number" value={String(values.spiceLevel)} onChange={(v) => set("spiceLevel", Number(v))} />
      <Field id="pf-min" label="Minimum Order Quantity" type="number" value={String(values.minimumOrderQuantity)} onChange={(v) => set("minimumOrderQuantity", Number(v))} />
      <Field id="pf-max" label="Maximum Order Quantity (optional)" type="number" value={values.maximumOrderQuantity} onChange={(v) => set("maximumOrderQuantity", v)} />
      {boolField("trackInventory", "Track inventory")}
      {values.trackInventory && <Field id="pf-stock" label="Stock Quantity" type="number" value={values.stockQuantity} onChange={(v) => set("stockQuantity", v)} />}
      <div className="flex flex-wrap gap-5 sm:col-span-2">
        {boolField("isVegetarian", "Vegetarian")}
        {boolField("isVegan", "Vegan")}
        {boolField("isSpicy", "Spicy")}
        {boolField("isAvailable", "Available")}
        {boolField("isFeatured", "Featured")}
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
}

function Field({ id, label, value, onChange, type = "text", required, full, hint, maxLength }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; full?: boolean; hint?: string; maxLength?: number;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type={type} className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required} maxLength={maxLength} step={type === "number" ? "0.01" : undefined} />
      {hint && <p className="field-error">{hint}</p>}
    </div>
  );
}


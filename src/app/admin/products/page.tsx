import Link from "next/link";
import Image from "next/image";
import { listProducts } from "@/services/catalog-products.service";
import { listCategories } from "@/services/catalog-categories.service";
import { formatINR } from "@/lib/store-config";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { Archive } from "lucide-react";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k] as string | undefined);

  const [categories, result] = await Promise.all([
    listCategories(true),
    listProducts({
      search: get("search"),
      category: get("category"),
      page: Number(get("page") ?? 1),
      pageSize: 20,
      includeArchived: get("archived") === "true"
    })
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary !px-4 !py-2 text-xs">+ Add Product</Link>
      </div>

      <form action="/admin/products" method="get" className="mt-4 flex flex-wrap items-center gap-3">
        <input type="search" name="search" defaultValue={get("search")} placeholder="Search products..." className="input max-w-xs" aria-label="Search products" />
        <select name="category" defaultValue={get("category") ?? ""} className="input max-w-[180px]" aria-label="Category filter">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" name="archived" value="true" defaultChecked={get("archived") === "true"} className="accent-primary" /> Show archived
        </label>
        <button className="btn-secondary !px-4 !py-2 text-xs">Filter</button>
      </form>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-base min-w-[900px]">
          <thead>
            <tr>
              <th>Image</th><th>Product</th><th>SKU</th><th>Category</th><th>Price</th>
              <th>Availability</th><th>Inventory</th><th>Featured</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((p) => (
              <tr key={p.id} className={`border-t border-border ${p.deletedAt ? "opacity-50" : ""}`}>
                <td>
                  <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-surface-elevated">
                    {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />}
                  </div>
                </td>
                <td><Link href={`/product/${p.slug}`} className="font-medium hover:text-primary">{p.name}</Link></td>
                <td className="font-mono text-xs text-text-secondary">{p.sku}</td>
                <td className="text-text-secondary">{p.category.name}</td>
                <td className="font-semibold">{formatINR(p.price.toString())}</td>
                <td>{p.isAvailable ? <span className="badge bg-success/10 text-success">Available</span> : <span className="badge bg-danger/10 text-danger">Sold Out</span>}</td>
                <td className="text-text-secondary">{p.trackInventory ? `${p.stockQuantity ?? 0} in stock` : "Unlimited"}</td>
                <td>{p.isFeatured ? "★" : "—"}</td>
                <td><ProductRowActions productId={p.id} isAvailable={p.isAvailable} isFeatured={p.isFeatured} archived={Boolean(p.deletedAt)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.items.length === 0 && (
          <div className="p-10 text-center text-sm text-text-secondary"><Archive className="mx-auto mb-2 h-8 w-8" aria-hidden /> No products found.</div>
        )}
      </div>
      <p className="mt-3 text-xs text-text-secondary">{result.total} product(s) · page {result.page} of {result.totalPages}</p>
    </div>
  );
}

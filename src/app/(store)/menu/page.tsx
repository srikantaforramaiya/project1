import Link from "next/link";
import type { Metadata } from "next";
import { listProducts } from "@/services/catalog-products.service";
import { listCategories } from "@/services/catalog-categories.service";
import { ProductCard } from "@/components/products/ProductCard";
import { SearchX } from "lucide-react";

export const metadata: Metadata = {
  title: "Menu",
  description: "Browse our full menu — breakfast, snacks, meals, sweets and beverages."
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function param(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function MenuPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const search = param(sp, "search");
  const category = param(sp, "category");
  const sort = param(sp, "sort") ?? "name-asc";
  const veg = param(sp, "veg") === "1";
  const availableOnly = param(sp, "available") !== "0";
  const page = Number(param(sp, "page") ?? 1);

  const [categories, result] = await Promise.all([
    listCategories(),
    listProducts({
      search,
      category,
      vegetarian: veg || undefined,
      availableOnly,
      sort: sort as "name-asc" | "price-asc" | "price-desc" | "newest" | "name-desc",
      page,
      pageSize: 12
    })
  ]);

  const buildQuery = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { search, category, sort, veg: veg ? "1" : undefined, available: availableOnly ? undefined : "0" };
    for (const [k, v] of Object.entries({ ...current, ...overrides })) {
      if (v) params.set(k, v);
    }
    return `/menu?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Our Menu</h1>
      <p className="mt-1 text-text-secondary">Freshly prepared local favourites.</p>

      <form action="/menu" method="get" className="mt-6 flex flex-wrap items-center gap-3" role="search">
        <input type="search" name="search" defaultValue={search} placeholder="Search dishes..." className="input max-w-xs" aria-label="Search dishes" />
        <select name="category" defaultValue={category ?? ""} className="input max-w-[180px]" aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="input max-w-[180px]" aria-label="Sort products">
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" name="veg" value="1" defaultChecked={veg} className="accent-primary" /> Veg only
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" name="available" value="1" defaultChecked={availableOnly} className="accent-primary" /> Available only
        </label>
        <button type="submit" className="btn-primary">Apply</button>
      </form>

      {result.items.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center gap-3 py-16 text-center">
          <SearchX className="h-10 w-10 text-text-secondary" aria-hidden />
          <p className="text-lg font-semibold">No dishes match your search.</p>
          <p className="text-sm text-text-secondary">Try a different keyword or clear the filters.</p>
          <Link href="/menu" className="btn-secondary mt-2">Clear Filters</Link>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-text-secondary">{result.total} item(s)</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((p) => (
              <ProductCard key={p.id} product={{ ...p, price: p.price.toString(), categoryName: p.category.name }} />
            ))}
          </div>
          {result.totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-2" aria-label="Pagination">
              {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildQuery({ page: String(p) })}
                  className={p === result.page ? "btn-primary !px-3.5 !py-2 text-xs" : "btn-ghost !px-3.5 !py-2 text-xs"}
                  aria-current={p === result.page ? "page" : undefined}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

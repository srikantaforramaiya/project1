import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, Leaf, Flame, Truck } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/services/catalog-products.service";
import { ProductCard } from "@/components/products/ProductCard";
import { AddToCartSection } from "@/components/products/AddToCartSection";
import { formatINR } from "@/lib/store-config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: { title: product.name, description: product.shortDescription, images: product.imageUrl ? [product.imageUrl] : [] }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product.categoryId, product.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-text-secondary" aria-label="Breadcrumb">
        <Link href="/menu" className="hover:text-primary">Menu</Link>
        <span aria-hidden> / </span>
        <Link href={`/menu?category=${product.category.slug}`} className="hover:text-primary">{product.category.name}</Link>
        <span aria-hidden> / </span>
        <span className="text-text-primary">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl" aria-hidden>🍽️</div>
          )}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="badge border border-border bg-surface-elevated text-text-secondary">{product.category.name}</span>
            {product.isVegetarian ? (
              <span className="flex items-center gap-1 text-success"><Leaf className="h-4 w-4" aria-hidden /> Vegetarian</span>
            ) : (
              <span className="text-danger">Non-vegetarian</span>
            )}
            {product.isSpicy && (
              <span className="flex items-center gap-1 text-warning"><Flame className="h-4 w-4" aria-hidden /> Spicy (level {product.spiceLevel}/3)</span>
            )}
          </div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-3 text-lg text-text-secondary">{product.shortDescription}</p>
          {product.description && <p className="mt-4 leading-relaxed text-text-secondary">{product.description}</p>}

          <div className="mt-6 flex items-center gap-4">
            <span className="text-4xl font-extrabold text-primary">{formatINR(product.price)}</span>
            {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
              <span className="text-lg text-text-secondary line-through">{formatINR(product.compareAtPrice.toString())}</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden /> Ready in ~{product.preparationTimeMinutes} min</span>
            <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" aria-hidden /> Local delivery</span>
            {product.trackInventory && product.stockQuantity !== null && (
              <span className={product.stockQuantity > 0 ? "text-warning" : "text-danger"}>
                {product.stockQuantity > 0 ? `Only ${product.stockQuantity} left today` : "Sold out for today"}
              </span>
            )}
          </div>

          <AddToCartSection productId={product.id} isAvailable={product.isAvailable} minQty={product.minimumOrderQuantity} maxQty={product.maximumOrderQuantity} stock={product.trackInventory ? product.stockQuantity : null} />

          <p className="mt-6 text-xs text-text-secondary">
            Note: preparation times are estimates. Food images are indicative. Allergen information available on request.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-6 text-2xl font-bold">You May Also Like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={{ ...p, price: p.price.toString(), categoryName: p.category.name }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

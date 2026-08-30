import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listCategories } from "@/services/catalog-categories.service";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    listCategories(true)
  ]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Product</h1>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          categoryId: product.categoryId,
          shortDescription: product.shortDescription,
          description: product.description ?? "",
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toString() : "",
          imageUrl: product.imageUrl ?? "",
          isVegetarian: product.isVegetarian,
          isVegan: product.isVegan,
          isSpicy: product.isSpicy,
          spiceLevel: product.spiceLevel,
          preparationTimeMinutes: product.preparationTimeMinutes,
          trackInventory: product.trackInventory,
          stockQuantity: product.stockQuantity !== null ? String(product.stockQuantity) : "",
          minimumOrderQuantity: product.minimumOrderQuantity,
          maximumOrderQuantity: product.maximumOrderQuantity ? String(product.maximumOrderQuantity) : "",
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
          displayOrder: product.displayOrder
        }}
      />
    </div>
  );
}

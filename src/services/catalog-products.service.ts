import "server-only";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/api-helpers";
import { productSchema } from "@/lib/validations";
import type { Product, Category } from "@prisma/client";
import { Prisma } from "@prisma/client";

export type ProductListFilters = {
  search?: string;
  category?: string;
  vegetarian?: boolean;
  availableOnly?: boolean;
  featuredOnly?: boolean;
  sort?: "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
};

export async function listProducts(filters: ProductListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 12));
  const where: Prisma.ProductWhereInput = {
    deletedAt: filters.includeArchived ? undefined : null,
    isAvailable: filters.availableOnly ? true : undefined,
    isFeatured: filters.featuredOnly ? true : undefined,
    isVegetarian: filters.vegetarian === undefined ? undefined : filters.vegetarian,
    category: filters.category ? { slug: filters.category, isActive: true } : undefined,
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { shortDescription: { contains: filters.search, mode: "insensitive" as const } },
            { description: { contains: filters.search, mode: "insensitive" as const } },
            { category: { name: { contains: filters.search, mode: "insensitive" as const } } }
          ]
        }
      : {})
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price-asc" ? { price: "asc" } :
    filters.sort === "price-desc" ? { price: "desc" } :
    filters.sort === "name-desc" ? { name: "desc" } :
    filters.sort === "newest" ? { createdAt: "desc" } :
    { name: "asc" };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [orderBy],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, deletedAt: null },
    include: { category: true, images: { orderBy: { displayOrder: "asc" } } }
  });
}

export async function getRelatedProducts(categoryId: string, excludeId: string, take = 4) {
  return prisma.product.findMany({
    where: { categoryId, deletedAt: null, isAvailable: true, id: { not: excludeId } },
    include: { category: { select: { name: true, slug: true } } },
    take
  });
}

async function uniqueSlug(name: string, currentId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  for (;;) {
    const clash = await prisma.product.findUnique({ where: { slug } });
    if (!clash || clash.id === currentId) return slug;
    slug = `${base}-${++i}`;
  }
}

export async function createProduct(input: unknown) {
  const data = productSchema.parse(input);
  const slug = data.slug ? data.slug : await uniqueSlug(data.name);
  return prisma.product.create({
    data: {
      name: data.name,
      slug,
      sku: data.sku,
      categoryId: data.categoryId,
      shortDescription: data.shortDescription,
      description: data.description || null,
      price: new Prisma.Decimal(data.price.toFixed(2)),
      compareAtPrice: data.compareAtPrice ? new Prisma.Decimal(data.compareAtPrice.toFixed(2)) : null,
      imageUrl: data.imageUrl || null,
      isVegetarian: data.isVegetarian,
      isVegan: data.isVegan,
      isSpicy: data.isSpicy,
      spiceLevel: data.spiceLevel,
      preparationTimeMinutes: data.preparationTimeMinutes,
      trackInventory: data.trackInventory,
      stockQuantity: data.stockQuantity ?? null,
      minimumOrderQuantity: data.minimumOrderQuantity,
      maximumOrderQuantity: data.maximumOrderQuantity ?? null,
      isAvailable: data.isAvailable,
      isFeatured: data.isFeatured,
      displayOrder: data.displayOrder
    }
  });
}

export async function updateProduct(id: string, input: unknown) {
  const data = productSchema.parse(input);
  const slug = data.slug ? data.slug : await uniqueSlug(data.name, id);
  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      slug,
      sku: data.sku,
      categoryId: data.categoryId,
      shortDescription: data.shortDescription,
      description: data.description || null,
      price: new Prisma.Decimal(data.price.toFixed(2)),
      compareAtPrice: data.compareAtPrice ? new Prisma.Decimal(data.compareAtPrice.toFixed(2)) : null,
      imageUrl: data.imageUrl || null,
      isVegetarian: data.isVegetarian,
      isVegan: data.isVegan,
      isSpicy: data.isSpicy,
      spiceLevel: data.spiceLevel,
      preparationTimeMinutes: data.preparationTimeMinutes,
      trackInventory: data.trackInventory,
      stockQuantity: data.stockQuantity ?? null,
      minimumOrderQuantity: data.minimumOrderQuantity,
      maximumOrderQuantity: data.maximumOrderQuantity ?? null,
      isAvailable: data.isAvailable,
      isFeatured: data.isFeatured,
      displayOrder: data.displayOrder
    }
  });
}

/** Soft-delete (archive). Products referenced by historical orders are never hard-deleted. */
export async function archiveProduct(id: string): Promise<void> {
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isAvailable: false } });
}

export async function hardDeleteProductIfUnused(id: string): Promise<boolean> {
  const used = await prisma.orderItem.findFirst({ where: { productId: id } });
  if (used) return false;
  await prisma.product.delete({ where: { id } });
  return true;
}

export async function toggleProductAvailability(id: string, isAvailable: boolean) {
  return prisma.product.update({ where: { id }, data: { isAvailable } });
}

export async function toggleProductFeatured(id: string, isFeatured: boolean) {
  return prisma.product.update({ where: { id }, data: { isFeatured } });
}

export type ProductWithCategory = Product & { category: Category };


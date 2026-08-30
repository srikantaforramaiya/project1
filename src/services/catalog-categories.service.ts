import "server-only";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/api-helpers";
import { categorySchema } from "@/lib/validations";

export async function listCategories(includeInactive = false) {
  return prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
  });
}

export async function listCategoriesWithCounts() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { deletedAt: null, isAvailable: true } } } } }
  });
}

async function uniqueCategorySlug(name: string, currentId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  for (;;) {
    const clash = await prisma.category.findUnique({ where: { slug } });
    if (!clash || clash.id === currentId) return slug;
    slug = `${base}-${++i}`;
  }
}

export async function createCategory(input: unknown) {
  const data = categorySchema.parse(input);
  return prisma.category.create({
    data: {
      name: data.name,
      slug: await uniqueCategorySlug(data.name),
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      displayOrder: data.displayOrder,
      isActive: data.isActive
    }
  });
}

export async function updateCategory(id: string, input: unknown) {
  const data = categorySchema.parse(input);
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new Error("Category not found.");
  return prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: existing.name === data.name ? existing.slug : await uniqueCategorySlug(data.name, id),
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      displayOrder: data.displayOrder,
      isActive: data.isActive
    }
  });
}

/** Archive a category. Blocks deletion when products still reference it. */
export async function archiveCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const count = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
  if (count > 0) {
    return { ok: false, error: `This category still has ${count} product(s). Move them to another category first.` };
  }
  await prisma.category.update({ where: { id }, data: { isActive: false } });
  return { ok: true };
}

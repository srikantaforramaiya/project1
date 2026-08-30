import { listCategories } from "@/services/catalog-categories.service";
import { CategoryManager } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  const categories = await listCategories(true);
  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}

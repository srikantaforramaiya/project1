import { listCategories } from "@/services/catalog-categories.service";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await listCategories(true);
  return (
    <div>
      <h1 className="text-2xl font-bold">Add Product</h1>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}

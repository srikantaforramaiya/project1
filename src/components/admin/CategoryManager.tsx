"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Archive } from "lucide-react";

type Category = { id: string; name: string; slug: string; description: string | null; imageUrl: string | null; displayOrder: number; isActive: boolean };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories";
    const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { push(data?.error ?? "Save failed.", "error"); return; }
    push(editing ? "Category updated." : "Category created.");
    setEditing(null);
    setCreating(false);
    router.refresh();
  }

  async function archive(c: Category) {
    if (!confirm(`Archive category "${c.name}"? Categories with active products cannot be archived.`)) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) { push(data?.error ?? "Archive failed.", "error"); return; }
    push("Category archived.");
    router.refresh();
  }

  const showForm = creating || editing !== null;
  const current = editing;

  return (
    <div className="mt-6">
      <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => { setCreating(true); setEditing(null); }} disabled={showForm}>
        <Plus className="h-4 w-4" aria-hidden /> Add Category
      </button>

      {showForm && (
        <form onSubmit={save} className="card mt-4 grid max-w-2xl gap-3 p-5 sm:grid-cols-2">
          <input name="name" defaultValue={current?.name} placeholder="Category name" className="input" required key={current?.id ?? "new"} />
          <input name="displayOrder" type="number" defaultValue={current?.displayOrder ?? 0} placeholder="Display order" className="input" />
          <input name="imageUrl" type="url" defaultValue={current?.imageUrl ?? ""} placeholder="Image URL (optional)" className="input sm:col-span-2" />
          <input name="description" defaultValue={current?.description ?? ""} placeholder="Description (optional)" className="input sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="isActive" value="true" defaultChecked={current ? current.isActive : true} className="accent-primary" /> Active
          </label>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" className="btn-ghost" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? "Save" : "Create"}</button>
          </div>
        </form>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="table-base min-w-[600px]">
          <thead><tr><th>Name</th><th>Slug</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className={`border-t border-border ${c.isActive ? "" : "opacity-50"}`}>
                <td className="font-medium">{c.name}</td>
                <td className="font-mono text-xs text-text-secondary">{c.slug}</td>
                <td>{c.displayOrder}</td>
                <td>{c.isActive ? <span className="badge bg-success/10 text-success">Active</span> : <span className="badge bg-danger/10 text-danger">Archived</span>}</td>
                <td>
                  <div className="flex gap-1.5">
                    <button className="btn-ghost !px-2 !py-1.5" aria-label={`Edit ${c.name}`} onClick={() => { setEditing(c); setCreating(false); }}><Pencil className="h-3.5 w-3.5" aria-hidden /></button>
                    <button className="btn-ghost !px-2 !py-1.5" aria-label={`Archive ${c.name}`} onClick={() => archive(c)}><Archive className="h-3.5 w-3.5 text-danger" aria-hidden /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

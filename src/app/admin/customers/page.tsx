import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatDateTimeIST } from "@/lib/store-config";
import { CustomerRowActions } from "@/components/admin/CustomerRowActions";

type SearchParams = Promise<{ search?: string }>;

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const { search } = await searchParams;
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {})
  };
  const customers = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true, isActive: true,
      orders: { select: { grandTotal: true, createdAt: true } }
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Customers</h1>
      <form action="/admin/customers" method="get" className="mt-4 flex gap-3">
        <input type="search" name="search" defaultValue={search} placeholder="Search name, email, phone..." className="input max-w-xs" aria-label="Search customers" />
        <button className="btn-secondary !px-4 !py-2 text-xs">Search</button>
      </form>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-base min-w-[850px]">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Orders</th><th>Lifetime Spend</th><th>Last Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {customers.map((c) => {
              const spend = c.orders.reduce((s, o) => s + Number(o.grandTotal), 0);
              const last = c.orders.map((o) => o.createdAt).sort((a, b) => b.getTime() - a.getTime())[0];
              return (
                <tr key={c.id} className={`border-t border-border ${c.isActive ? "" : "opacity-60"}`}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-text-secondary">{c.email}</td>
                  <td className="text-text-secondary">{c.phone}</td>
                  <td className="text-text-secondary">{formatDateTimeIST(c.createdAt)}</td>
                  <td>{c.orders.length}</td>
                  <td className="font-semibold">₹{spend.toLocaleString("en-IN")}</td>
                  <td className="text-text-secondary">{last ? formatDateTimeIST(last) : "—"}</td>
                  <td>{c.isActive ? <span className="badge bg-success/10 text-success">Active</span> : <span className="badge bg-danger/10 text-danger">Deactivated</span>}</td>
                  <td><CustomerRowActions customerId={c.id} isActive={c.isActive} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="p-10 text-center text-sm text-text-secondary">No customers found. <Link href="/admin/customers" className="text-primary">Clear search</Link></div>
        )}
      </div>
    </div>
  );
}

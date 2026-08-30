import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma, OrderStatus, PaymentStatus } from "@prisma/client";
import { formatINR, formatDateTimeIST, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/store-config";
import { Search } from "lucide-react";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
const p = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const search = p(sp.search);
  const status = p(sp.status) as OrderStatus | undefined;
  const payStatus = p(sp.payment) as PaymentStatus | undefined;
  const page = Number(p(sp.page) ?? 1);

  const where: Prisma.OrderWhereInput = {
    orderStatus: status ?? undefined,
    paymentStatus: payStatus ?? undefined,
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { customerName: { contains: search, mode: "insensitive" } },
            { customerEmail: { contains: search, mode: "insensitive" } },
            { customerPhone: { contains: search } }
          ]
        }
      : {})
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 25 }),
    prisma.order.count({ where })
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>

      <form action="/admin/orders" method="get" className="mt-4 flex flex-wrap items-center gap-3">
        <input type="search" name="search" defaultValue={search} placeholder="Order #, name, email, phone..." className="input max-w-xs" aria-label="Search orders" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[200px]" aria-label="Order status filter">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="payment" defaultValue={payStatus ?? ""} className="input max-w-[180px]" aria-label="Payment status filter">
          <option value="">All payments</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-secondary !px-4 !py-2 text-xs"><Search className="h-3.5 w-3.5" aria-hidden /> Filter</button>
      </form>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-base min-w-[850px]">
          <thead><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Date</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td><Link href={`/admin/orders/${o.orderNumber}`} className="font-mono text-xs text-primary hover:underline">{o.orderNumber}</Link></td>
                <td>{o.customerName}</td>
                <td className="text-text-secondary">{o.customerPhone}</td>
                <td className="text-text-secondary">{formatDateTimeIST(o.createdAt)}</td>
                <td className="text-text-secondary">{o._count?.items ?? "—"}</td>
                <td className="font-semibold">{formatINR(o.grandTotal.toString())}</td>
                <td><span className="badge bg-surface-elevated text-text-secondary">{PAYMENT_STATUS_LABELS[o.paymentStatus]}</span></td>
                <td><span className="badge bg-surface-elevated text-text-secondary">{ORDER_STATUS_LABELS[o.orderStatus]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="p-10 text-center text-sm text-text-secondary">No orders match your filters.</div>}
      </div>
      <p className="mt-3 text-xs text-text-secondary">{total} order(s) · page {page}</p>
    </div>
  );
}

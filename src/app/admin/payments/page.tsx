import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma, PaymentRecordStatus } from "@prisma/client";
import { formatINR, formatDateTimeIST, PAYMENT_STATUS_LABELS } from "@/lib/store-config";
import { env } from "@/lib/env";

type SearchParams = Promise<{ status?: string; search?: string }>;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = sp.status as PaymentRecordStatus | undefined;
  const where: Prisma.PaymentWhereInput = {
    status: status ?? undefined,
    ...(sp.search ? { order: { orderNumber: { contains: sp.search, mode: "insensitive" } } } : {})
  };
  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { order: { select: { orderNumber: true, customerName: true } } }
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Payments</h1>
        <span className="badge bg-surface-elevated text-text-secondary">
          Gateway: {env.PAYMENT_MODE === "razorpay" ? "Razorpay — Configured ✓" : "Mock (development only)"}
        </span>
      </div>

      <form action="/admin/payments" method="get" className="mt-4 flex flex-wrap gap-3">
        <input type="search" name="search" defaultValue={sp.search} placeholder="Search order number..." className="input max-w-xs" aria-label="Search payments" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[180px]" aria-label="Payment status">
          <option value="">All statuses</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-secondary !px-4 !py-2 text-xs">Filter</button>
      </form>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-base min-w-[900px]">
          <thead><tr><th>Payment ID</th><th>Order</th><th>Customer</th><th>Provider</th><th>Provider Txn ID</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="font-mono text-xs text-text-secondary">{p.id.slice(-8)}</td>
                <td><Link href={`/admin/orders/${p.order.orderNumber}`} className="font-mono text-xs text-primary hover:underline">{p.order.orderNumber}</Link></td>
                <td>{p.order.customerName}</td>
                <td className="text-text-secondary">{p.provider}</td>
                <td className="font-mono text-xs text-text-secondary">{p.providerPaymentId ?? p.providerOrderId ?? "—"}</td>
                <td className="font-semibold">{formatINR(p.amount.toString())}</td>
                <td className="text-text-secondary">{p.paymentMethod}</td>
                <td>{p.status === "PAID" ? <span className="badge bg-success/10 text-success">Paid</span> : <span className="badge bg-surface-elevated text-text-secondary">{p.status}</span>}</td>
                <td className="text-text-secondary">{formatDateTimeIST(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <div className="p-10 text-center text-sm text-text-secondary">No payments found.</div>}
      </div>
      <p className="mt-3 text-xs text-text-secondary">Gateway secret keys are never stored in the database or exposed in this interface.</p>
    </div>
  );
}

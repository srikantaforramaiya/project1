import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR, formatDateTimeIST, PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from "@/lib/store-config";

export default async function AccountOverview() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Account Overview</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><dt className="text-sm text-text-secondary">Name</dt><dd className="mt-1 font-semibold">{user.name}</dd></div>
        <div className="card p-4"><dt className="text-sm text-text-secondary">Email</dt><dd className="mt-1 font-semibold">{user.email}</dd></div>
        <div className="card p-4"><dt className="text-sm text-text-secondary">Phone</dt><dd className="mt-1 font-semibold">{user.phone}</dd></div>
      </dl>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        <Link href="/account/orders" className="text-sm text-primary hover:underline">View all →</Link>
      </div>
      {orders.length === 0 ? (
        <div className="card mt-4 p-10 text-center text-sm text-text-secondary">
          You haven&apos;t placed an order yet. <Link href="/menu" className="text-primary hover:underline">Browse the menu</Link>
        </div>
      ) : (
        <div className="card mt-4 divide-y divide-border">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm hover:bg-surface-elevated">
              <span className="font-mono text-xs text-primary">{o.orderNumber}</span>
              <span className="text-text-secondary">{formatDateTimeIST(o.createdAt)}</span>
              <span>{formatINR(o.grandTotal)}</span>
              <span className="badge bg-surface-elevated text-text-secondary">{PAYMENT_STATUS_LABELS[o.paymentStatus]}</span>
              <span className="badge bg-surface-elevated text-text-secondary">{ORDER_STATUS_LABELS[o.orderStatus]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

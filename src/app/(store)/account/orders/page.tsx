import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";
import { formatINR, formatDateTimeIST, PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from "@/lib/store-config";
import { Package } from "lucide-react";

type SearchParams = Promise<{ filter?: string }>;

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" }
];

const ACTIVE_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

export default async function MyOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { filter = "all" } = await searchParams;
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: {
      userId: user.id,
      orderStatus: filter === "active" ? { in: ACTIVE_STATUSES } :
        filter === "delivered" ? "DELIVERED" :
        filter === "cancelled" ? { in: ["CANCELLED", "REFUND_PENDING", "REFUNDED"] } : undefined
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">My Orders</h1>
      <nav className="mt-4 flex gap-2" aria-label="Order filters">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/account/orders" : `/account/orders?filter=${f.key}`}
            className={filter === f.key ? "btn-primary !px-4 !py-2 text-xs" : "btn-ghost !px-4 !py-2 text-xs"}
            aria-current={filter === f.key ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center gap-3 py-14 text-center">
          <Package className="h-10 w-10 text-text-secondary" aria-hidden />
          <p className="font-semibold">You haven&apos;t placed an order yet.</p>
          <Link href="/menu" className="btn-primary mt-2">Browse Menu</Link>
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-border overflow-x-auto">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <Link href={`/account/orders/${o.orderNumber}`} className="font-mono text-xs text-primary hover:underline">{o.orderNumber}</Link>
                <p className="mt-1 text-xs text-text-secondary">{formatDateTimeIST(o.createdAt)}</p>
              </div>
              <span className="badge bg-surface-elevated text-text-secondary">{PAYMENT_STATUS_LABELS[o.paymentStatus]}</span>
              <span className="badge bg-surface-elevated text-text-secondary">{ORDER_STATUS_LABELS[o.orderStatus]}</span>
              <span className="font-semibold">{formatINR(o.grandTotal)}</span>
              <Link href={`/account/orders/${o.orderNumber}`} className="btn-secondary !px-3 !py-1.5 text-xs">View Details</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

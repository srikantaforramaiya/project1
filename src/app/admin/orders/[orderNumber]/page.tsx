import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByNumberForAdmin } from "@/services/order-status.service";
import { updateOrderStatus } from "@/services/order-status.service";
import { requireAdmin } from "@/lib/auth";
import { formatINR, formatDateTimeIST, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/store-config";
import { StatusChanger } from "@/components/admin/StatusChanger";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const admin = await requireAdmin();
  const order = await getOrderByNumberForAdmin(orderNumber);
  if (!order) notFound();

  const payment = order.payments[0];

  async function changeStatus(newStatus: string, notes: string) {
    "use server";
    const result = await updateOrderStatus({
      orderId: order!.id,
      newStatus: newStatus as Parameters<typeof updateOrderStatus>[0]["newStatus"],
      changedByUserId: admin.id,
      notes: notes || undefined
    });
    if (!result.ok) throw new Error(result.error);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-primary">{order.orderNumber}</h1>
          <p className="text-sm text-text-secondary">Placed {formatDateTimeIST(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <span className="badge bg-surface-elevated text-text-secondary">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>
          <span className="badge bg-surface-elevated text-text-secondary">{ORDER_STATUS_LABELS[order.orderStatus]}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="card p-6 text-sm">
            <h2 className="mb-3 font-semibold">Customer</h2>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-text-secondary">{order.customerEmail} · {order.customerPhone}</p>
            <h3 className="mt-4 text-sm font-medium">Delivery Address</h3>
            <p className="whitespace-pre-line text-text-secondary">{order.deliveryAddressSnapshot}</p>
            {order.customerNotes && <p className="mt-3"><span className="font-medium">Customer notes:</span> <span className="text-text-secondary">{order.customerNotes}</span></p>}
          </section>

          <section className="card p-6 text-sm">
            <h2 className="mb-3 font-semibold">Payment</h2>
            <dl className="space-y-1 text-text-secondary">
              <div className="flex justify-between"><dt>Provider</dt><dd className="text-text-primary">{payment?.provider ?? "—"}</dd></div>
              <div className="flex justify-between"><dt>Method</dt><dd className="text-text-primary">{payment?.paymentMethod ?? "UPI"}</dd></div>
              <div className="flex justify-between"><dt>Provider Order ID</dt><dd className="font-mono text-xs text-text-primary">{payment?.providerOrderId ?? "—"}</dd></div>
              {payment?.upiTransactionId && <div className="flex justify-between"><dt>UPI Transaction</dt><dd className="font-mono text-xs text-text-primary">{payment.upiTransactionId}</dd></div>}
              <div className="flex justify-between"><dt>Amount</dt><dd className="font-semibold text-primary">{formatINR(order.grandTotal.toString())}</dd></div>
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6 text-sm">
            <h2 className="mb-3 font-semibold">Items</h2>
            <ul className="space-y-2">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between border-b border-border pb-2">
                  <span>{i.productNameSnapshot} <span className="text-text-secondary">({i.productSkuSnapshot}) × {i.quantity}</span></span>
                  <span>{formatINR(i.lineTotal.toString())}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 text-text-secondary">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal.toString())}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{formatINR(order.deliveryCharge.toString())}</dd></div>
              <div className="flex justify-between"><dt>Discount</dt><dd>-{formatINR(order.discountAmount.toString())}</dd></div>
              <div className="flex justify-between font-bold text-text-primary"><dt>Grand Total</dt><dd className="text-primary">{formatINR(order.grandTotal.toString())}</dd></div>
            </dl>
          </section>

          <StatusChanger currentStatus={order.orderStatus} changeStatus={changeStatus} />

          <section className="card p-6 text-sm">
            <h2 className="mb-3 font-semibold">Status History</h2>
            <ol className="space-y-2">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="border-b border-border pb-2 last:border-0">
                  <p className="text-text-secondary">
                    {h.oldStatus ? `${ORDER_STATUS_LABELS[h.oldStatus]} → ` : ""}
                    <span className="font-medium text-text-primary">{ORDER_STATUS_LABELS[h.newStatus]}</span>
                    {h.user && <span className="text-xs"> by {h.user.name}</span>}
                  </p>
                  <p className="text-xs text-text-secondary">{formatDateTimeIST(h.createdAt)}{h.notes ? ` · ${h.notes}` : ""}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <Link href="/admin/orders" className="mt-6 inline-block text-sm text-text-secondary hover:text-primary">← Back to Orders</Link>
    </div>
  );
}

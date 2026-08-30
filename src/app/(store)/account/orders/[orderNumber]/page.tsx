import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrderByNumberForUser } from "@/services/order-status.service";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { formatINR, formatDateTimeIST, PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from "@/lib/store-config";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requireUser();
  const order = await getOrderByNumberForUser(orderNumber, user.id);
  if (!order) notFound();

  const payment = order.payments[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-xl font-bold text-primary">{order.orderNumber}</h1>
        <span className="badge bg-surface-elevated text-text-secondary">{ORDER_STATUS_LABELS[order.orderStatus]}</span>
      </div>
      <p className="mt-1 text-sm text-text-secondary">Placed on {formatDateTimeIST(order.createdAt)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="track-heading">
          <h2 id="track-heading" className="mb-4 font-semibold">Order Progress</h2>
          <OrderTimeline order={order} />
        </section>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="items-heading">
            <h2 id="items-heading" className="mb-4 font-semibold">Items</h2>
            <ul className="space-y-2 text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between border-b border-border pb-2">
                  <span>{i.productNameSnapshot} × {i.quantity}</span>
                  <span>{formatINR(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Delivery</dt><dd>{formatINR(order.deliveryCharge)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd className="text-primary">{formatINR(order.grandTotal)}</dd></div>
            </dl>
          </section>

          <section className="card p-6 text-sm" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading" className="mb-3 font-semibold">Delivery Details</h2>
            <p className="whitespace-pre-line text-text-secondary">{order.deliveryAddressSnapshot}</p>
            {order.customerNotes && (
              <p className="mt-3"><span className="font-medium">Your notes:</span> <span className="text-text-secondary">{order.customerNotes}</span></p>
            )}
          </section>

          <section className="card p-6 text-sm" aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="mb-3 font-semibold">Payment</h2>
            <dl className="space-y-1 text-text-secondary">
              <div className="flex justify-between"><dt>Status</dt><dd className="text-text-primary">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd></div>
              <div className="flex justify-between"><dt>Method</dt><dd className="text-text-primary">{payment?.paymentMethod ?? "UPI"}</dd></div>
              {payment?.upiTransactionId && <div className="flex justify-between"><dt>UPI Transaction ID</dt><dd className="font-mono text-xs text-text-primary">{payment.upiTransactionId}</dd></div>}
            </dl>
            {order.paymentStatus !== "PAID" && order.orderStatus !== "CANCELLED" && (
              <Link href={`/checkout/pay/${order.orderNumber}`} className="btn-primary mt-4 w-full">Complete Payment</Link>
            )}
          </section>
        </div>
      </div>

      <Link href="/account/orders" className="mt-6 inline-block text-sm text-text-secondary hover:text-primary">← Back to My Orders</Link>
    </div>
  );
}

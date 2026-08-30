import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrderByNumberForUser } from "@/services/order-status.service";
import { formatINR, formatDateTimeIST, PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS, STORE_CONFIG } from "@/lib/store-config";

export const metadata = { title: "Order Confirmed" };

export default async function OrderSuccessPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requireUser();
  const order = await getOrderByNumberForUser(orderNumber, user.id);
  if (!order) notFound();
  if (order.paymentStatus !== "PAID") {
    // Only show "success" after the server confirms verified payment.
    redirect(`/account/orders/${orderNumber}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="card-elevated p-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden />
        <h1 className="mt-4 text-3xl font-bold">Order Confirmed!</h1>
        <p className="mt-2 text-text-secondary">Thank you, {order.customerName.split(" ")[0]}! A confirmation email is on its way.</p>
        <p className="mt-4 text-sm text-text-secondary">Order Number</p>
        <p className="text-xl font-bold text-primary">{order.orderNumber}</p>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div className="card p-3"><dt className="text-text-secondary">Amount Paid</dt><dd className="mt-1 font-bold text-primary">{formatINR(order.grandTotal)}</dd></div>
          <div className="card p-3"><dt className="text-text-secondary">Payment</dt><dd className="mt-1 font-semibold">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd></div>
          <div className="card p-3"><dt className="text-text-secondary">Status</dt><dd className="mt-1 font-semibold">{ORDER_STATUS_LABELS[order.orderStatus]}</dd></div>
        </dl>

        <ul className="mt-6 space-y-1.5 text-left text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between border-b border-border pb-1.5">
              <span>{i.productNameSnapshot} × {i.quantity}</span>
              <span>{formatINR(i.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 text-left text-sm text-text-secondary">
          <p className="whitespace-pre-line">{order.deliveryAddressSnapshot}</p>
          <p className="mt-2">Placed on {formatDateTimeIST(order.createdAt)} · Estimated preparation ~{STORE_CONFIG.defaultPreparationMinutes} min</p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/account/orders" className="btn-primary">View My Orders</Link>
          <Link href="/menu" className="btn-secondary">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

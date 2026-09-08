import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateOrderStatus } from "@/services/order-status.service";
import { updateOrderStatusSchema } from "@/lib/validations";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { confirmPaymentPaid } from "@/services/payment.service";
import { sendOrderConfirmation, sendOrderCancelled } from "@/services/order-email.service";

type Params = { params: { orderNumber: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const data = updateOrderStatusSchema.parse(await request.json());
    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    if (!order) return jsonError("Order not found.", 404);

    const result = await updateOrderStatus({
      orderId: order.id,
      newStatus: data.status,
      changedByUserId: admin.id,
      notes: data.notes || undefined
    });
    if (!result.ok) return jsonError(result.error ?? "Invalid status change.", 409);

    // Admin manually verifying a direct UPI QR payment: mark the payment PAID + email customer.
    let paymentConfirmed = false;
    if (data.status === "PAYMENT_RECEIVED" && order.paymentStatus !== "PAID") {
      const payment = order.payments[0];
      if (payment) {
        await confirmPaymentPaid({
          payment,
          providerPaymentId: payment.providerPaymentId ?? `UPI-${order.orderNumber}`,
          upiTransactionId: payment.upiTransactionId ?? undefined,
          source: "admin_verify"
        });
        paymentConfirmed = true;
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "PAID" }
        });
        paymentConfirmed = true;
      }
      await sendOrderConfirmation(order.orderNumber);
    }

    // Notify the customer when an admin cancels their order.
    if (data.status === "CANCELLED") {
      await sendOrderCancelled(order.orderNumber, data.notes || undefined);
    }

    return NextResponse.json({ ok: true, paymentConfirmed });
  } catch (err) {
    return handleApiError(err);
  }
}


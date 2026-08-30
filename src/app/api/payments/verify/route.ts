import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { getPaymentProvider, confirmPaymentPaid, markPaymentFailed } from "@/services/payment.service";
import { rateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  orderNumber: z.string().min(5),
  providerPaymentId: z.string().min(3),
  signature: z.string().min(3)
});

/**
 * Server-side payment verification callback. The order is only marked paid when the
 * provider signature is valid — the browser's "success" alone is never trusted.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`pay-verify:${user.id}`, 20, 10 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests.", 429);
    const data = verifySchema.parse(await request.json());

    const order = await prisma.order.findUnique({
      where: { orderNumber: data.orderNumber },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    // Ownership check: a customer may only verify their own order.
    if (!order || order.userId !== user.id) return jsonError("Order not found.", 404);
    const payment = order.payments[0];
    if (!payment || !payment.providerOrderId) return jsonError("Payment not found for this order.", 404);

    const provider = getPaymentProvider();
    const result = await provider.verifyPayment({
      providerOrderId: payment.providerOrderId,
      providerPaymentId: data.providerPaymentId,
      signature: data.signature,
      amountMinorUnits: Math.round(Number(payment.amount) * 100)
    });

    if (!result.valid) {
      await markPaymentFailed(payment.id, result.failureReason ?? "Signature verification failed");
      return jsonError("Payment could not be verified.", 400);
    }

    await confirmPaymentPaid({
      payment,
      providerPaymentId: result.providerPaymentId!,
      upiTransactionId: result.upiTransactionId,
      signature: result.signature,
      source: "client_verify"
    });

    // Fire the confirmation email after verified payment (failure never blocks confirmation).
    const { sendOrderConfirmation } = await import("@/services/order-email.service");
    await sendOrderConfirmation(order.orderNumber);

    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  } catch (err) {
    return handleApiError(err);
  }
}

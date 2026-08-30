import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentProvider, confirmPaymentPaid, markPaymentFailed } from "@/services/payment.service";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { sendOrderConfirmation } from "@/services/order-email.service";

/**
 * Payment webhook. Verifies the raw-body signature before processing and is fully
 * idempotent: duplicate webhooks never double-confirm, double-restock or double-email.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const limit = rateLimit("payment-webhook", 120, 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const provider = getPaymentProvider();
    const signature = request.headers.get("x-webhook-signature") ?? request.headers.get("x-razorpay-signature");

    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      logger.warn("Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = provider.extractWebhookEvent(rawBody);
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: event.providerOrderId },
      orderBy: { createdAt: "desc" }
    });
    if (!payment) {
      logger.warn("Webhook for unknown provider order", { providerOrderId: event.providerOrderId });
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (event.status === "PAID") {
      const { alreadyPaid } = await confirmPaymentPaid({
        payment,
        providerPaymentId: event.providerPaymentId,
        source: "webhook"
      });
      if (!alreadyPaid) {
        const order = await prisma.order.findUnique({ where: { id: payment.orderId }, select: { orderNumber: true } });
        if (order) await sendOrderConfirmation(order.orderNumber);
      }
    } else if (event.status === "FAILED") {
      await markPaymentFailed(payment.id, "Payment failed at provider");
    } else {
      await prisma.payment.updateMany({
        where: { id: payment.id, status: { in: ["CREATED", "PROCESSING"] } },
        data: { status: "CANCELLED" }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("Webhook processing error", { error: String(err) });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

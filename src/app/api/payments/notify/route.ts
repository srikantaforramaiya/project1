import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const schema = z.object({ orderNumber: z.string().min(5) });

/**
 * Customer-side "I have paid" notification for direct UPI QR payments.
 * Marks the payment as PROCESSING (awaiting seller verification) — the order is only
 * confirmed after the admin verifies the UPI credit, never from this call alone.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`upi-notify:${user.id}`, 20, 10 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests.", 429);
    const { orderNumber } = schema.parse(await request.json());

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    if (!order || order.userId !== user.id) return jsonError("Order not found.", 404);
    if (order.paymentStatus === "PAID") return NextResponse.json({ ok: true, alreadyPaid: true });
    const payment = order.payments[0];
    if (!payment) return jsonError("Payment not found.", 404);

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PROCESSING" }
    });
    logger.info("Customer reported UPI payment", { orderNumber, paymentId: payment.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

import "server-only";
import { sendOrderCancelledEmail, sendOrderConfirmationEmail, sendOrderPlacedEmail } from "@/services/email.service";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Order } from "@prisma/client";

/** Send confirmation email after verified payment. Email failure never alters payment status. */
export async function sendOrderConfirmation(orderNumber: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true }
    });
    if (!order) return;
    await sendOrderConfirmationEmail(order as Order & { items: (typeof order)["items"] });
  } catch (err) {
    logger.error("Order confirmation email failed", { orderNumber, error: String(err) });
  }
}

/** Send "order placed" email as soon as the order is saved (payment still pending). */
export async function sendOrderPlaced(orderNumber: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true }
    });
    if (!order) return;
    await sendOrderPlacedEmail(order as Order & { items: (typeof order)["items"] });
  } catch (err) {
    logger.error("Order placed email failed", { orderNumber, error: String(err) });
  }
}

/** Send cancellation email when an order is cancelled. */
export async function sendOrderCancelled(orderNumber: string, reason?: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true }
    });
    if (!order) return;
    await sendOrderCancelledEmail(order as Order & { items: (typeof order)["items"] }, reason);
  } catch (err) {
    logger.error("Order cancellation email failed", { orderNumber, error: String(err) });
  }
}

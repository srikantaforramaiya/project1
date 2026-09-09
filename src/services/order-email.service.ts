import "server-only";
import { sendAdminOrderPlacedEmail, sendOrderCancelledEmail, sendOrderConfirmationEmail, sendOrderOutForDeliveryEmail, sendOrderPlacedEmail } from "@/services/email.service";
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

/** Send the new-order notification to the admin (srikantak1@gmail.com -> srikantak1@gmail.com). */
export async function sendAdminOrderPlaced(orderNumber: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true }
    });
    if (!order) return;
    await sendAdminOrderPlacedEmail(order as Order & { items: (typeof order)["items"] });
  } catch (err) {
    logger.error("Admin order notification failed", { orderNumber, error: String(err) });
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

/** Send "out for delivery" email when the order is dispatched. */
export async function sendOrderOutForDelivery(orderNumber: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true }
    });
    if (!order) return;
    await sendOrderOutForDeliveryEmail(order as Order & { items: (typeof order)["items"] });
  } catch (err) {
    logger.error("Out for delivery email failed", { orderNumber, error: String(err) });
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

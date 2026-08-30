import "server-only";
import { sendOrderConfirmationEmail } from "@/services/email.service";
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

import "server-only";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Order, OrderStatus, Prisma } from "@prisma/client";

export type StatusTransitionResult = { ok: boolean; error?: string };

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_RECEIVED: ["CONFIRMED", "CANCELLED", "REFUND_PENDING"],
  CONFIRMED: ["PREPARING", "CANCELLED", "REFUND_PENDING"],
  PREPARING: ["READY", "CANCELLED", "REFUND_PENDING"],
  READY: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUND_PENDING"],
  OUT_FOR_DELIVERY: ["DELIVERED", "REFUND_PENDING"],
  DELIVERED: ["REFUND_PENDING"],
  CANCELLED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: []
};

export async function updateOrderStatus(params: {
  orderId: string;
  newStatus: OrderStatus;
  changedByUserId: string;
  notes?: string;
}): Promise<StatusTransitionResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: params.orderId } });
    if (!order) return { ok: false, error: "Order not found." };
    if (order.orderStatus === params.newStatus) return { ok: true };

    const allowed = ALLOWED_TRANSITIONS[order.orderStatus] ?? [];
    if (!allowed.includes(params.newStatus)) {
      return { ok: false, error: `Cannot change status from ${order.orderStatus} to ${params.newStatus}.` };
    }

    const data: Prisma.OrderUpdateInput = { orderStatus: params.newStatus };
    if (params.newStatus === "CANCELLED") data.cancelledAt = new Date();
    if (params.newStatus === "PREPARING") data.preparingAt = new Date();
    if (params.newStatus === "READY") data.readyAt = new Date();
    if (params.newStatus === "OUT_FOR_DELIVERY") data.dispatchedAt = new Date();
    if (params.newStatus === "DELIVERED") data.deliveredAt = new Date();
    if (params.newStatus === "CONFIRMED") data.confirmedAt = new Date();

    await tx.order.update({ where: { id: order.id }, data });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: order.orderStatus,
        newStatus: params.newStatus,
        changedByUserId: params.changedByUserId,
        notes: params.notes || null
      }
    });

    // Restock inventory when a tracked order is cancelled before delivery.
    if (params.newStatus === "CANCELLED" && !["DELIVERED", "REFUNDED"].includes(order.orderStatus)) {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id, productId: { not: null } } });
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId! } });
        if (product?.trackInventory) {
          await tx.product.update({ where: { id: product.id }, data: { stockQuantity: { increment: item.quantity } } });
        }
      }
    }

    logger.info("Order status changed", { orderNumber: order.orderNumber, from: order.orderStatus, to: params.newStatus });
    return { ok: true };
  });
}

export async function getOrderByNumberForUser(orderNumber: string, userId: string) {
  return prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { items: true, payments: true, statusHistory: { orderBy: { createdAt: "asc" } } }
  });
}

export async function getOrderByNumberForAdmin(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: true,
      user: true,
      statusHistory: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } }
    }
  });
}

export type FullOrder = NonNullable<Awaited<ReturnType<typeof getOrderByNumberForUser>>>;
export type AdminFullOrder = NonNullable<Awaited<ReturnType<typeof getOrderByNumberForAdmin>>>;

import type { OrderStatus } from "@prisma/client";

/** Server-enforced order status transition map. The UI mirrors this for UX only. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
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

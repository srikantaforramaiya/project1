import type { OrderStatus } from "@prisma/client";

/** Server-enforced order status transition map. The UI mirrors this for UX only.
 *  Admin now manages a simplified 3-stage flow:
 *    Payment Received → Out for Delivery → Delivered.
 *  The legacy intermediate states (CONFIRMED/PREPARING/READY) are kept only so
 *  pre-existing orders can still advance to the next real delivery stage. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAYMENT_RECEIVED", "CANCELLED"],
  PAYMENT_RECEIVED: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUND_PENDING"],
  CONFIRMED: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUND_PENDING"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUND_PENDING"],
  READY: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUND_PENDING"],
  OUT_FOR_DELIVERY: ["DELIVERED", "REFUND_PENDING"],
  DELIVERED: ["REFUND_PENDING"],
  CANCELLED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: []
};

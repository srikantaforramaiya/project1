export const BUSINESS_NAME = "Neon Bites";
export const TAGLINE = "Fresh Local Food. Bold Flavours.";
export const BUSINESS_PHONE = "+91 XXXXX XXXXX";
export const BUSINESS_EMAIL = "orders@example.com";
export const BUSINESS_ADDRESS = "Your Local Address, Bengaluru, India";
export const CURRENCY = "INR";

/** Store configuration — later backed by an admin-editable settings table. */
export const STORE_CONFIG = {
  deliveryEnabled: true,
  deliveryFee: 30,
  freeDeliveryThreshold: 500,
  minimumOrderAmount: 99,
  taxPercent: 0,
  serviceablePostalCodes: ["560001", "560002", "560003", "560004", "560037", "560066", "560100"] as string[],
  defaultPreparationMinutes: 30,
  businessHours: {
    openHour: 8,
    closeHour: 22
  }
};

export function formatINR(amount: string | number | bigint): string {
  const n = typeof amount === "bigint" ? Number(amount) : Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2
  }).format(n);
}

export function formatDateTimeIST(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(date));
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAYMENT_RECEIVED: "Payment Received",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund Pending",
  REFUNDED: "Refunded"
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially Refunded"
};

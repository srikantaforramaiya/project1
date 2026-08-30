import { STORE_CONFIG } from "@/lib/store-config";

/** Server-side total calculation. Client totals are never trusted. */
export function computeTotals(subtotal: number): { subtotal: number; deliveryCharge: number; taxAmount: number; grandTotal: number } {
  const deliveryCharge =
    subtotal <= 0 ? 0 : subtotal >= STORE_CONFIG.freeDeliveryThreshold ? 0 : STORE_CONFIG.deliveryFee;
  const taxAmount = 0;
  const grandTotal = subtotal + deliveryCharge + taxAmount;
  return { subtotal, deliveryCharge, taxAmount, grandTotal };
}

export function isServiceablePin(postalCode: string): boolean {
  return STORE_CONFIG.serviceablePostalCodes.includes(postalCode);
}

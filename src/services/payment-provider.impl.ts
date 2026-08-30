import crypto from "crypto";
import type { PaymentProvider, CreatePaymentOrderResult, VerifyPaymentResult } from "./payment-provider.types";

/**
 * Development-only mock provider. Simulates a UPI intent flow; verifies signatures with the
 * same HMAC construction Razorpay uses so the server-side verification path is exercised.
 * Must never be enabled in production (enforced by env validation in lib/env.ts).
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock-upi";

  private secret(): string {
    return process.env.PAYMENT_PROVIDER_KEY_SECRET || "mock_secret";
  }

  async createPaymentOrder({ orderNumber, amountMinorUnits }: { orderNumber: string; amountMinorUnits: number; customerEmail: string; customerPhone: string }): Promise<CreatePaymentOrderResult> {
    return { providerOrderId: `mock_order_${orderNumber}`, provider: this.name, amount: amountMinorUnits, checkoutUrl: `/checkout/pay/${orderNumber}` };
  }

  async verifyPayment({ providerOrderId, providerPaymentId, signature }: { providerOrderId: string; providerPaymentId: string; signature: string; amountMinorUnits: number }): Promise<VerifyPaymentResult> {
    const expected = crypto.createHmac("sha256", this.secret()).update(`${providerOrderId}|${providerPaymentId}`).digest("hex");
    if (signature === expected) {
      return { valid: true, providerPaymentId, upiTransactionId: `UPI${providerPaymentId.slice(-10).toUpperCase()}`, signature };
    }
    return { valid: false, failureReason: "Invalid payment signature" };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = crypto.createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET || "mock_webhook_secret").update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  extractWebhookEvent(rawBody: string): { providerPaymentId: string; providerOrderId: string; status: "PAID" | "FAILED" | "CANCELLED" } {
    const body = JSON.parse(rawBody) as { providerPaymentId: string; providerOrderId: string; status: "PAID" | "FAILED" | "CANCELLED" };
    return { providerPaymentId: body.providerPaymentId, providerOrderId: body.providerOrderId, status: body.status };
  }
}

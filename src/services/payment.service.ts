import "server-only";
import crypto from "crypto";
import { env, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import type { Payment } from "@prisma/client";

export type CreatePaymentOrderResult = {
  providerOrderId: string;
  provider: string;
  amount: number; // minor units (paise)
  checkoutUrl?: string;
};

export type VerifyPaymentResult = {
  valid: boolean;
  providerPaymentId?: string;
  upiTransactionId?: string;
  signature?: string;
  failureReason?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPaymentOrder(params: { orderNumber: string; amountMinorUnits: number; customerEmail: string; customerPhone: string }): Promise<CreatePaymentOrderResult>;
  verifyPayment(params: { providerOrderId: string; providerPaymentId: string; signature: string; amountMinorUnits: number }): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  extractWebhookEvent(rawBody: string): { providerPaymentId: string; providerOrderId: string; status: "PAID" | "FAILED" | "CANCELLED" };
}

/**
 * Development-only mock provider. Hard-blocked in production (also enforced by env validation).
 * Simulates a UPI intent flow; verifies signatures with the same HMAC construction Razorpay uses
 * so the server-side verification path is exercised end-to-end.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock-upi";

  async createPaymentOrder({ orderNumber, amountMinorUnits }: { orderNumber: string; amountMinorUnits: number; customerEmail: string; customerPhone: string }) {
    return {
      providerOrderId: `mock_order_${orderNumber}`,
      provider: this.name,
      amount: amountMinorUnits,
      checkoutUrl: `/checkout/mock-pay/${orderNumber}`
    };
  }

  verifyPayment({ providerOrderId, providerPaymentId, signature }: { providerOrderId: string; providerPaymentId: string; signature: string; amountMinorUnits: number }) {
    const expected = crypto
      .createHmac("sha256", env.PAYMENT_PROVIDER_KEY_SECRET || "mock_secret")
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest("hex");
    if (signature === expected) {
      return { valid: true, providerPaymentId, upiTransactionId: `UPI${providerPaymentId.slice(-10).toUpperCase()}`, signature };
    }
    return { valid: false, failureReason: "Invalid payment signature" };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = crypto.createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET || "mock_webhook_secret").update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  extractWebhookEvent(rawBody: string) {
    const body = JSON.parse(rawBody) as { providerPaymentId: string; providerOrderId: string; status: "PAID" | "FAILED" | "CANCELLED" };
    return { providerPaymentId: body.providerPaymentId, providerOrderId: body.providerOrderId, status: body.status };
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (env.PAYMENT_MODE === "razorpay") return new RazorpayPaymentProvider();
  if (isProduction) {
    throw new Error("Mock payments are disabled in production.");
  }
  return new MockPaymentProvider();
}

export function toMinorUnits(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

/** Razorpay UPI provider. Requires PAYMENT_PROVIDER_KEY_ID / KEY_SECRET / PAYMENT_WEBHOOK_SECRET. */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = "razorpay";

  private authHeader(): string {
    return "Basic " + Buffer.from(`${env.PAYMENT_PROVIDER_KEY_ID}:${env.PAYMENT_PROVIDER_KEY_SECRET}`).toString("base64");
  }

  async createPaymentOrder({ orderNumber, amountMinorUnits, customerEmail, customerPhone }: { orderNumber: string; amountMinorUnits: number; customerEmail: string; customerPhone: string }) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: this.authHeader() },
      body: JSON.stringify({ amount: amountMinorUnits, currency: "INR", receipt: orderNumber, notes: { customerEmail, customerPhone }, payment_capture: 1 })
    });
    if (!res.ok) {
      logger.error("Razorpay order creation failed", { status: res.status });
      throw new Error("Payment gateway error. Please try again.");
    }
    const data = (await res.json()) as { id: string };
    return { providerOrderId: data.id, provider: this.name, amount: amountMinorUnits };
  }

  async verifyPayment({ providerOrderId, providerPaymentId, signature }: { providerOrderId: string; providerPaymentId: string; signature: string; amountMinorUnits: number }) {
    const expected = crypto
      .createHmac("sha256", env.PAYMENT_PROVIDER_KEY_SECRET || "")
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest("hex");
    try {
      const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
      if (valid) return { valid: true, providerPaymentId, signature };
    } catch {
      // signature length mismatch
    }
    return { valid: false, failureReason: "Invalid payment signature" };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader || !env.PAYMENT_WEBHOOK_SECRET) return false;
    const expected = crypto.createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  extractWebhookEvent(rawBody: string) {
    const body = JSON.parse(rawBody) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
    };
    const entity = body.payload?.payment?.entity;
    if (body.event === "payment.failed" && entity) {
      return { providerPaymentId: entity.id, providerOrderId: entity.order_id, status: "FAILED" as const };
    }
    if (body.event === "payment.captured" && entity) {
      return { providerPaymentId: entity.id, providerOrderId: entity.order_id, status: "PAID" as const };
    }
    throw new Error("Unsupported webhook event");
  }
}

/** Idempotent payment confirmation. Safe to call multiple times (client verify + webhook). */
export async function confirmPaymentPaid(opts: {
  payment: Payment;
  providerPaymentId: string;
  upiTransactionId?: string;
  signature?: string;
  source: "client_verify" | "webhook";
}): Promise<{ alreadyPaid: boolean }> {
  const { payment } = opts;
  if (payment.status === "PAID") {
    return { alreadyPaid: true };
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
    // Idempotency guard inside transaction: another request may have confirmed already.
    if (!fresh || fresh.status === "PAID") return;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        providerPaymentId: opts.providerPaymentId,
        upiTransactionId: opts.upiTransactionId,
        providerSignature: opts.signature,
        paidAt: new Date(),
        rawProviderResponse: { source: opts.source, confirmedAt: new Date().toISOString() }
      }
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: "PAID", orderStatus: "PAYMENT_RECEIVED", confirmedAt: new Date() }
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        oldStatus: "PENDING_PAYMENT",
        newStatus: "PAYMENT_RECEIVED",
        notes: `Payment confirmed via ${opts.source}`
      }
    });
  });

  logger.info("Payment confirmed", { paymentId: payment.id, source: opts.source });
  return { alreadyPaid: false };
}

export async function markPaymentFailed(paymentId: string, reason: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: { in: ["CREATED", "PROCESSING"] } },
    data: { status: "FAILED", failureReason: reason }
  });
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (payment) {
    await prisma.order.updateMany({
      where: { id: payment.orderId, paymentStatus: { in: ["PENDING", "PROCESSING"] } },
      data: { paymentStatus: "FAILED" }
    });
  }
}


import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { MockPaymentProvider } from "@/services/payment-provider.impl";
import { ALLOWED_TRANSITIONS } from "@/services/order-transitions";
import { computeTotals, isServiceablePin } from "@/services/order-totals";
import { STORE_CONFIG } from "@/lib/store-config";

describe("mock payment provider", () => {
  const provider = new MockPaymentProvider();

  it("verifies a correctly signed payment", async () => {
    const providerOrderId = "mock_order_X";
    const providerPaymentId = "mock_pay_abc";
    const secret = process.env.PAYMENT_PROVIDER_KEY_SECRET || "mock_secret";
    const signature = crypto.createHmac("sha256", secret).update(`${providerOrderId}|${providerPaymentId}`).digest("hex");
    const result = await provider.verifyPayment({ providerOrderId, providerPaymentId, signature, amountMinorUnits: 10000 });
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid signature (tampered client callback)", async () => {
    const result = await provider.verifyPayment({
      providerOrderId: "mock_order_X", providerPaymentId: "mock_pay_abc",
      signature: "deadbeef", amountMinorUnits: 10000
    });
    expect(result.valid).toBe(false);
  });

  it("rejects webhook with missing/invalid signature", () => {
    const body = JSON.stringify({ providerPaymentId: "p", providerOrderId: "o", status: "PAID" });
    expect(provider.verifyWebhookSignature(body, null)).toBe(false);
    expect(provider.verifyWebhookSignature(body, "bad")).toBe(false);
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || "mock_webhook_secret";
    const good = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(provider.verifyWebhookSignature(body, good)).toBe(true);
  });
});

describe("order status transitions", () => {
  it("follows the happy path", () => {
    expect(ALLOWED_TRANSITIONS.PAYMENT_RECEIVED).toContain("CONFIRMED");
    expect(ALLOWED_TRANSITIONS.CONFIRMED).toContain("PREPARING");
    expect(ALLOWED_TRANSITIONS.PREPARING).toContain("READY");
    expect(ALLOWED_TRANSITIONS.READY).toContain("OUT_FOR_DELIVERY");
    expect(ALLOWED_TRANSITIONS.OUT_FOR_DELIVERY).toContain("DELIVERED");
  });

  it("never allows jumping backwards or into DELIVERED directly", () => {
    expect(ALLOWED_TRANSITIONS.PENDING_PAYMENT).not.toContain("DELIVERED");
    expect(ALLOWED_TRANSITIONS.PENDING_PAYMENT).not.toContain("PREPARING");
    expect(ALLOWED_TRANSITIONS.REFUNDED).toEqual([]);
  });

  it("allows cancellation before delivery", () => {
    expect(ALLOWED_TRANSITIONS.PENDING_PAYMENT).toContain("CANCELLED");
    expect(ALLOWED_TRANSITIONS.CONFIRMED).toContain("CANCELLED");
    expect(ALLOWED_TRANSITIONS.OUT_FOR_DELIVERY).not.toContain("CANCELLED");
  });
});

describe("order totals (server-side pricing)", () => {
  it("charges delivery below the free-delivery threshold", () => {
    const t = computeTotals(300);
    expect(t.deliveryCharge).toBe(STORE_CONFIG.deliveryFee);
    expect(t.grandTotal).toBe(300 + STORE_CONFIG.deliveryFee);
  });

  it("waives delivery at or above the free-delivery threshold", () => {
    const t = computeTotals(STORE_CONFIG.freeDeliveryThreshold);
    expect(t.deliveryCharge).toBe(0);
  });
});

describe("delivery PIN code rules", () => {
  it("rejects unsupported PIN codes", () => {
    expect(isServiceablePin("560038")).toBe(STORE_CONFIG.serviceablePostalCodes.includes("560038"));
    expect(isServiceablePin("999999")).toBe(false);
  });
});

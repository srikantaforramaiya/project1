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

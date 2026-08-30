import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { BUSINESS_NAME, BUSINESS_PHONE, BUSINESS_EMAIL, BUSINESS_ADDRESS, STORE_CONFIG, formatINR, formatDateTimeIST, ORDER_STATUS_LABELS } from "@/lib/store-config";
import type { Order, OrderItem } from "@prisma/client";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  template: string;
  userId?: string;
  orderId?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASSWORD);
}

async function getTransport() {
  if (!isEmailConfigured()) return null;
  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT ?? 587,
    secure: env.EMAIL_SECURE,
    auth: { user: env.EMAIL_USER!, pass: env.EMAIL_PASSWORD! }
  });
}

/** Sends an email and records the attempt in EmailLog. Failures are logged, never thrown into order flow. */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const log = await prisma.emailLog.create({
    data: {
      userId: params.userId,
      orderId: params.orderId,
      recipient: params.to,
      subject: params.subject,
      template: params.template,
      status: "QUEUED"
    }
  });

  try {
    const transport = await getTransport();
    if (!transport) {
      logger.warn("Email not configured — skipping send", { to: params.to, template: params.template });
      await prisma.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", errorMessage: "Email provider not configured" } });
      return false;
    }
    const info = await transport.sendMail({ from: env.EMAIL_FROM, to: params.to, subject: params.subject, html: params.html });
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: "SENT", providerMessageId: info.messageId, sentAt: new Date() } });
    return true;
  } catch (err) {
    logger.error("Email send failed", { to: params.to, template: params.template });
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", errorMessage: "Delivery failed" } });
    return false;
  }
}

export async function sendOrderConfirmationEmail(order: Order & { items: OrderItem[] }): Promise<boolean> {
  const itemsHtml = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i.productNameSnapshot}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatINR(i.unitPrice)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatINR(i.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0B0E11;padding:20px 28px;">
      <h1 style="color:#A3FF12;margin:0;font-size:22px;">${BUSINESS_NAME}</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="color:#111827;margin:0 0 8px;">Order Confirmed 🎉</h2>
      <p style="color:#374151;margin:0 0 16px;">Hi ${order.customerName}, your order <strong>${order.orderNumber}</strong> has been confirmed and payment received.</p>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Order date</td><td style="text-align:right;">${formatDateTimeIST(order.createdAt)}</td></tr>
        <tr><td style="padding:4px 0;">Payment status</td><td style="text-align:right;">PAID (${formatINR(order.grandTotal)})</td></tr>
        <tr><td style="padding:4px 0;">Order status</td><td style="text-align:right;">${ORDER_STATUS_LABELS[order.orderStatus]}</td></tr>
        <tr><td style="padding:4px 0;">Estimated preparation</td><td style="text-align:right;">~${STORE_CONFIG.defaultPreparationMinutes} minutes</td></tr>
      </table>
      <h3 style="color:#111827;margin:24px 0 8px;">Items</h3>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr style="color:#6b7280;"><th style="text-align:left;padding:8px 12px;background:#f9fafb;">Product</th><th style="padding:8px 12px;background:#f9fafb;">Qty</th><th style="text-align:right;padding:8px 12px;background:#f9fafb;">Price</th><th style="text-align:right;padding:8px 12px;background:#f9fafb;">Total</th></tr>
        ${itemsHtml}
      </table>
      <table style="width:100%;font-size:14px;color:#374151;margin-top:16px;">
        <tr><td>Subtotal</td><td style="text-align:right;">${formatINR(order.subtotal)}</td></tr>
        <tr><td>Delivery charge</td><td style="text-align:right;">${formatINR(order.deliveryCharge)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right;">-${formatINR(order.discountAmount)}</td></tr>
        <tr style="font-weight:bold;"><td>Total paid</td><td style="text-align:right;">${formatINR(order.grandTotal)}</td></tr>
      </table>
      <h3 style="color:#111827;margin:24px 0 8px;">Delivery address</h3>
      <p style="color:#374151;font-size:14px;white-space:pre-line;margin:0;">${order.deliveryAddressSnapshot}</p>
      <p style="margin-top:24px;"><a href="${env.NEXT_PUBLIC_APP_URL}/account/orders/${order.orderNumber}" style="background:#A3FF12;color:#0A0F00;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Track Your Order</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:28px;">Questions? Call us at ${BUSINESS_PHONE} or email ${BUSINESS_EMAIL}.<br/>${BUSINESS_ADDRESS}</p>
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: order.customerEmail,
    subject: `Order Confirmed — #${order.orderNumber}`,
    html,
    template: "order-confirmation",
    userId: order.userId,
    orderId: order.id
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<boolean> {
  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;">Reset your ${BUSINESS_NAME} password</h2>
    <p style="color:#374151;">Hi ${name}, we received a request to reset your password. This link expires in 1 hour.</p>
    <p><a href="${resetUrl}" style="background:#A3FF12;color:#0A0F00;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Reset Password</a></p>
    <p style="color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
  </div>
</body></html>`;
  return sendEmail({ to, subject: `Reset your ${BUSINESS_NAME} password`, html, template: "password-reset" });
}


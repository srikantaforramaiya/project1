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

function renderItemsTable(order: Order & { items: OrderItem[] }): string {
  return order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i.productNameSnapshot}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatINR(i.unitPrice)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatINR(i.lineTotal)}</td>
      </tr>`
    )
    .join("");
}

export async function sendOrderConfirmationEmail(order: Order & { items: OrderItem[] }): Promise<boolean> {
  const itemsHtml = renderItemsTable(order);

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

export async function sendOrderPlacedEmail(order: Order & { items: OrderItem[] }): Promise<boolean> {
  const itemsHtml = renderItemsTable(order);
  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0B0E11;padding:20px 28px;">
      <h1 style="color:#A3FF12;margin:0;font-size:22px;">${BUSINESS_NAME}</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="color:#111827;margin:0 0 8px;">Order Placed ✅</h2>
      <p style="color:#374151;margin:0 0 16px;">Hi ${order.customerName}, we have received your order <strong>${order.orderNumber}</strong>. Please complete the payment to confirm it.</p>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Order date</td><td style="text-align:right;">${formatDateTimeIST(order.createdAt)}</td></tr>
        <tr><td style="padding:4px 0;">Payment status</td><td style="text-align:right;">PENDING (${formatINR(order.grandTotal)})</td></tr>
        <tr><td style="padding:4px 0;">Order status</td><td style="text-align:right;">${ORDER_STATUS_LABELS[order.orderStatus]}</td></tr>
      </table>
      ${itemsHtml}
      <table style="width:100%;font-size:14px;color:#374151;margin-top:16px;">
        <tr><td>Subtotal</td><td style="text-align:right;">${formatINR(order.subtotal)}</td></tr>
        <tr><td>Delivery charge</td><td style="text-align:right;">${formatINR(order.deliveryCharge)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right;">-${formatINR(order.discountAmount)}</td></tr>
        <tr style="font-weight:bold;"><td>Amount payable</td><td style="text-align:right;">${formatINR(order.grandTotal)}</td></tr>
      </table>
      <h3 style="color:#111827;margin:24px 0 8px;">Delivery address</h3>
      <p style="color:#374151;font-size:14px;white-space:pre-line;margin:0;">${order.deliveryAddressSnapshot}</p>
      <p style="margin-top:24px;"><a href="${env.NEXT_PUBLIC_APP_URL}/checkout/pay/${order.orderNumber}" style="background:#A3FF12;color:#0A0F00;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Complete Payment</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:28px;">Questions? Call us at ${BUSINESS_PHONE} or email ${BUSINESS_EMAIL}.<br/>${BUSINESS_ADDRESS}</p>
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: order.customerEmail,
    subject: `Order Placed — #${order.orderNumber}`,
    html,
    template: "order-placed",
    userId: order.userId,
    orderId: order.id
  });
}

export async function sendOrderCancelledEmail(order: Order & { items: OrderItem[] }, reason?: string): Promise<boolean> {
  const itemsHtml = renderItemsTable(order);
  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0B0E11;padding:20px 28px;">
      <h1 style="color:#A3FF12;margin:0;font-size:22px;">${BUSINESS_NAME}</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="color:#111827;margin:0 0 8px;">Order Cancelled</h2>
      <p style="color:#374151;margin:0 0 16px;">Hi ${order.customerName}, your order <strong>${order.orderNumber}</strong> has been cancelled${reason ? ` for the following reason: <em>${reason}</em>` : ""}.</p>
      ${order.paymentStatus === "PAID" ? `<p style="color:#374151;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;">Since this order was already paid (${formatINR(order.grandTotal)}), a refund will be processed to your original payment method shortly.</p>` : ""}
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Order date</td><td style="text-align:right;">${formatDateTimeIST(order.createdAt)}</td></tr>
        <tr><td style="padding:4px 0;">Cancelled at</td><td style="text-align:right;">${formatDateTimeIST(order.cancelledAt ?? new Date())}</td></tr>
        <tr><td style="padding:4px 0;">Payment status</td><td style="text-align:right;">${order.paymentStatus}</td></tr>
      </table>
      ${itemsHtml}
      <table style="width:100%;font-size:14px;color:#374151;margin-top:16px;">
        <tr><td>Subtotal</td><td style="text-align:right;">${formatINR(order.subtotal)}</td></tr>
        <tr><td>Delivery charge</td><td style="text-align:right;">${formatINR(order.deliveryCharge)}</td></tr>
        <tr style="font-weight:bold;"><td>Order total</td><td style="text-align:right;">${formatINR(order.grandTotal)}</td></tr>
      </table>
      <h3 style="color:#111827;margin:24px 0 8px;">Delivery address</h3>
      <p style="color:#374151;font-size:14px;white-space:pre-line;margin:0;">${order.deliveryAddressSnapshot}</p>
      <p style="margin-top:24px;"><a href="${env.NEXT_PUBLIC_APP_URL}/account/orders" style="background:#A3FF12;color:#0A0F00;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View My Orders</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:28px;">Questions? Call us at ${BUSINESS_PHONE} or email ${BUSINESS_EMAIL}.<br/>${BUSINESS_ADDRESS}</p>
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: order.customerEmail,
    subject: `Order Cancelled — #${order.orderNumber}`,
    html,
    template: "order-cancelled",
    userId: order.userId,
    orderId: order.id
  });
}

export async function sendOrderOutForDeliveryEmail(order: Order & { items: OrderItem[] }): Promise<boolean> {
  const itemsHtml = renderItemsTable(order);
  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0B0E11;padding:20px 28px;">
      <h1 style="color:#A3FF12;margin:0;font-size:22px;">${BUSINESS_NAME}</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="color:#111827;margin:0 0 8px;">Out for Delivery 🛵</h2>
      <p style="color:#374151;margin:0 0 16px;">Hi ${order.customerName}, good news! Your order <strong>${order.orderNumber}</strong> is on its way and will reach you shortly.</p>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Dispatched at</td><td style="text-align:right;">${formatDateTimeIST(order.dispatchedAt ?? new Date())}</td></tr>
        <tr><td style="padding:4px 0;">Order status</td><td style="text-align:right;">${ORDER_STATUS_LABELS[order.orderStatus]}</td></tr>
        <tr><td style="padding:4px 0;">Amount paid</td><td style="text-align:right;">${formatINR(order.grandTotal)}</td></tr>
      </table>
      ${itemsHtml}
      <h3 style="color:#111827;margin:24px 0 8px;">Delivery address</h3>
      <p style="color:#374151;font-size:14px;white-space:pre-line;margin:0;">${order.deliveryAddressSnapshot}</p>
      <p style="margin-top:24px;"><a href="${env.NEXT_PUBLIC_APP_URL}/account/orders/${order.orderNumber}" style="background:#A3FF12;color:#0A0F00;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Track Your Order</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:28px;">Questions? Call us at ${BUSINESS_PHONE} or email ${BUSINESS_EMAIL}.<br/>${BUSINESS_ADDRESS}</p>
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: order.customerEmail,
    subject: `Out for Delivery — #${order.orderNumber}`,
    html,
    template: "order-out-for-delivery",
    userId: order.userId,
    orderId: order.id
  });
}

export async function sendAdminOrderPlacedEmail(
  order: Order & { items: OrderItem[] }
): Promise<boolean> {
  const itemsHtml = renderItemsTable(order);
  const adminEmail = env.EMAIL_USER ?? BUSINESS_EMAIL;
  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0B0E11;padding:20px 28px;">
      <h1 style="color:#A3FF12;margin:0;font-size:22px;">${BUSINESS_NAME} — New Order</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="color:#111827;margin:0 0 8px;">New order placed 🔔</h2>
      <p style="color:#374151;margin:0 0 16px;">Order <strong>${order.orderNumber}</strong> was just placed on the store.</p>
      <h3 style="color:#111827;margin:20px 0 8px;">Customer details</h3>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Name</td><td style="text-align:right;">${order.customerName}</td></tr>
        <tr><td style="padding:4px 0;">Email</td><td style="text-align:right;">${order.customerEmail}</td></tr>
        <tr><td style="padding:4px 0;">Phone</td><td style="text-align:right;">${order.customerPhone}</td></tr>
        ${order.customerNotes ? `<tr><td style="padding:4px 0;">Notes</td><td style="text-align:right;">${order.customerNotes}</td></tr>` : ""}
      </table>
      <h3 style="color:#111827;margin:20px 0 8px;">Order details</h3>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Order date</td><td style="text-align:right;">${formatDateTimeIST(order.createdAt)}</td></tr>
        <tr><td style="padding:4px 0;">Payment status</td><td style="text-align:right;">${order.paymentStatus} (${formatINR(order.grandTotal)})</td></tr>
        <tr><td style="padding:4px 0;">Order status</td><td style="text-align:right;">${ORDER_STATUS_LABELS[order.orderStatus]}</td></tr>
      </table>
      ${itemsHtml}
      <table style="width:100%;font-size:14px;color:#374151;margin-top:16px;">
        <tr><td>Subtotal</td><td style="text-align:right;">${formatINR(order.subtotal)}</td></tr>
        <tr><td>Delivery charge</td><td style="text-align:right;">${formatINR(order.deliveryCharge)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right;">-${formatINR(order.discountAmount)}</td></tr>
        <tr style="font-weight:bold;"><td>Order total</td><td style="text-align:right;">${formatINR(order.grandTotal)}</td></tr>
      </table>
      <h3 style="color:#111827;margin:20px 0 8px;">Delivery address</h3>
      <p style="color:#374151;font-size:14px;white-space:pre-line;margin:0;">${order.deliveryAddressSnapshot}</p>
      <p style="margin-top:24px;"><a href="${env.NEXT_PUBLIC_APP_URL}/admin/orders/${order.orderNumber}" style="background:#A3FF12;color:#0A0F00;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Open in Admin</a></p>
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: adminEmail,
    subject: `New Order ${order.orderNumber} — ${order.customerName} (${formatINR(order.grandTotal)})`,
    html,
    template: "admin-order-placed",
    userId: order.userId,
    orderId: order.id
  });
}

export async function sendOtpEmail(to: string, name: string, code: string): Promise<boolean> {
  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#0B0E11;padding:20px 28px;">
      <h1 style="color:#A3FF12;margin:0;font-size:20px;">${BUSINESS_NAME}</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="color:#111827;margin:0 0 8px;">Verify your email</h2>
      <p style="color:#374151;">Hi ${name}, use the verification code below to finish creating your account. It expires in <strong>60 minutes</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background:#0B0E11;color:#A3FF12;font-size:32px;letter-spacing:10px;font-weight:bold;padding:16px 28px;border-radius:10px;">${code}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">If you did not create an account with ${BUSINESS_NAME}, you can safely ignore this email.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">Questions? Call us at ${BUSINESS_PHONE} or email ${BUSINESS_EMAIL}.</p>
    </div>
  </div>
</body></html>`;
  return sendEmail({ to, subject: `Your ${BUSINESS_NAME} verification code: ${code}`, html, template: "registration-otp" });
}


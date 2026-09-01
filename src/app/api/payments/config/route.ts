import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { getPaymentProvider } from "@/services/payment.service";
import { env } from "@/lib/env";
import { STORE_CONFIG, BUSINESS_NAME } from "@/lib/store-config";

/** Public payment config for the client payment page. Never exposes secrets. */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const orderNumber = new URL(request.url).searchParams.get("orderNumber") ?? "";
    if (!orderNumber) return jsonError("orderNumber is required.", 400);
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    if (!order || order.userId !== user.id) return jsonError("Order not found.", 404);
    const payment = order.payments[0];
    const provider = getPaymentProvider();
    return NextResponse.json({
      mode: env.PAYMENT_MODE,
      provider: provider.name,
      keyId: env.PAYMENT_PROVIDER_KEY_ID ?? null,
      providerOrderId: payment?.providerOrderId ?? null,
      amountMinorUnits: payment ? Math.round(Number(payment.amount) * 100) : 0,
      orderNumber: order.orderNumber,
      grandTotal: Number(order.grandTotal),
      paymentStatus: order.paymentStatus,
      upiVpa: STORE_CONFIG.upiVpa,
      payeeName: BUSINESS_NAME,
      customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone }
    });
  } catch (err) {
    return handleApiError(err);
  }
}


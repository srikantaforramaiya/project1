import { NextResponse } from "next/server";
import { createOrderFromCart } from "@/services/order.service";
import { checkoutSchema } from "@/lib/validations";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { OrderError } from "@/services/order.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`checkout:${user.id}`, 10, 10 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many checkout attempts. Please wait a moment.", 429);
    const data = checkoutSchema.parse(await request.json());
    const order = await createOrderFromCart({
      userId: user.id,
      addressId: data.addressId,
      customerNotes: data.customerNotes || undefined
    });
    const payment = await import("@/lib/db").then(({ prisma }) =>
      prisma.payment.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } })
    );
    return NextResponse.json({
      orderNumber: order.orderNumber,
      grandTotal: Number(order.grandTotal),
      providerOrderId: payment?.providerOrderId,
      mockCheckoutUrl: payment?.provider === "mock-upi" ? `/checkout/mock-pay/${order.orderNumber}` : null
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return jsonError(err.message, err.status, err.fields);
    }
    return handleApiError(err);
  }
}

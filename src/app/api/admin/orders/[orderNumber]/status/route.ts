import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateOrderStatus } from "@/services/order-status.service";
import { updateOrderStatusSchema } from "@/lib/validations";
import { handleApiError, jsonError } from "@/lib/api-helpers";

type Params = { params: { orderNumber: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const data = updateOrderStatusSchema.parse(await request.json());
    const order = await prisma.order.findUnique({ where: { orderNumber: params.orderNumber } });
    if (!order) return jsonError("Order not found.", 404);
    const result = await updateOrderStatus({
      orderId: order.id,
      newStatus: data.status,
      changedByUserId: admin.id,
      notes: data.notes || undefined
    });
    if (!result.ok) return jsonError(result.error ?? "Invalid status change.", 409);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

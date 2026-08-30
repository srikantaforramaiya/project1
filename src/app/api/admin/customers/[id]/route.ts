import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";

const schema = z.object({ isActive: z.boolean() });

type Params = { params: { id: string } };

/** Activate / deactivate a customer account. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const data = schema.parse(await request.json());
    if (data.isActive === false && params.id === admin.id) {
      return jsonError("You cannot deactivate your own account.", 400);
    }
    const before = await prisma.user.findUnique({ where: { id: params.id }, select: { isActive: true } });
    if (!before) return jsonError("Customer not found.", 404);
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: data.isActive },
      select: { id: true, name: true, isActive: true }
    });
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: data.isActive ? "customer.activate" : "customer.deactivate",
        entityType: "User",
        entityId: params.id,
        beforeData: { isActive: before.isActive },
        afterData: { isActive: data.isActive },
        ipAddress: request.headers.get("x-forwarded-for")
      }
    });
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

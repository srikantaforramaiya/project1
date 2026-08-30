import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateCategory, archiveCategory } from "@/services/catalog-categories.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const category = await updateCategory(params.id, await request.json());
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "category.update",
        entityType: "Category",
        entityId: category.id,
        afterData: { name: category.name, isActive: category.isActive },
        ipAddress: request.headers.get("x-forwarded-for")
      }
    });
    return NextResponse.json({ category });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const result = await archiveCategory(params.id);
    if (!result.ok) return jsonError(result.error ?? "Cannot archive category.", 409);
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "category.archive",
        entityType: "Category",
        entityId: params.id,
        ipAddress: request.headers.get("x-forwarded-for")
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

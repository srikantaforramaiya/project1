import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateProduct, archiveProduct } from "@/services/catalog-products.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const before = await prisma.product.findUnique({ where: { id: params.id } });
    if (!before) return jsonError("Product not found.", 404);
    const body = await request.json();
    const product = await updateProduct(params.id, body);
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "product.update",
        entityType: "Product",
        entityId: product.id,
        beforeData: { name: before.name, price: String(before.price), isAvailable: before.isAvailable },
        afterData: { name: product.name, price: String(product.price), isAvailable: product.isAvailable },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent")
      }
    });
    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return jsonError("Product not found.", 404);
    await archiveProduct(params.id);
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "product.archive",
        entityType: "Product",
        entityId: params.id,
        beforeData: { name: product.name, deletedAt: null },
        afterData: { archived: true },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent")
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

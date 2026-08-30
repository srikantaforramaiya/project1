import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toggleProductAvailability, toggleProductFeatured } from "@/services/catalog-products.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";

const schema = z.object({ isAvailable: z.boolean().optional(), isFeatured: z.boolean().optional() });

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const data = schema.parse(await request.json());
    let product = null;
    if (data.isAvailable !== undefined) product = await toggleProductAvailability(params.id, data.isAvailable);
    if (data.isFeatured !== undefined) product = await toggleProductFeatured(params.id, data.isFeatured);
    if (!product) return jsonError("Nothing to update.", 400);
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "product.toggle",
        entityType: "Product",
        entityId: params.id,
        afterData: data,
        ipAddress: request.headers.get("x-forwarded-for")
      }
    });
    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

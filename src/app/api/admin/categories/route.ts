import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createCategory, listCategories } from "@/services/catalog-categories.service";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const includeInactive = new URL(request.url).searchParams.get("all") === "true";
    const categories = await listCategories(includeInactive);
    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const category = await createCategory(await request.json());
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "category.create",
        entityType: "Category",
        entityId: category.id,
        afterData: { name: category.name },
        ipAddress: request.headers.get("x-forwarded-for")
      }
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

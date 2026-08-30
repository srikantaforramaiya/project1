import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createProduct, listProducts } from "@/services/catalog-products.service";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const result = await listProducts({
      search: url.searchParams.get("search") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 20),
      includeArchived: url.searchParams.get("archived") === "true"
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const product = await createProduct(body);
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "product.create",
        entityType: "Product",
        entityId: product.id,
        afterData: { name: product.name, price: String(product.price), sku: product.sku },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent")
      }
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

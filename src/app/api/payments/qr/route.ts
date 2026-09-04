import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { STORE_CONFIG, BUSINESS_NAME } from "@/lib/store-config";

/**
 * Server-generated UPI QR code (SVG) for the given order.
 * Ownership-checked: a customer can only get a QR for their own order.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const orderNumber = new URL(request.url).searchParams.get("orderNumber") ?? "";
    if (!orderNumber) return jsonError("orderNumber is required.", 400);

    const order = await prisma.order.findFirst({
      where: { orderNumber, userId: user.id },
      select: { grandTotal: true }
    });
    if (!order) return jsonError("Order not found.", 404);

    const params = new URLSearchParams({
      pa: STORE_CONFIG.upiVpa,
      pn: BUSINESS_NAME,
      am: Number(order.grandTotal).toFixed(2),
      cu: "INR",
      tn: `Order ${orderNumber}`,
      tr: orderNumber
    });
    const svg = await QRCode.toString(`upi://pay?${params.toString()}`, {
      type: "svg",
      margin: 1,
      color: { dark: "#0B0E11", light: "#FFFFFF" }
    });

    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" }
    });
  } catch (err) {
    return handleApiError(err);
  }
}

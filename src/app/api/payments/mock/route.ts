import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { env, isProduction } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ orderNumber: z.string().min(5), outcome: z.enum(["success", "failure"]) });

/**
 * Development-only mock UPI "gateway". Simulates the provider calling back.
 * Hard-blocked in production (double guard: env validation also rejects PAYMENT_MODE=mock in prod).
 */
export async function POST(request: Request) {
  try {
    if (isProduction || env.PAYMENT_MODE !== "mock") {
      return jsonError("Not available.", 404);
    }
    const user = await requireUser();
    const limit = rateLimit(`mock-pay:${user.id}`, 20, 10 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests.", 429);

    const { orderNumber, outcome } = schema.parse(await request.json());
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    if (!order || order.userId !== user.id) return jsonError("Order not found.", 404);
    const payment = order.payments[0];
    if (!payment || !payment.providerOrderId) return jsonError("Payment not found.", 404);

    const providerPaymentId = `mock_pay_${crypto.randomBytes(8).toString("hex")}`;
    const secret = env.PAYMENT_PROVIDER_KEY_SECRET || "mock_secret";
    const signature = crypto.createHmac("sha256", secret).update(`${payment.providerOrderId}|${providerPaymentId}`).digest("hex");

    if (outcome === "failure") {
      // Simulate a failed payment without a valid signature path
      return NextResponse.json({ ok: false, orderNumber, error: "Payment failed at UPI provider." });
    }

    return NextResponse.json({
      ok: true,
      verify: { orderNumber, providerPaymentId, signature }
    });
  } catch (err) {
    return handleApiError(err);
  }
}

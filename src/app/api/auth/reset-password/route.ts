import { NextResponse } from "next/server";
import { resetPassword } from "@/services/account.service";
import { resetPasswordSchema } from "@/lib/validations";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`reset:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests. Please try again later.", 429);
    const data = resetPasswordSchema.parse(await request.json());
    const ok = await resetPassword(data.token, data.password);
    if (!ok) return jsonError("This reset link is invalid or has expired.", 400);
    return NextResponse.json({ ok: true, message: "Password updated. You can now log in." });
  } catch (err) {
    return handleApiError(err);
  }
}

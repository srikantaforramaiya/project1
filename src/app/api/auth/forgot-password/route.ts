import { NextResponse } from "next/server";
import { createPasswordResetOtp } from "@/services/account.service";
import { forgotPasswordSchema } from "@/lib/validations";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`forgot:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests. Please try again later.", 429);
    const { email } = forgotPasswordSchema.parse(await request.json());
    // Always respond the same way so accounts cannot be enumerated.
    await createPasswordResetOtp(email);
    return NextResponse.json({ ok: true, message: "If an account exists for that email, a 6-digit OTP has been sent. It is valid for 60 minutes." });
  } catch (err) {
    return handleApiError(err);
  }
}

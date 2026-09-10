import { NextResponse } from "next/server";
import { isKnownCustomer, createPasswordResetOtp } from "@/services/account.service";
import { forgotPasswordSchema } from "@/lib/validations";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`forgot:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests. Please try again later.", 429);
    const { email } = forgotPasswordSchema.parse(await request.json());

    // Validate the email is in the customer list. If it is NOT present, do nothing —
    // no OTP, no email. We still return the identical neutral response either way so
    // that accounts cannot be enumerated.
    if (await isKnownCustomer(email)) {
      await createPasswordResetOtp(email);
    } else {
      logger.info("Password reset requested for unknown email (ignored)", { email });
    }

    return NextResponse.json({ ok: true, message: "If an account exists for that email, a 6-digit OTP has been sent. It is valid for 60 minutes." });
  } catch (err) {
    return handleApiError(err);
  }
}

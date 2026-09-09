import { NextResponse } from "next/server";
import { registerCustomer, createRegistrationOtp } from "@/services/account.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`register:${getClientIp(request.headers)}`, 10, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many attempts. Please try again later.", 429);
    const body = await request.json();
    const user = await registerCustomer(body);

    // The workflow waits until the right OTP is entered: no session yet.
    try {
      await createRegistrationOtp(user.id, user.email, user.name);
    } catch (err) {
      logger.error("Registration OTP email failed", { userId: user.id, error: String(err) });
      return NextResponse.json(
        { requiresVerification: true, email: user.email, warning: "We could not send the verification email right now. Use Resend OTP after logging in." },
        { status: 200 }
      );
    }
    return NextResponse.json({ requiresVerification: true, email: user.email });
  } catch (err) {
    return handleApiError(err);
  }
}

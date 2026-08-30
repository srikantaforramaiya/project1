import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/services/account.service";
import { sendPasswordResetEmail } from "@/services/email.service";
import { forgotPasswordSchema } from "@/lib/validations";
import { env } from "@/lib/env";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`forgot:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests. Please try again later.", 429);
    const { email } = forgotPasswordSchema.parse(await request.json());
    // Always respond the same way so accounts cannot be enumerated.
    const resetUrl = await createPasswordResetToken(email, env.NEXT_PUBLIC_APP_URL);
    if (!resetUrl.endsWith("token=invalid")) {
      await sendPasswordResetEmail(email, "there", resetUrl);
    }
    return NextResponse.json({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
  } catch (err) {
    return handleApiError(err);
  }
}

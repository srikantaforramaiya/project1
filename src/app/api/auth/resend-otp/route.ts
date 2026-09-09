import { NextResponse } from "next/server";
import { resendRegistrationOtp } from "@/services/account.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.")
});

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`otp-resend:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many attempts. Please try again later.", 429);
    const { email } = schema.parse(await request.json());
    await resendRegistrationOtp(email);
    // Always OK — never reveals whether the account exists or is verified.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
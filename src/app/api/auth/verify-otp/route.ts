import { NextResponse } from "next/server";
import { verifyRegistrationOtp } from "@/services/account.service";
import { createSession, type SessionUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  otp: z.string().trim().regex(/^\d{6}$/, "Please enter the 6-digit OTP.")
});

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`otp-verify:${getClientIp(request.headers)}`, 20, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many attempts. Please try again later.", 429);
    const data = schema.parse(await request.json());
    const user = await verifyRegistrationOtp(data.email, data.otp);
    if (!user) return jsonError("Invalid email or already verified.", 400);
    await createSession({ ...user, role: user.role as SessionUser["role"] });
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
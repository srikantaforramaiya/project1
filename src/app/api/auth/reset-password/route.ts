import { NextResponse } from "next/server";
import { resetPasswordWithOtp } from "@/services/account.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
    otp: z.string().trim().regex(/^\d{6}$/, "Please enter the 6-digit OTP."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/\d/, "Password must contain a number."),
    confirmPassword: z.string()
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`reset:${getClientIp(request.headers)}`, 10, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests. Please try again later.", 429);
    const data = schema.parse(await request.json());
    const user = await resetPasswordWithOtp(data.email, data.otp, data.password);
    if (!user) return jsonError("This OTP is invalid or has expired. Please request a new one.", 400);
    return NextResponse.json({ ok: true, message: "Password updated. You can now log in." });
  } catch (err) {
    return handleApiError(err);
  }
}

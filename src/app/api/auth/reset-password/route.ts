import { NextResponse } from "next/server";
import { resetPassword } from "@/services/password.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`reset-pw:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many attempts. Please try again later.", 429);
    const result = await resetPassword(await request.json());
    return NextResponse.json({ ok: true, email: result.email });
  } catch (err) {
    return handleApiError(err);
  }
}

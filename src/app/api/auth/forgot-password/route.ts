import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/services/password.service";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`forgot-pw:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many requests. Please try again later.", 429);
    const result = await requestPasswordReset(await request.json());
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

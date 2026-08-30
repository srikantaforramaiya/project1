import { NextResponse } from "next/server";
import { loginUser } from "@/services/account.service";
import { createSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`login:${getClientIp(request.headers)}`, 10, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many login attempts. Please try again later.", 429);
    const body = await request.json();
    const user = await loginUser(body);
    await createSession(user);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

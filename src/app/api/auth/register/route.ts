import { NextResponse } from "next/server";
import { registerCustomer } from "@/services/account.service";
import { createSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`register:${getClientIp(request.headers)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return jsonError("Too many attempts. Please try again later.", 429);
    const body = await request.json();
    const user = await registerCustomer(body);
    await createSession(user);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

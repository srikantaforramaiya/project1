import { NextResponse } from "next/server";
import { loginUser } from "@/services/account.service";
import { createSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Per-account limit (brute-force protection) + a looser per-IP limit so
    // multiple people behind one address don't lock each other out.
    const email = typeof body?.email === "string" ? body.email.toLowerCase() : "unknown";
    const byAccount = rateLimit(`login-acct:${email}`, 10, 15 * 60 * 1000);
    const byIp = rateLimit(`login-ip:${getClientIp(request.headers)}`, 30, 15 * 60 * 1000);
    if (!byAccount.ok || !byIp.ok) return jsonError("Too many login attempts. Please try again later.", 429);
    const user = await loginUser(body);
    await createSession(user);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Deployment health check: verifies the database connection without leaking secrets. */
export async function GET() {
  // Env validation diagnostic: reports only the NAMES of failing keys, never values.
  let envStatus = "ok";
  try {
    const { isProduction } = await import("@/lib/env");
    isProduction();
  } catch (err) {
    envStatus = (err as Error).message.slice(0, 300);
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "connected", env: envStatus });
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "UNKNOWN";
    const message = (err as { message?: string })?.message?.slice(0, 300) ?? String(err);
    // Temporary diagnostics — REMOVE after the deployment issue is resolved.
    console.error("[health] DB check failed:", message);
    return NextResponse.json(
      { ok: false, db: "error", code, message, hint: "Check DATABASE_URL and Render logs" },
      { status: 500 }
    );
  }
}

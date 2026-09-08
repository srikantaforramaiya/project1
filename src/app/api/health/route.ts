import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Deployment health check: verifies the database connection without leaking secrets. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "UNKNOWN";
    return NextResponse.json(
      { ok: false, db: "error", code, hint: code === "P1001" ? "Cannot reach database server — check host/sslmode" : code === "P1000" ? "Authentication failed — check username/password" : "Check DATABASE_URL and Render logs" },
      { status: 500 }
    );
  }
}

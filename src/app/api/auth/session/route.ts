import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null);
  return NextResponse.json({ name: user.name, email: user.email, role: user.role, phone: user.phone });
}


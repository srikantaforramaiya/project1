import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { cartCount } from "@/services/cart.service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await cartCount(user.id) });
}

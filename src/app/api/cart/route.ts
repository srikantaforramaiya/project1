import { NextResponse } from "next/server";
import { getCartLines } from "@/services/cart.service";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await getCartLines(user.id);
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { addToCart, updateCartItem, removeFromCart } from "@/services/cart.service";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1)
});

const updateSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(99)
});

const removeSchema = z.object({ itemId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`cart-add:${user.id}:${getClientIp(request.headers)}`, 60, 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    const { productId, quantity } = addSchema.parse(await request.json());
    await addToCart(user.id, productId, quantity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const { itemId, quantity } = updateSchema.parse(await request.json());
    await updateCartItem(user.id, itemId, quantity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { itemId } = removeSchema.parse(await request.json());
    await removeFromCart(user.id, itemId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

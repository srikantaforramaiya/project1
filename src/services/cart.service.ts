import "server-only";
import { prisma } from "@/lib/db";
import type { CartItem } from "@prisma/client";
import type { Prisma } from "@prisma/client";


export async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

export type CartLine = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isAvailable: boolean;
  maxQuantity: number | null;
  stockLeft: number | null;
};

export async function getCartLines(userId: string): Promise<CartLine[]> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } }
  });
  if (!cart) return [];
  return cart.items.map((item: CartItem & { product: { id: string; name: string; slug: string; imageUrl: string | null; price: Prisma.Decimal; isAvailable: boolean; deletedAt: Date | null; maximumOrderQuantity: number | null; stockQuantity: number | null; trackInventory: boolean } }) => ({
    id: item.id,
    productId: item.product.id,
    name: item.product.name,
    slug: item.product.slug,
    imageUrl: item.product.imageUrl,
    unitPrice: Number(item.product.price),
    quantity: item.quantity,
    lineTotal: Number(item.product.price) * item.quantity,
    isAvailable: item.product.isAvailable && !item.product.deletedAt,
    maxQuantity: item.product.maximumOrderQuantity,
    stockLeft: item.product.trackInventory ? item.product.stockQuantity : null
  }));
}

export async function addToCart(userId: string, productId: string, quantity: number): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isAvailable: true, deletedAt: null }
  });
  if (!product) throw new Error("This item is not available.");
  if (product.trackInventory && product.stockQuantity !== null && quantity > product.stockQuantity) {
    throw new Error(`Only ${product.stockQuantity} left in stock.`);
  }
  if (product.maximumOrderQuantity && quantity > product.maximumOrderQuantity) {
    quantity = product.maximumOrderQuantity;
  }

  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } }
  });
  const newQty = Math.min(
    (existing?.quantity ?? 0) + quantity,
    product.maximumOrderQuantity ?? 99,
    product.trackInventory && product.stockQuantity !== null ? product.stockQuantity : 99
  );
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: newQty },
    create: { cartId: cart.id, productId, quantity: newQty }
  });
}

export async function updateCartItem(userId: string, itemId: string, quantity: number): Promise<void> {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new Error("Cart not found.");
  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return;
  }
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: true }
  });
  if (!item) throw new Error("Item not found in cart.");
  if (item.product.trackInventory && item.product.stockQuantity !== null && quantity > item.product.stockQuantity) {
    throw new Error(`Only ${item.product.stockQuantity} left in stock.`);
  }
  const max = item.product.maximumOrderQuantity ?? 99;
  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: Math.min(quantity, max) }
  });
}

export async function removeFromCart(userId: string, itemId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
}

export async function cartCount(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { select: { quantity: true } } }
  });
  if (!cart) return 0;
  return cart.items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);
}

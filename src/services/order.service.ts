import "server-only";
import { prisma } from "@/lib/db";
import { STORE_CONFIG, CURRENCY } from "@/lib/store-config";
import { toMinorUnits, getPaymentProvider } from "@/services/payment.service";
import { computeTotals } from "@/services/order-totals";
import { generateOrderNumber } from "@/services/order-number";
import { logger } from "@/lib/logger";
import { Prisma, type Order } from "@prisma/client";

export { generateOrderNumber };

export class OrderError extends Error {
  status: number;
  fields?: Record<string, string[]>;
  constructor(message: string, status = 400, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}


export function formatAddressSnapshot(addr: {
  label: string; recipientName: string; phone: string; addressLine1: string; addressLine2?: string | null;
  landmark?: string | null; city: string; state: string; postalCode: string;
}): string {
  const lines = [
    addr.recipientName,
    addr.addressLine1,
    addr.addressLine2,
    addr.landmark ? `Landmark: ${addr.landmark}` : null,
    `${addr.city}, ${addr.state} - ${addr.postalCode}`,
    `Phone: ${addr.phone}`
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

/**
 * Creates an order from the user's server-side cart inside a database transaction.
 * All prices, availability and stock are recalculated from the database — client totals are never trusted.
 */
export async function createOrderFromCart(params: {
  userId: string;
  addressId: string;
  customerNotes?: string;
}): Promise<Order> {
  const provider = getPaymentProvider();

  const cart = await prisma.cart.findUnique({
    where: { userId: params.userId },
    include: { items: { include: { product: true } } }
  });
  if (!cart || cart.items.length === 0) {
    throw new OrderError("Your cart is empty.", 400);
  }

  const address = await prisma.address.findFirst({ where: { id: params.addressId, userId: params.userId } });
  if (!address) {
    throw new OrderError("Please select a valid delivery address.", 422, { addressId: ["Invalid delivery address."] });
  }

  if (!STORE_CONFIG.serviceablePostalCodes.includes(address.postalCode)) {
    throw new OrderError(
      `Sorry, delivery is currently unavailable for PIN code ${address.postalCode}.`,
      422,
      { addressId: ["Delivery is not available for this PIN code."] }
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: params.userId } });

  // Server-side validation & pricing
  const pricedItems: { productId: string; name: string; sku: string; unitPrice: number; quantity: number; lineTotal: number }[] = [];
  for (const item of cart.items) {
    const p = item.product;
    if (p.deletedAt || !p.isAvailable) {
      throw new OrderError(`"${p.name}" is currently sold out. Please remove it from your cart.`, 422, {
        items: [`"${p.name}" is unavailable.`]
      });
    }
    if (item.quantity < p.minimumOrderQuantity) {
      throw new OrderError(`Minimum order quantity for "${p.name}" is ${p.minimumOrderQuantity}.`, 422);
    }
    if (p.maximumOrderQuantity && item.quantity > p.maximumOrderQuantity) {
      throw new OrderError(`Maximum order quantity for "${p.name}" is ${p.maximumOrderQuantity}.`, 422);
    }
    if (p.trackInventory && p.stockQuantity !== null && item.quantity > p.stockQuantity) {
      throw new OrderError(`Only ${p.stockQuantity} left for "${p.name}". Please update your quantity.`, 422, {
        items: [`Insufficient stock for "${p.name}".`]
      });
    }
    const unitPrice = Number(p.price);
    pricedItems.push({ productId: p.id, name: p.name, sku: p.sku, unitPrice, quantity: item.quantity, lineTotal: unitPrice * item.quantity });
  }

  const totals = computeTotals(pricedItems.reduce((s, i) => s + i.lineTotal, 0));
  if (totals.subtotal < STORE_CONFIG.minimumOrderAmount) {
    throw new OrderError(`Minimum order amount is ₹${STORE_CONFIG.minimumOrderAmount}.`, 422);
  }

  const order = await prisma.$transaction(async (tx) => {
    // Re-check stock inside the transaction to handle concurrent orders safely.
    for (const item of pricedItems) {
      const fresh = await tx.product.findUnique({ where: { id: item.productId } });
      if (!fresh || fresh.deletedAt || !fresh.isAvailable) {
        throw new OrderError(`"${item.name}" just became unavailable. Please review your cart.`, 409);
      }
      if (fresh.trackInventory && fresh.stockQuantity !== null) {
        if (fresh.stockQuantity < item.quantity) {
          throw new OrderError(`Stock changed for "${item.name}" — only ${fresh.stockQuantity} left.`, 409);
        }
        await tx.product.update({
          where: { id: fresh.id },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: params.userId,
        addressId: address.id,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        deliveryAddressSnapshot: formatAddressSnapshot(address),
        subtotal: new Prisma.Decimal(totals.subtotal),
        deliveryCharge: new Prisma.Decimal(totals.deliveryCharge),
        discountAmount: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(totals.taxAmount),
        grandTotal: new Prisma.Decimal(totals.grandTotal),
        paymentStatus: "PENDING",
        orderStatus: "PENDING_PAYMENT",
        customerNotes: params.customerNotes || null
      }
    });

    for (const item of pricedItems) {
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: item.productId,
          productNameSnapshot: item.name,
          productSkuSnapshot: item.sku,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          quantity: item.quantity,
          lineTotal: new Prisma.Decimal(item.lineTotal)
        }
      });
    }

    await tx.orderStatusHistory.create({
      data: { orderId: created.id, oldStatus: null, newStatus: "PENDING_PAYMENT", notes: "Order created" }
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return created;
  });

  // Initiate payment order at the gateway (or mock) and persist the payment record.
  const paymentOrder = await provider.createPaymentOrder({
    orderNumber: order.orderNumber,
    amountMinorUnits: toMinorUnits(totals.grandTotal),
    customerEmail: user.email,
    customerPhone: user.phone
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: paymentOrder.provider,
      providerOrderId: paymentOrder.providerOrderId,
      amount: new Prisma.Decimal(totals.grandTotal),
      currency: CURRENCY,
      status: "CREATED",
      paymentMethod: "UPI"
    }
  });

  logger.info("Order created", { orderNumber: order.orderNumber, provider: paymentOrder.provider });
  return order;
}


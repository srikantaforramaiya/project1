import { PrismaClient, Prisma, OrderStatus, PaymentStatus } from "@prisma/client";
import crypto from "crypto";

type PrismaLike = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

export async function seedDemoOrders(prisma: PrismaLike) {
  if ((await prisma.order.count()) > 0) return;
  const customers = await prisma.user.findMany({ where: { role: "CUSTOMER" }, take: 3 });
  if (customers.length === 0) return;
  const products = await prisma.product.findMany({ take: 11 });

  const statuses: { status: OrderStatus; payment: PaymentStatus; daysAgo: number }[] = [
    { status: "DELIVERED", payment: "PAID", daysAgo: 1 },
    { status: "DELIVERED", payment: "PAID", daysAgo: 3 },
    { status: "OUT_FOR_DELIVERY", payment: "PAID", daysAgo: 0 },
    { status: "PREPARING", payment: "PAID", daysAgo: 0 },
    { status: "CONFIRMED", payment: "PAID", daysAgo: 0 },
    { status: "CANCELLED", payment: "CANCELLED", daysAgo: 2 }
  ];

  for (const [i, s] of statuses.entries()) {
    const user = customers[i % customers.length];
    const address = await prisma.address.findFirst({ where: { userId: user.id } });
    if (!address) continue;
    const picked = [products[0], products[7], products[10]].slice(0, (i % 3) + 1);
    const subtotal = picked.reduce((sum, p) => sum + Number(p.price), 0);
    const deliveryCharge = subtotal >= 500 ? 0 : 30;
    const createdAt = daysAgo(s.daysAgo);
    const order = await prisma.order.create({
      data: {
        orderNumber: `FOOD-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${100000 + i}`,
        userId: user.id,
        addressId: address.id,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        deliveryAddressSnapshot: `${address.recipientName}\n${address.addressLine1}\n${address.city}, ${address.state} - ${address.postalCode}`,
        subtotal: new Prisma.Decimal(subtotal),
        deliveryCharge: new Prisma.Decimal(deliveryCharge),
        taxAmount: new Prisma.Decimal(0),
        discountAmount: new Prisma.Decimal(0),
        grandTotal: new Prisma.Decimal(subtotal + deliveryCharge),
        paymentStatus: s.payment,
        orderStatus: s.status,
        createdAt,
        cancelledAt: s.status === "CANCELLED" ? createdAt : null,
        deliveredAt: s.status === "DELIVERED" ? createdAt : null
      }
    });
    for (const p of picked) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: p.id,
          productNameSnapshot: p.name,
          productSkuSnapshot: p.sku,
          unitPrice: p.price,
          quantity: 1,
          lineTotal: p.price
        }
      });
    }
    if (s.payment === "PAID") {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "mock-upi",
          providerOrderId: `mock_order_${order.orderNumber}`,
          providerPaymentId: `mock_pay_${crypto.randomBytes(8).toString("hex")}`,
          amount: new Prisma.Decimal(subtotal + deliveryCharge),
          status: "PAID",
          paymentMethod: "UPI",
          paidAt: createdAt,
          upiTransactionId: `UPI${crypto.randomBytes(5).toString("hex").toUpperCase()}`
        }
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "mock-upi",
          providerOrderId: `mock_order_${order.orderNumber}`,
          amount: new Prisma.Decimal(subtotal + deliveryCharge),
          status: "CANCELLED",
          paymentMethod: "UPI"
        }
      });
    }
    await prisma.orderStatusHistory.create({
      data: { orderId: order.id, newStatus: "PENDING_PAYMENT", notes: "Order created", createdAt }
    });
    await prisma.orderStatusHistory.create({
      data: { orderId: order.id, oldStatus: "PENDING_PAYMENT", newStatus: s.status, notes: "Seeded", createdAt }
    });
  }
  console.log("Demo orders created.");
}

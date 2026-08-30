import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma, OrderStatus, PaymentStatus } from "@prisma/client";

/** Orders that count as a completed sale for revenue reporting. */
export const REVENUE_STATUSES: OrderStatus[] = ["PAYMENT_RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export function resolveDateRange(preset: string, customStart?: string, customEnd?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  switch (preset) {
    case "today": return { start: startOfDay(now), end: addDays(startOfDay(now), 1), label: "Today" };
    case "yesterday": return { start: addDays(startOfDay(now), -1), end: startOfDay(now), label: "Yesterday" };
    case "this_week": { const dow = (now.getUTCDay() + 6) % 7; const s = addDays(startOfDay(now), -dow); return { start: s, end: now, label: "This Week" }; }
    case "last_week": { const dow = (now.getUTCDay() + 6) % 7; const thisWeek = addDays(startOfDay(now), -dow); return { start: addDays(thisWeek, -7), end: thisWeek, label: "Last Week" }; }
    case "this_month": return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: now, label: "This Month" };
    case "last_month": return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), label: "Last Month" };
    case "last_7_days": return { start: addDays(startOfDay(now), -7), end: now, label: "Last 7 Days" };
    case "last_30_days": return { start: addDays(startOfDay(now), -30), end: now, label: "Last 30 Days" };
    case "this_year": return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: now, label: "This Year" };
    case "custom": {
      const start = customStart ? new Date(customStart) : addDays(startOfDay(now), -30);
      const end = customEnd ? new Date(customEnd + "T23:59:59Z") : now;
      return { start, end, label: `Custom (${customStart ?? "?"} to ${customEnd ?? "?"})` };
    }
    default: return { start: addDays(startOfDay(now), -30), end: now, label: "Last 30 Days" };
  }
}

export function revenueWhere(start: Date, end: Date, extra?: Prisma.OrderWhereInput): Prisma.OrderWhereInput {
  return {
    createdAt: { gte: start, lt: end },
    paymentStatus: "PAID",
    orderStatus: { in: REVENUE_STATUSES },
    ...extra
  };
}

export async function reportKpis(start: Date, end: Date) {
  const where = revenueWhere(start, end);
  const agg = await prisma.order.aggregate({
    where,
    _count: { _all: true },
    _sum: { grandTotal: true, subtotal: true, discountAmount: true, deliveryCharge: true }
  });
  const units = await prisma.orderItem.aggregate({ where: { order: where }, _sum: { quantity: true } });
  const orderCount = agg._count._all;
  const revenue = Number(agg._sum.grandTotal ?? 0);
  return {
    orderCount,
    revenue,
    netRevenue: Number(agg._sum.subtotal ?? 0),
    discounts: Number(agg._sum.discountAmount ?? 0),
    deliveryCharges: Number(agg._sum.deliveryCharge ?? 0),
    unitsSold: units._sum.quantity ?? 0,
    avgOrderValue: orderCount > 0 ? revenue / orderCount : 0
  };
}

export async function revenueTrend(start: Date, end: Date, groupBy: "day" | "week" | "month" = "day") {
  const orders = await prisma.order.findMany({
    where: revenueWhere(start, end),
    select: { createdAt: true, grandTotal: true }
  });
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    let key: string;
    if (groupBy === "month") key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    else if (groupBy === "week") { const dow = (d.getUTCDay() + 6) % 7; key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10); }
    else key = d.toISOString().slice(0, 10);
    const cur = map.get(key) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(o.grandTotal);
    cur.orders += 1;
    map.set(key, cur);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([period, v]) => ({ period, ...v }));
}

export async function ordersByStatus(start: Date, end: Date) {
  const rows = await prisma.order.groupBy({
    by: ["orderStatus"],
    where: { createdAt: { gte: start, lt: end } },
    _count: { _all: true },
    _sum: { grandTotal: true }
  });
  return rows.map((r) => ({ status: r.orderStatus, count: r._count._all, value: Number(r._sum.grandTotal ?? 0) }));
}

export async function productSales(start: Date, end: Date, limit = 10) {
  const rows = await prisma.orderItem.groupBy({
    by: ["productNameSnapshot"],
    where: { order: revenueWhere(start, end) },
    _sum: { quantity: true, lineTotal: true },
    _count: { _all: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit
  });
  return rows.map((r) => ({
    product: r.productNameSnapshot,
    quantitySold: r._sum.quantity ?? 0,
    revenue: Number(r._sum.lineTotal ?? 0),
    orderCount: r._count._all
  }));
}

export async function categorySales(start: Date, end: Date) {
  const items = await prisma.orderItem.findMany({
    where: { order: revenueWhere(start, end) },
    select: { quantity: true, lineTotal: true, product: { select: { category: { select: { name: true } } } } }
  });
  const map = new Map<string, { quantity: number; revenue: number }>();
  for (const i of items) {
    const name = i.product?.category.name ?? "Uncategorised";
    const cur = map.get(name) ?? { quantity: 0, revenue: 0 };
    cur.quantity += i.quantity;
    cur.revenue += Number(i.lineTotal);
    map.set(name, cur);
  }
  return Array.from(map.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.revenue - a.revenue);
}

export async function paymentReport(start: Date, end: Date) {
  const rows = await prisma.payment.groupBy({
    by: ["status"],
    where: { createdAt: { gte: start, lt: end } },
    _count: { _all: true },
    _sum: { amount: true }
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all, amount: Number(r._sum.amount ?? 0) }));
}

export async function customerReport(start: Date, end: Date, limit = 100) {
  const rows = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      name: true, email: true, createdAt: true,
      orders: { where: revenueWhere(start, end), select: { grandTotal: true, createdAt: true } }
    },
    take: limit
  });
  return rows.map((u) => {
    const spend = u.orders.reduce((s, o) => s + Number(o.grandTotal), 0);
    return {
      name: u.name,
      email: u.email,
      registeredAt: u.createdAt,
      orderCount: u.orders.length,
      lifetimeValue: spend,
      lastPurchase: u.orders.length ? u.orders.map((o) => o.createdAt).sort((a, b) => b.getTime() - a.getTime())[0] : null
    };
  }).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export async function topCustomers(limit = 10) {
  const rows = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      name: true, email: true,
      orders: { where: { paymentStatus: "PAID", orderStatus: { in: REVENUE_STATUSES } }, select: { grandTotal: true } }
    },
    take: 500
  });
  return rows.map((u) => ({
    name: u.name,
    email: u.email,
    orderCount: u.orders.length,
    totalSpent: u.orders.reduce((s, o) => s + Number(o.grandTotal), 0)
  })).filter((c) => c.orderCount > 0).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit);
}

export async function cancelledOrdersReport(start: Date, end: Date) {
  return prisma.order.findMany({
    where: { orderStatus: { in: ["CANCELLED", "REFUND_PENDING", "REFUNDED"] }, createdAt: { gte: start, lt: end } },
    select: { orderNumber: true, customerName: true, grandTotal: true, cancelledAt: true, orderStatus: true, adminNotes: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function deliveryChargeReport(start: Date, end: Date) {
  const where = revenueWhere(start, end);
  const agg = await prisma.order.aggregate({ where, _sum: { deliveryCharge: true }, _count: { _all: true } });
  const ordersCharged = await prisma.order.count({ where: { ...where, deliveryCharge: { gt: 0 } } });
  return { totalDeliveryCharges: Number(agg._sum.deliveryCharge ?? 0), ordersCharged, ordersTotal: agg._count._all };
}



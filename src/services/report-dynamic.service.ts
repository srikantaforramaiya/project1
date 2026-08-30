import "server-only";
import { prisma } from "@/lib/db";
import { resolveDateRange, REVENUE_STATUSES } from "@/services/report.service";
import type { Prisma, OrderStatus, PaymentStatus } from "@prisma/client";

export const DYNAMIC_DIMENSIONS = ["day", "week", "month", "product", "category", "customer", "order_status", "payment_status"] as const;
export const DYNAMIC_METRICS = ["revenue", "order_count", "avg_order_value", "quantity_sold", "discount", "delivery_charge"] as const;
export type DynamicDimension = (typeof DYNAMIC_DIMENSIONS)[number];
export type DynamicMetric = (typeof DYNAMIC_METRICS)[number];

export type DynamicReportParams = {
  preset: string;
  customStart?: string;
  customEnd?: string;
  dimension: DynamicDimension;
  metrics: DynamicMetric[];
  filters?: {
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    customerId?: string;
    productId?: string;
    categoryId?: string;
    minTotal?: number;
    maxTotal?: number;
  };
};

/** Custom report — dimensions/metrics come from a strict allow-list, never raw SQL. */
export async function runDynamicReport(params: DynamicReportParams) {
  const { start, end } = resolveDateRange(params.preset, params.customStart, params.customEnd);
  const metrics = params.metrics.length ? params.metrics : (["revenue", "order_count"] as DynamicMetric[]);
  const paidRevenue = { orderStatus: { in: REVENUE_STATUSES }, paymentStatus: "PAID" as PaymentStatus };

  if (params.dimension === "product" || params.dimension === "category") {
    const byProduct = params.dimension === "product";
    const itemWhere: Prisma.OrderItemWhereInput = {
      order: { createdAt: { gte: start, lt: end }, ...paidRevenue },
      productId: params.filters?.productId ?? undefined,
      product: params.filters?.categoryId ? { categoryId: params.filters.categoryId } : undefined
    };
    const rows = await prisma.orderItem.findMany({
      where: itemWhere,
      select: {
        quantity: true,
        lineTotal: true,
        order: { select: { orderNumber: true, grandTotal: true } },
        product: byProduct ? { select: { name: true } } : { select: { category: { select: { name: true } } } }
      }
    });
    const map = new Map<string, { label: string; revenue: number; quantity: number; orderKeys: Set<string>; totals: number[] }>();
    for (const r of rows) {
      const label = byProduct ? r.product?.name ?? "Removed product" : r.product?.category?.name ?? "Uncategorised";
      const cur = map.get(label) ?? { label, revenue: 0, quantity: 0, orderKeys: new Set<string>(), totals: [] };
      cur.revenue += Number(r.lineTotal);
      cur.quantity += r.quantity;
      cur.orderKeys.add(r.order.orderNumber);
      cur.totals.push(Number(r.order.grandTotal));
      map.set(label, cur);
    }
    const result = Array.from(map.values()).map((v) => ({
      dimension: v.label,
      revenue: v.revenue,
      order_count: v.orderKeys.size,
      avg_order_value: v.orderKeys.size ? v.totals.reduce((a, b) => a + b, 0) / v.orderKeys.size : 0,
      quantity_sold: v.quantity,
      discount: 0,
      delivery_charge: 0
    })).sort((a, b) => b.revenue - a.revenue);
    return filterMetrics(result, metrics);
  }

  // Order-level dimensions
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      orderStatus: params.filters?.orderStatus ?? undefined,
      paymentStatus: params.filters?.paymentStatus ?? undefined,
      userId: params.filters?.customerId ?? undefined,
      grandTotal: { gte: params.filters?.minTotal ?? undefined, lte: params.filters?.maxTotal ?? undefined }
    },
    select: {
      orderNumber: true, createdAt: true, grandTotal: true, discountAmount: true, deliveryCharge: true,
      orderStatus: true, paymentStatus: true,
      user: { select: { name: true } },
      items: { select: { quantity: true } }
    }
  });

  const map = new Map<string, { label: string; revenue: number; orders: number; discount: number; delivery: number; quantity: number }>();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    let key: string;
    switch (params.dimension) {
      case "week": { const dow = (d.getUTCDay() + 6) % 7; key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10); break; }
      case "month": key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; break;
      case "customer": key = o.user?.name ?? "Unknown"; break;
      case "order_status": key = o.orderStatus; break;
      case "payment_status": key = o.paymentStatus; break;
      default: key = d.toISOString().slice(0, 10);
    }
    const cur = map.get(key) ?? { label: key, revenue: 0, orders: 0, discount: 0, delivery: 0, quantity: 0 };
    cur.revenue += Number(o.grandTotal);
    cur.orders += 1;
    cur.discount += Number(o.discountAmount);
    cur.delivery += Number(o.deliveryCharge);
    cur.quantity += o.items.reduce((s, i) => s + i.quantity, 0);
    map.set(key, cur);
  }

  const result = Array.from(map.values()).map((v) => ({
    dimension: v.label,
    revenue: v.revenue,
    order_count: v.orders,
    avg_order_value: v.orders ? v.revenue / v.orders : 0,
    quantity_sold: v.quantity,
    discount: v.discount,
    delivery_charge: v.delivery
  })).sort((a, b) => String(a.dimension).localeCompare(String(b.dimension)));

  return filterMetrics(result, metrics);
}

function filterMetrics(rows: Record<string, string | number>[], metrics: DynamicMetric[]) {
  return rows.map((r) => {
    const out: Record<string, string | number> = { dimension: r.dimension };
    for (const m of metrics) out[m] = r[m];
    return out;
  });
}

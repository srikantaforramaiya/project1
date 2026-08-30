import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";
import {
  resolveDateRange, reportKpis, revenueTrend, ordersByStatus, productSales,
  categorySales, paymentReport, customerReport, topCustomers,
  cancelledOrdersReport, deliveryChargeReport
} from "@/services/report.service";
import { runDynamicReport, DYNAMIC_DIMENSIONS, DYNAMIC_METRICS } from "@/services/report-dynamic.service";
import { z } from "zod";

type CannedReport = "daily-sales" | "product-sales" | "category-sales" | "order-status" | "payment-report" | "customer-report" | "top-customers" | "cancelled-orders" | "delivery-charges";

function toCsv(rows: Record<string, unknown>[], meta: string[]): string {
  if (rows.length === 0) return [meta.join("\n"), "No data for this range."].join("\n\n");
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    meta.join("\n"),
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))
  ].join("\n\n");
}

const querySchema = z.object({
  type: z.string(),
  preset: z.string().default("last_30_days"),
  start: z.string().optional(),
  end: z.string().optional(),
  dimension: z.string().optional(),
  metrics: z.string().optional()
});

/** Server-side CSV report export. Includes the report metadata/filters in the file. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const q = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const { start, end, label } = resolveDateRange(q.preset, q.start, q.end);
    const meta = [`Report: ${q.type}`, `Date range: ${label}`, `Generated: ${new Date().toISOString()}`, ""];

    let rows: Record<string, unknown>[] = [];
    switch (q.type as CannedReport) {
      case "daily-sales": {
        const k = await reportKpis(start, end);
        const trend = await revenueTrend(start, end, "day");
        rows = trend.map((t) => ({ date: t.period, orders: t.orders, revenue: t.revenue }));
        meta.push(`Total revenue: ${k.revenue}`, `Orders: ${k.orderCount}`, `Average order value: ${k.avgOrderValue.toFixed(2)}`);
        break;
      }
      case "product-sales": rows = (await productSales(start, end, 500)) as unknown as Record<string, unknown>[]; break;
      case "category-sales": rows = (await categorySales(start, end)) as unknown as Record<string, unknown>[]; break;
      case "order-status": rows = (await ordersByStatus(start, end)) as unknown as Record<string, unknown>[]; break;
      case "payment-report": rows = (await paymentReport(start, end)) as unknown as Record<string, unknown>[]; break;
      case "customer-report": rows = (await customerReport(start, end)) as unknown as Record<string, unknown>[]; break;
      case "top-customers": rows = (await topCustomers(100)) as unknown as Record<string, unknown>[]; break;
      case "cancelled-orders": rows = (await cancelledOrdersReport(start, end)) as unknown as Record<string, unknown>[]; break;
      case "delivery-charges": rows = [(await deliveryChargeReport(start, end)) as unknown as Record<string, unknown>]; break;
      default: {
        if (q.type !== "custom") return jsonError("Unknown report type.", 400);
        const dimension = (DYNAMIC_DIMENSIONS as readonly string[]).includes(q.dimension ?? "") ? q.dimension as never : "day";
        const metrics = (q.metrics ? q.metrics.split(",") : ["revenue", "order_count"]).filter((m) => (DYNAMIC_METRICS as readonly string[]).includes(m)) as never[];
        const result = await runDynamicReport({ preset: q.preset, customStart: q.start, customEnd: q.end, dimension, metrics });
        rows = result as unknown as Record<string, unknown>[];
      }
    }

    const csv = toCsv(rows, meta);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${q.type}-${q.preset}.csv"`
      }
    });
  } catch (err) {
    return handleApiError(err);
  }
}

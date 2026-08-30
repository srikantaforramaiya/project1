import Link from "next/link";
import { resolveDateRange, reportKpis, revenueTrend, ordersByStatus, productSales, categorySales, paymentReport, topCustomers, cancelledOrdersReport, deliveryChargeReport } from "@/services/report.service";
import { ReportFilterBar } from "@/components/admin/ReportFilterBar";
import { ReportChart } from "@/components/admin/ReportChart";
import { formatINR, formatDateTimeIST, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/store-config";

type SearchParams = Promise<{ preset?: string; start?: string; end?: string; report?: string }>;

const CANNED = [
  { key: "daily-sales", label: "Daily Sales" },
  { key: "product-sales", label: "Product Sales" },
  { key: "category-sales", label: "Category Sales" },
  { key: "order-status", label: "Order Status" },
  { key: "payment-report", label: "Payments" },
  { key: "top-customers", label: "Top Customers" },
  { key: "cancelled-orders", label: "Cancelled Orders" },
  { key: "delivery-charges", label: "Delivery Charges" }
];

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const preset = sp.preset ?? "last_30_days";
  const report = sp.report ?? "daily-sales";
  const { start, end, label } = resolveDateRange(preset, sp.start, sp.end);
  const kpi = await reportKpis(start, end);

  let table: { rows: Record<string, string | number>[]; headers: string[] } = { rows: [], headers: [] };
  if (report === "daily-sales") {
    const trend = await revenueTrend(start, end, "day");
    table = { headers: ["Date", "Orders", "Revenue"], rows: trend.map((t) => ({ Date: t.period, Orders: t.orders, Revenue: t.revenue })) };
  } else if (report === "product-sales") {
    table = { headers: ["Product", "Qty Sold", "Revenue", "Orders"], rows: (await productSales(start, end, 100)) as unknown as Record<string, string | number>[] };
  } else if (report === "category-sales") {
    table = { headers: ["Category", "Qty", "Revenue"], rows: (await categorySales(start, end)) as unknown as Record<string, string | number>[] };
  } else if (report === "order-status") {
    const rows = await ordersByStatus(start, end);
    table = { headers: ["Status", "Orders", "Value"], rows: rows.map((r) => ({ Status: ORDER_STATUS_LABELS[r.status], Orders: r.count, Value: r.value })) };
  } else if (report === "payment-report") {
    const rows = await paymentReport(start, end);
    table = { headers: ["Status", "Count", "Amount"], rows: rows.map((r) => ({ Status: PAYMENT_STATUS_LABELS[r.status] ?? r.status, Count: r.count, Amount: r.amount })) };
  } else if (report === "top-customers") {
    table = { headers: ["Customer", "Email", "Orders", "Total Spent"], rows: (await topCustomers(50)) as unknown as Record<string, string | number>[] };
  } else if (report === "cancelled-orders") {
    const rows = await cancelledOrdersReport(start, end);
    table = {
      headers: ["Order", "Customer", "Amount", "Status", "Cancelled At"],
      rows: rows.map((r) => ({ Order: r.orderNumber, Customer: r.customerName, Amount: Number(r.grandTotal), Status: ORDER_STATUS_LABELS[r.orderStatus], "Cancelled At": r.cancelledAt ? formatDateTimeIST(r.cancelledAt) : "—" }))
    };
  } else if (report === "delivery-charges") {
    const r = await deliveryChargeReport(start, end);
    table = { headers: ["Total Delivery Charges", "Orders Charged", "Orders Total"], rows: [{ "Total Delivery Charges": r.totalDeliveryCharges, "Orders Charged": r.ordersCharged, "Orders Total": r.ordersTotal }] };
  }

  const trend = await revenueTrend(start, end, preset === "this_year" ? "month" : "day");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Link href="/admin/reports/custom" className="btn-secondary !px-4 !py-2 text-xs">Custom Report Builder →</Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Canned reports">
        {CANNED.map((c) => (
          <Link key={c.key} href={`/admin/reports?report=${c.key}&preset=${preset}`} className={report === c.key ? "btn-primary !px-3.5 !py-1.5 text-xs" : "btn-ghost !px-3.5 !py-1.5 text-xs"} aria-current={report === c.key ? "page" : undefined}>
            {c.label}
          </Link>
        ))}
      </nav>

      <ReportFilterBar basePath="/admin/reports" current={{ report, preset, start: sp.start, end: sp.end }} />

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Report KPIs">
        {[
          { label: "Revenue", value: formatINR(kpi.revenue) },
          { label: "Orders", value: String(kpi.orderCount) },
          { label: "Units Sold", value: String(kpi.unitsSold) },
          { label: "Avg Order Value", value: formatINR(kpi.avgOrderValue) }
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-text-secondary">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </section>

      <ReportChart data={trend} label={`Revenue trend — ${label}`} />

      <section className="mt-6" aria-label="Report table">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{CANNED.find((c) => c.key === report)?.label} — {label}</h2>
          <Link href={`/api/admin/reports/export?type=${report}&preset=${preset}${sp.start ? `&start=${sp.start}` : ""}${sp.end ? `&end=${sp.end}` : ""}`} className="btn-secondary !px-3.5 !py-1.5 text-xs" prefetch={false}>
            Export CSV
          </Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[500px]">
            <thead><tr>{table.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {table.headers.map((h) => <td key={h}>{typeof r[h] === "number" ? Number(r[h]).toLocaleString("en-IN") : (r[h] ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {table.rows.length === 0 && <div className="p-10 text-center text-sm text-text-secondary">No data for this range.</div>}
        </div>
      </section>
    </div>
  );
}


import Link from "next/link";
import { prisma } from "@/lib/db";
import { reportKpis, resolveDateRange, revenueTrend, ordersByStatus, productSales } from "@/services/report.service";
import { formatINR, formatDateTimeIST, ORDER_STATUS_LABELS } from "@/lib/store-config";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { start, end } = resolveDateRange("last_30_days");
  const { start: todayStart, end: todayEnd } = resolveDateRange("today");
  const { start: yStart, end: yEnd } = resolveDateRange("yesterday");

  const [kpi, today, yesterday, pendingOrders, preparingOrders, deliveredOrders, totalCustomers, totalRevenue, trend, statusDist, topProducts, recentOrders] = await Promise.all([
    reportKpis(start, end),
    reportKpis(todayStart, todayEnd),
    reportKpis(yStart, yEnd),
    prisma.order.count({ where: { orderStatus: { in: ["PAYMENT_RECEIVED", "CONFIRMED"] } } }),
    prisma.order.count({ where: { orderStatus: "PREPARING" } }),
    prisma.order.count({ where: { orderStatus: "DELIVERED" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    revenueTrend(start, end, "day"),
    ordersByStatus(start, end),
    productSales(start, end, 5),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 })
  ]);

  const revenueDelta = yesterday.revenue > 0 ? ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100 : null;

  const kpiCards = [
    { label: "Today's Revenue", value: formatINR(today.revenue), delta: revenueDelta !== null ? `${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(0)}% vs yesterday` : null },
    { label: "Today's Orders", value: String(today.orderCount), delta: null },
    { label: "Pending Orders", value: String(pendingOrders) },
    { label: "Preparing", value: String(preparingOrders) },
    { label: "Delivered", value: String(deliveredOrders) },
    { label: "Total Customers", value: String(totalCustomers) },
    { label: "Avg Order Value (30d)", value: formatINR(kpi.avgOrderValue) },
    { label: "Total Revenue (all time)", value: formatINR(Number(totalRevenue._sum.amount ?? 0)) }
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-secondary">Last 30 days overview · auto-refreshes on navigation</p>
        </div>
        <Link href="/admin/reports" className="btn-secondary !px-4 !py-2 text-xs">Full Reports <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key metrics">
        {kpiCards.map((c) => (
          <div key={c.label} className="card animate-fade-in p-4">
            <p className="text-xs text-text-secondary">{c.label}</p>
            <p className="mt-1.5 text-xl font-bold text-primary">{c.value}</p>
            {c.delta && <p className={`mt-1 text-xs ${c.delta.startsWith("-") ? "text-danger" : "text-success"}`}>{c.delta}</p>}
          </div>
        ))}
      </section>

      <DashboardCharts trend={trend} statusDist={statusDist} topProducts={topProducts} />

      <section aria-labelledby="recent-orders">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-orders" className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td><Link href={`/admin/orders/${o.orderNumber}`} className="font-mono text-xs text-primary hover:underline">{o.orderNumber}</Link></td>
                  <td>{o.customerName}</td>
                  <td className="text-text-secondary">{formatDateTimeIST(o.createdAt)}</td>
                  <td>{formatINR(o.grandTotal)}</td>
                  <td><span className="badge bg-surface-elevated text-text-secondary">{ORDER_STATUS_LABELS[o.orderStatus]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";
import { ORDER_STATUS_LABELS } from "@/lib/store-config";

const COLORS = ["#A3FF12", "#00F5D4", "#7DD3FC", "#FBBF24", "#FF5470", "#C084FC", "#94A3B8", "#4ADE80", "#FB923C", "#F472B6"];

export function DashboardCharts({ trend, statusDist, topProducts }: {
  trend: { period: string; revenue: number; orders: number }[];
  statusDist: { status: string; count: number; value: number }[];
  topProducts: { product: string; quantitySold: number; revenue: number }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5" aria-labelledby="revenue-chart">
        <h2 id="revenue-chart" className="mb-4 text-sm font-semibold">Revenue Trend (30 days)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid stroke="#1C2027" />
            <XAxis dataKey="period" tick={{ fill: "#9AA3AE", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fill: "#9AA3AE", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1C2027", borderRadius: 12 }} formatter={(v: number | string) => `₹${Number(v).toLocaleString("en-IN")}`} />
            <Line type="monotone" dataKey="revenue" stroke="#A3FF12" strokeWidth={2} dot={false} name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card p-5" aria-labelledby="status-chart">
        <h2 id="status-chart" className="mb-4 text-sm font-semibold">Order Status Distribution</h2>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={statusDist} dataKey="count" nameKey="status" innerRadius={60} outerRadius={100} paddingAngle={3}>
              {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#0B0E11" />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1C2027", borderRadius: 12 }} formatter={(v: number | string, name: string) => [v, ORDER_STATUS_LABELS[name] ?? name]} />
            <Legend formatter={(value: string) => ORDER_STATUS_LABELS[value] ?? value} wrapperStyle={{ fontSize: 12, color: "#9AA3AE" }} />
          </PieChart>
        </ResponsiveContainer>
      </section>

      <section className="card p-5 lg:col-span-2" aria-labelledby="top-products-chart">
        <h2 id="top-products-chart" className="mb-4 text-sm font-semibold">Top Selling Products (by revenue)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={topProducts} layout="vertical">
            <CartesianGrid stroke="#1C2027" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#9AA3AE", fontSize: 11 }} />
            <YAxis type="category" dataKey="product" width={140} tick={{ fill: "#9AA3AE", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1C2027", borderRadius: 12 }} formatter={(v: number | string) => `₹${Number(v).toLocaleString("en-IN")}`} />
            <Bar dataKey="revenue" fill="#00F5D4" radius={[0, 6, 6, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

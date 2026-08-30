"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function ReportChart({ data, label }: { data: { period: string; revenue: number; orders: number }[]; label: string }) {
  return (
    <section className="card mt-6 p-5" aria-label={label}>
      <h2 className="mb-4 text-sm font-semibold">{label}</h2>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">No data for this range.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A3FF12" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#A3FF12" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1C2027" />
            <XAxis dataKey="period" tick={{ fill: "#9AA3AE", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fill: "#9AA3AE", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1C2027", borderRadius: 12 }} formatter={(v: number | string) => `₹${Number(v).toLocaleString("en-IN")}`} />
            <Area type="monotone" dataKey="revenue" stroke="#A3FF12" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

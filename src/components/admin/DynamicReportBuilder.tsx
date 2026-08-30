"use client";

import { useRouter } from "next/navigation";

const DIMENSIONS: { key: string; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "product", label: "Product" },
  { key: "category", label: "Category" },
  { key: "customer", label: "Customer" },
  { key: "order_status", label: "Order Status" },
  { key: "payment_status", label: "Payment Status" }
];

const METRICS: { key: string; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "order_count", label: "Orders" },
  { key: "avg_order_value", label: "Avg Order Value" },
  { key: "quantity_sold", label: "Quantity Sold" },
  { key: "discount", label: "Discounts" },
  { key: "delivery_charge", label: "Delivery Charges" }
];

const PRESETS = ["today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "this_year"];

export function DynamicReportBuilder({ current }: {
  current: { preset: string; dimension: string; metrics: string[]; start?: string; end?: string };
}) {
  const router = useRouter();

  function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("preset", String(fd.get("preset") ?? "last_30_days"));
    params.set("dimension", String(fd.get("dimension") ?? "day"));
    const metrics = METRICS.filter((m) => fd.get(`m_${m.key}`) === "on").map((m) => m.key);
    params.set("metrics", metrics.join(",") || "revenue,order_count");
    if (fd.get("start")) params.set("start", String(fd.get("start")));
    if (fd.get("end")) params.set("end", String(fd.get("end")));
    router.push(`/admin/reports/custom?${params.toString()}`);
  }

  return (
    <form onSubmit={run} className="card mt-4 flex flex-wrap items-end gap-4 p-4">
      <div>
        <label className="label" htmlFor="cr-preset">Date Range</label>
        <select id="cr-preset" name="preset" defaultValue={current.preset} className="input !w-auto">
          {PRESETS.map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
          <option value="custom">Custom</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="cr-dim">Group By</label>
        <select id="cr-dim" name="dimension" defaultValue={current.dimension} className="input !w-auto">
          {DIMENSIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1.5">
        <legend className="label">Metrics</legend>
        {METRICS.map((m) => (
          <label key={m.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input type="checkbox" name={`m_${m.key}`} defaultChecked={current.metrics.includes(m.key)} className="accent-primary" /> {m.label}
          </label>
        ))}
      </fieldset>
      <div className="flex items-end gap-2">
        <div>
          <label className="label" htmlFor="cr-start">From</label>
          <input id="cr-start" type="date" name="start" defaultValue={current.start} className="input !w-auto !py-1.5 text-xs" />
        </div>
        <div>
          <label className="label" htmlFor="cr-end">To</label>
          <input id="cr-end" type="date" name="end" defaultValue={current.end} className="input !w-auto !py-1.5 text-xs" />
        </div>
      </div>
      <button type="submit" className="btn-primary !px-5 !py-2 text-xs">Run Report</button>
    </form>
  );
}

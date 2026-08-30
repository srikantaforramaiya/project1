"use client";

import { useRouter } from "next/navigation";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_7_days", label: "Last 7 Days" },
  { key: "last_30_days", label: "Last 30 Days" },
  { key: "this_year", label: "This Year" }
];

export function ReportFilterBar({ basePath, current }: {
  basePath: string;
  current: { report?: string; preset?: string; start?: string; end?: string };
}) {
  const router = useRouter();
  const preset = current.preset ?? "last_30_days";

  function go(p: string, start?: string, end?: string) {
    const params = new URLSearchParams();
    if (current.report) params.set("report", current.report);
    params.set("preset", p);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="card mt-4 flex flex-wrap items-center gap-2 p-4" role="search" aria-label="Report date filter">
      {PRESETS.map((p) => (
        <button key={p.key} onClick={() => go(p.key)} className={preset === p.key ? "btn-primary !px-3 !py-1.5 text-xs" : "btn-ghost !px-3 !py-1.5 text-xs"} aria-pressed={preset === p.key}>
          {p.label}
        </button>
      ))}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          go("custom", String(fd.get("start") || ""), String(fd.get("end") || ""));
        }}
      >
        <input type="date" name="start" defaultValue={current.start} className="input !w-auto !py-1.5 text-xs" aria-label="Start date" />
        <span className="text-xs text-text-secondary">to</span>
        <input type="date" name="end" defaultValue={current.end} className="input !w-auto !py-1.5 text-xs" aria-label="End date" />
        <button className="btn-secondary !px-3 !py-1.5 text-xs">Custom Range</button>
      </form>
    </div>
  );
}

import { runDynamicReport, DYNAMIC_DIMENSIONS, DYNAMIC_METRICS } from "@/services/report-dynamic.service";
import { resolveDateRange } from "@/services/report.service";
import { DynamicReportBuilder } from "@/components/admin/DynamicReportBuilder";
import { formatINR } from "@/lib/store-config";

type SearchParams = Promise<{ preset?: string; dimension?: string; metrics?: string; start?: string; end?: string }>;

export default async function CustomReportPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const preset = sp.preset ?? "last_30_days";
  const dimension = (DYNAMIC_DIMENSIONS as readonly string[]).includes(sp.dimension ?? "") ? (sp.dimension as (typeof DYNAMIC_DIMENSIONS)[number]) : "day";
  const metrics = (sp.metrics ? sp.metrics.split(",") : ["revenue", "order_count"]).filter((m) => (DYNAMIC_METRICS as readonly string[]).includes(m)) as (typeof DYNAMIC_METRICS)[number][];

  const rows = await runDynamicReport({
    preset, dimension, metrics, customStart: sp.start, customEnd: sp.end
  });
  const { label } = resolveDateRange(preset, sp.start, sp.end);

  const headers = ["dimension", ...metrics];
  const exportHref = `/api/admin/reports/export?type=custom&preset=${preset}&dimension=${dimension}&metrics=${metrics.join(",")}${sp.start ? `&start=${sp.start}` : ""}${sp.end ? `&end=${sp.end}` : ""}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Custom Report Builder</h1>
      <p className="mt-1 text-sm text-text-secondary">Pick a grouping dimension and metrics — queries are generated server-side from a safe allow-list.</p>

      <DynamicReportBuilder current={{ preset, dimension, metrics, start: sp.start, end: sp.end }} />

      {rows.length > 0 && (
        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Report totals">
          {metrics.includes("revenue") && (
            <div className="card p-4"><p className="text-xs text-text-secondary">Total Revenue</p>
              <p className="mt-1 text-xl font-bold text-primary">{formatINR(rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0))}</p></div>
          )}
          {metrics.includes("order_count") && (
            <div className="card p-4"><p className="text-xs text-text-secondary">Total Orders</p>
              <p className="mt-1 text-xl font-bold text-primary">{rows.reduce((s, r) => s + Number(r.order_count ?? 0), 0)}</p></div>
          )}
          {metrics.includes("quantity_sold") && (
            <div className="card p-4"><p className="text-xs text-text-secondary">Units Sold</p>
              <p className="mt-1 text-xl font-bold text-primary">{rows.reduce((s, r) => s + Number(r.quantity_sold ?? 0), 0)}</p></div>
          )}
          <div className="card p-4"><p className="text-xs text-text-secondary">Rows</p>
            <p className="mt-1 text-xl font-bold text-primary">{rows.length}</p></div>
        </section>
      )}

      <section className="mt-6" aria-label="Custom report results">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Results — {label}</h2>
          <a href={exportHref} className="btn-secondary !px-3.5 !py-1.5 text-xs">Export CSV</a>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[600px]">
            <thead>
              <tr>{headers.map((h) => <th key={h}>{h === "dimension" ? dimension.replace("_", " ") : h.replace(/_/g, " ")}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {headers.map((h) => (
                    <td key={h}>{typeof r[h] === "number" ? Number(r[h]).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : (r[h] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-10 text-center text-sm text-text-secondary">No data for this combination. Adjust the filters and try again.</div>}
        </div>
      </section>
    </div>
  );
}

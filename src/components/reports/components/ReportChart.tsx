// Optional chart for a report result (bar time-series or pie distribution).
// Driven entirely by the report's `ChartSpec`, so any report can surface a chart
// without bespoke wiring.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrencyExact } from "../../dashboard/lib/aggregate";
import type { ChartSpec } from "../types";

const PIE_COLORS = ["#3A6EA5", "#2FB9A7", "#F59E0B", "#8B5CF6", "#EC4899", "#10B981", "#94A3B8"];

export default function ReportChart({ spec }: { spec: ChartSpec }) {
  const fmt = (v: number | undefined) =>
    spec.currency ? formatCurrencyExact(v ?? 0) : (v ?? 0).toLocaleString();

  return (
    <div>
      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-2">{spec.title}</p>
      <div className="min-h-[280px]">
        {spec.data.length === 0 ? (
          <p className="text-sm text-[#64748B] py-10 text-center">No data to chart for this range.</p>
        ) : spec.kind === "bar" ? (
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <BarChart data={spec.data} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                width={52}
                tickFormatter={(v) => (spec.currency ? `$${v}` : String(v))}
              />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={fmt} />
              {spec.seriesLabels && <Legend wrapperStyle={{ fontSize: 12 }} />}
              <Bar dataKey="value" name={spec.seriesLabels?.[0] ?? "Value"} fill="#3A6EA5" radius={[3, 3, 0, 0]} />
              {spec.seriesLabels && (
                <Bar dataKey="value2" name={spec.seriesLabels[1]} fill="#2FB9A7" radius={[3, 3, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <PieChart>
              <Pie
                data={spec.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(e: { label?: string; name?: string }) => e.label ?? e.name ?? ""}
                outerRadius={100}
                dataKey="value"
                nameKey="label"
                isAnimationActive={false}
              >
                {spec.data.map((entry, i) => (
                  <Cell key={entry.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { BarChart3, Play } from "lucide-react";
import WidgetCard from "../components/WidgetCard";
import { useAnalyticsSeries } from "../lib/useMetrics";
import { shortDayLabel, formatCurrencyExact } from "../lib/aggregate";
import { utils } from "../../../styles/theme.js";

interface Props {
  currentOffice: string;
}

const RANGES = [7, 14, 30];
const C = { appt: "#3A6EA5", money: "#2FB9A7", pat: "#F59E0B" };

/** Backend-driven analytics — list endpoints fetched over the window and bucketed
 * per day client-side (no time-series endpoint exists; see the dashboard dev report). */
export default function AnalyticsWidget({ currentOffice }: Props) {
  const [days, setDays] = useState(7);
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, isError, isFetching } = useAnalyticsSeries(currentOffice, days, enabled);

  const series = useMemo(
    () => (data?.series ?? []).map((p) => ({ ...p, label: shortDayLabel(p.date) })),
    [data],
  );
  const tickInterval = Math.max(0, Math.floor(series.length / 6) - 1);

  const rangeButtons = (
    <div className="flex items-center gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setDays(r)}
          className={utils.cn(
            "px-2 py-0.5 rounded text-[11px] font-bold transition-colors",
            days === r ? "bg-[#1F3A5F] text-white" : "bg-white text-[#475569] hover:bg-[#E2E8F0]",
          )}
        >
          {r}d
        </button>
      ))}
    </div>
  );

  if (!enabled) {
    return (
      <WidgetCard title="Analytics" icon={<BarChart3 className="w-4 h-4" />}>
        <div className="flex flex-col items-center justify-center text-center gap-3 py-8">
          <BarChart3 className="w-7 h-7 text-[#94A3B8]" strokeWidth={1.5} />
          <p className="text-sm text-[#64748B] max-w-md">
            Trends are aggregated client-side from list endpoints (no backend trends API yet),
            which is slow on large datasets. Load on demand.
          </p>
          <button
            type="button"
            onClick={() => setEnabled(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white text-sm font-bold"
          >
            <Play className="w-4 h-4" /> Load analytics
          </button>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Analytics"
      icon={<BarChart3 className="w-4 h-4" />}
      actions={rangeButtons}
      isLoading={isLoading || isFetching}
      isError={isError}
      bodyClassName="p-4"
      footer={
        data?.truncated ? (
          <p className="text-[11px] text-[#94A3B8]">
            Some days are based on a capped sample (first ~600 records) — backend trends endpoint recommended.
          </p>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartBlock title="Appointments">
          <BarChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} width={28} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="appointments" name="Appointments" fill={C.appt} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartBlock>

        <ChartBlock title="Daily Collections">
          <LineChart data={series} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={44} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number | undefined) => formatCurrencyExact(v ?? 0)} />
            <Line type="monotone" dataKey="collections" name="Collections" stroke={C.money} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartBlock>

        <ChartBlock title="New Patients">
          <BarChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} width={28} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="newPatients" name="New Patients" fill={C.pat} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartBlock>
      </div>
    </WidgetCard>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-2">{title}</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

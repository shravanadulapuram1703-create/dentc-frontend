import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Banknote,
  UserPlus,
  Users,
  CalendarCheck,
  ShieldCheck,
  Wrench,
  Play,
  PieChart as PieChartIcon,
  Activity,
  DollarSign,
  Stethoscope,
  Briefcase,
} from "lucide-react";
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
import WidgetCard from "../dashboard/components/WidgetCard";
import KpiStat from "../dashboard/components/KpiStat";
import { formatCurrency, formatCurrencyExact } from "../dashboard/lib/aggregate";
import ReportFilterBar from "../reports/components/ReportFilterBar";
import {
  type RangePreset,
  type DateRange,
  resolveRange,
  PRESET_LABELS,
} from "../reports/lib/reportRange";
import { useExecutiveSummary, useReportTrends } from "../reports/lib/reportMetrics";
import { exportCsv } from "../reports/lib/exportCsv";

interface ReportsProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

const PIE_COLORS = ["#3A6EA5", "#2FB9A7", "#F59E0B", "#8B5CF6", "#EC4899", "#10B981", "#94A3B8"];

const REPORT_CATEGORIES: { label: string; desc: string; route: string; icon: typeof Activity }[] = [
  { label: "Operational", desc: "Daily & schedule reports", route: "/reports/daily", icon: Activity },
  { label: "Financial", desc: "Ledger, production & collections", route: "/reports/ledger", icon: DollarSign },
  { label: "Patient", desc: "Demographics & patient lists", route: "/reports/lists/patient-list", icon: Users },
  { label: "Clinical", desc: "Treatment plans & procedures", route: "/reports/treatment-plan", icon: Stethoscope },
  { label: "Administrative", desc: "Management & office performance", route: "/reports/management", icon: Briefcase },
];

// onLogout/setCurrentOffice are supplied by the route wrapper but the page chrome
// (GlobalNav + top padding) is rendered by AdminPageWrapper in App.tsx, so only
// currentOffice is consumed here (for office-scoped metrics).
export default function Reports({ currentOffice }: ReportsProps) {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<RangePreset>("this_month");
  const [custom, setCustom] = useState<DateRange>(() => resolveRange("this_month"));
  const [analyticsOn, setAnalyticsOn] = useState(false);

  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);

  const summaryQ = useExecutiveSummary(currentOffice, range);
  const trendsQ = useReportTrends(currentOffice, range, analyticsOn);
  const s = summaryQ.data;

  const handleExport = () => {
    if (!s) return;
    const rows = [
      { metric: "Total Production", value: s.production },
      { metric: "Total Collections", value: s.collections },
      { metric: "New Patients", value: s.newPatients },
      { metric: "Active Patients", value: s.activePatients },
      { metric: "Scheduled Appointments", value: s.scheduledAppointments },
      { metric: "Insurance Receivables", value: s.insuranceReceivables },
    ];
    exportCsv(
      `executive-summary_${range.from}_${range.to}`,
      [
        { header: "Metric", value: (r) => r.metric },
        { header: "Value", value: (r) => r.value },
        { header: "Range From", value: () => range.from },
        { header: "Range To", value: () => range.to },
      ],
      rows,
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[#3A6EA5]" />
            <div>
              <h1 className="text-xl font-bold text-[#1F3A5F]">Reports &amp; Analytics</h1>
              <p className="text-sm text-[#64748B]">
                Practice performance — {PRESET_LABELS[preset]} ({range.from} → {range.to})
              </p>
            </div>
          </div>
          <ReportFilterBar
            preset={preset}
            onPresetChange={setPreset}
            custom={custom}
            onCustomChange={setCustom}
            onExportCsv={handleExport}
            exportDisabled={!s}
          />
        </div>

        {/* Executive Summary */}
        <WidgetCard
          title="Executive Summary"
          icon={<TrendingUp className="w-4 h-4" />}
          isLoading={summaryQ.isLoading}
          isError={summaryQ.isError}
          errorMessage="Couldn't load the executive summary."
          footer={
            s?.truncated ? (
              <p className="text-[11px] text-[#94A3B8]">
                Some figures are based on a capped sample (first ~1,000 records per source) — a
                backend aggregation endpoint is recommended.
              </p>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiStat
              label="Total Production"
              value={s ? formatCurrency(s.production) : "—"}
              icon={<TrendingUp className="w-4 h-4" />}
              tone="blue"
            />
            <KpiStat
              label="Total Collections"
              value={s ? formatCurrency(s.collections) : "—"}
              icon={<Banknote className="w-4 h-4" />}
              tone="teal"
            />
            <KpiStat
              label="New Patients"
              value={s ? s.newPatients.toLocaleString() : "—"}
              icon={<UserPlus className="w-4 h-4" />}
              tone="blue"
            />
            <KpiStat
              label="Active Patients"
              value={s ? s.activePatients.toLocaleString() : "—"}
              icon={<Users className="w-4 h-4" />}
              tone="slate"
            />
            <KpiStat
              label="Scheduled Appts"
              value={s ? s.scheduledAppointments.toLocaleString() : "—"}
              icon={<CalendarCheck className="w-4 h-4" />}
              tone="blue"
              hint="excludes cancelled / blocked"
            />
            <KpiStat
              label="Insurance Receivables"
              value={s ? formatCurrency(s.insuranceReceivables) : "—"}
              icon={<ShieldCheck className="w-4 h-4" />}
              tone="amber"
              hint="outstanding active claims"
            />
            <KpiStat
              label="Outstanding A/R"
              value="—"
              icon={<Wrench className="w-4 h-4" />}
              tone="neutral"
              hint="Awaiting backend endpoint"
            />
          </div>
        </WidgetCard>

        {/* Analytics (opt-in) */}
        {!analyticsOn ? (
          <WidgetCard title="Analytics" icon={<BarChart3 className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center text-center gap-3 py-8">
              <BarChart3 className="w-7 h-7 text-[#94A3B8]" strokeWidth={1.5} />
              <p className="text-sm text-[#64748B] max-w-md">
                Trends and the procedure mix are aggregated client-side from list endpoints (no
                backend trends API yet), which is slow on large ranges. Load on demand.
              </p>
              <button
                type="button"
                onClick={() => setAnalyticsOn(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white text-sm font-bold"
              >
                <Play className="w-4 h-4" /> Load analytics
              </button>
            </div>
          </WidgetCard>
        ) : (
          <WidgetCard
            title="Analytics"
            icon={<BarChart3 className="w-4 h-4" />}
            isLoading={trendsQ.isLoading || trendsQ.isFetching}
            isError={trendsQ.isError}
            footer={
              trendsQ.data?.truncated ? (
                <p className="text-[11px] text-[#94A3B8]">
                  Charts are based on a capped sample (first ~800 records per source) — backend
                  trends endpoint recommended.
                </p>
              ) : undefined
            }
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartBlock title="Production vs Collections">
                <BarChart data={trendsQ.data?.series ?? []} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={48} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number | undefined) => formatCurrencyExact(v ?? 0)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="production" name="Production" fill="#3A6EA5" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="collections" name="Collections" fill="#2FB9A7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartBlock>

              <ChartBlock title="Patient Growth (New)">
                <BarChart data={trendsQ.data?.series ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="newPatients" name="New Patients" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartBlock>
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5" /> Procedure Distribution (by fee)
              </p>
              <div className="min-h-[288px]">
                {(trendsQ.data?.procedureDist?.length ?? 0) === 0 ? (
                  <p className="text-sm text-[#64748B] py-8 text-center">No procedures in this range.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={288} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={trendsQ.data?.procedureDist ?? []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(e: { name?: string }) => e.name ?? ""}
                        outerRadius={100}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {(trendsQ.data?.procedureDist ?? []).map((entry, i) => (
                          <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => formatCurrencyExact(v ?? 0)} contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </WidgetCard>
        )}

        {/* Report Categories */}
        <WidgetCard title="Report Categories" icon={<BarChart3 className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => navigate(c.route)}
                  className="flex items-start gap-3 p-4 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F1F5F9] transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-[#3A6EA5] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-[#1F3A5F]">{c.label} Reports</div>
                    <div className="text-xs text-[#64748B]">{c.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </WidgetCard>
    </div>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-2">{title}</p>
      <div className="min-h-[256px]">
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// The report runner. Renders any ReportDefinition end-to-end:
//   filters → Run → summary cards + chart + sortable/searchable/paginated table
//   → export (CSV / Excel / PDF / Print).
// Adding a report requires no changes here — only a new definition.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Table2,
  Printer,
  Bookmark,
  BookmarkPlus,
  X,
} from "lucide-react";
import WidgetCard from "../../dashboard/components/WidgetCard";
import KpiStat from "../../dashboard/components/KpiStat";
import { toOfficeId } from "../../dashboard/lib/useDashboardData";
import { resolveRange, PRESET_LABELS } from "../lib/reportRange";
import { buildMatrix, cellText } from "../lib/exportMatrix";
import { exportCsv } from "../lib/exportCsv";
import { exportExcel } from "../lib/exportExcel";
import { downloadReportPdf, openReportPdf } from "../lib/exportPdf";
import { useOffices, officeName } from "../lib/useReportRefData";
import { addView, loadViews, removeView, type SavedView } from "../lib/savedViews";
import ReportFilterPanel, { type DraftFilters } from "./ReportFilterPanel";
import ReportChart from "./ReportChart";
import DataTable from "./DataTable";
import type { AnyReportDefinition, ReportFilters } from "../types";

interface Props {
  def: AnyReportDefinition;
  currentOffice: string;
}

function initialDraft(def: AnyReportDefinition, currentOffice: string): DraftFilters {
  const preset = def.defaultPreset ?? "this_month";
  const range = resolveRange(preset);
  const extra: Record<string, string> = {};
  for (const f of def.extraFilters ?? []) extra[f.key] = f.defaultValue ?? f.options[0]?.value ?? "";
  return {
    preset,
    from: range.from,
    to: range.to,
    office: def.filters.includes("office") ? String(toOfficeId(currentOffice) ?? "") : "",
    provider: "",
    status: "",
    search: "",
    extra,
  };
}

function resolveFilters(draft: DraftFilters): ReportFilters {
  return {
    preset: draft.preset,
    range: resolveRange(draft.preset, { from: draft.from, to: draft.to }),
    office: draft.office ? Number(draft.office) : null,
    provider: draft.provider,
    status: draft.status,
    search: draft.search.trim(),
    extra: draft.extra,
  };
}

export default function ReportShell({ def, currentOffice }: Props) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftFilters>(() => initialDraft(def, currentOffice));
  // Applied filters drive the query — committed on "Run report" (auto-run on mount).
  const [applied, setApplied] = useState<ReportFilters>(() => resolveFilters(initialDraft(def, currentOffice)));
  const [views, setViews] = useState<SavedView[]>(() => loadViews(def.id));
  const [showSave, setShowSave] = useState(false);
  const [viewName, setViewName] = useState("");

  const officesQ = useOffices();

  const query = useQuery({
    queryKey: ["reports", "run", def.id, applied],
    queryFn: () => def.fetch(applied),
    staleTime: 60_000,
  });
  const data = query.data;

  const officeLabel = useMemo(() => {
    if (applied.office == null) return "All offices";
    const o = (officesQ.data ?? []).find((x) => x.id === applied.office);
    return o ? officeName(o) : `Office ${applied.office}`;
  }, [applied.office, officesQ.data]);

  const subtitle = useMemo(() => {
    const parts = [
      `${PRESET_LABELS[applied.preset]} · ${applied.range.from} → ${applied.range.to}`,
      officeLabel,
    ];
    if (applied.status) parts.push(`Status: ${applied.status}`);
    if (applied.search) parts.push(`Keyword: "${applied.search}"`);
    return parts.join("  |  ");
  }, [applied, officeLabel]);

  const update = (patch: Partial<DraftFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const run = () => setApplied(resolveFilters(draft));
  const reset = () => {
    const fresh = initialDraft(def, currentOffice);
    setDraft(fresh);
    setApplied(resolveFilters(fresh));
  };

  // --- Exports (share one matrix built from the current rows) ---
  const rows = data?.rows ?? [];
  const fileBase = `${def.id}_${applied.range.from}_${applied.range.to}`;
  const summaryChips = (data?.summary ?? []).map((s) => ({ label: s.label, value: s.value }));

  const doCsv = () => {
    exportCsv(
      fileBase,
      def.columns.map((c) => ({ header: c.header, value: (row: unknown) => cellText(c, row as never) })),
      rows,
    );
  };
  const doExcel = () =>
    exportExcel(fileBase, def.columns, rows, { sheetName: def.title, title: def.title, subtitle });
  const doPdf = () =>
    downloadReportPdf(fileBase, buildMatrix(def.columns, rows), {
      title: def.title,
      subtitle,
      summary: summaryChips,
    });
  const doPrint = () =>
    openReportPdf(buildMatrix(def.columns, rows), { title: def.title, subtitle, summary: summaryChips });

  const saveView = () => {
    setViews(addView(def.id, viewName, resolveFilters(draft)));
    setViewName("");
    setShowSave(false);
  };
  const applyView = (v: SavedView) => {
    const f = v.filters;
    setDraft({
      preset: f.preset,
      from: f.range.from,
      to: f.range.to,
      office: f.office == null ? "" : String(f.office),
      provider: f.provider,
      status: f.status,
      search: f.search,
      extra: f.extra ?? {},
    });
    setApplied(f);
  };

  const canExport = rows.length > 0;
  const exportBtn = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const Icon = def.icon;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/reports")}
            className="mt-1 p-2 rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
            aria-label="Back to reports"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8 text-[#3A6EA5]" />
            <div>
              <h1 className="text-xl font-bold text-[#1F3A5F]">{def.title}</h1>
              <p className="text-sm text-[#64748B]">{def.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ReportFilterPanel
        def={def}
        draft={draft}
        onChange={update}
        onRun={run}
        onReset={reset}
        running={query.isFetching}
      />

      {/* Saved views */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide flex items-center gap-1">
          <Bookmark className="w-3.5 h-3.5" /> Saved views
        </span>
        {views.length === 0 && <span className="text-xs text-[#94A3B8]">None yet</span>}
        {views.map((v) => (
          <span
            key={v.id}
            className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1F3A5F]"
          >
            <button type="button" onClick={() => applyView(v)} className="font-semibold hover:underline">
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => setViews(removeView(def.id, v.id))}
              className="p-0.5 rounded-full hover:bg-[#DBEAFE]"
              aria-label={`Remove saved view ${v.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {showSave ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveView()}
              placeholder="View name"
              className="px-2 py-1 border border-[#CBD5E1] rounded-lg text-xs w-32 focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
            />
            <button
              type="button"
              onClick={saveView}
              className="px-2 py-1 rounded-lg bg-[#3A6EA5] text-white text-xs font-semibold hover:bg-[#2f5a8c]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowSave(false)}
              className="px-2 py-1 rounded-lg border border-[#CBD5E1] text-xs text-[#475569]"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowSave(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-[#CBD5E1] text-xs text-[#475569] hover:bg-[#F1F5F9]"
          >
            <BookmarkPlus className="w-3.5 h-3.5" /> Save current
          </button>
        )}
      </div>

      {/* Summary cards */}
      {data && data.summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.summary.map((s) => (
            <KpiStat key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} hint={s.hint} />
          ))}
        </div>
      )}

      {/* Chart */}
      {data?.chart && (
        <WidgetCard title="Overview" bodyClassName="p-4">
          <ReportChart spec={data.chart} />
        </WidgetCard>
      )}

      {/* Results table + exports */}
      <WidgetCard
        title="Results"
        actions={
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={doCsv} disabled={!canExport} className={`${exportBtn} border-[#CBD5E1] text-[#1F3A5F] hover:bg-[#F1F5F9]`}>
              <Download className="w-4 h-4" /> CSV
            </button>
            <button type="button" onClick={doExcel} disabled={!canExport} className={`${exportBtn} border-[#CBD5E1] text-[#1F3A5F] hover:bg-[#F1F5F9]`}>
              <Table2 className="w-4 h-4" /> Excel
            </button>
            <button type="button" onClick={doPdf} disabled={!canExport} className={`${exportBtn} border-[#CBD5E1] text-[#1F3A5F] hover:bg-[#F1F5F9]`}>
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button type="button" onClick={doPrint} disabled={!canExport} className={`${exportBtn} border-[#CBD5E1] text-[#1F3A5F] hover:bg-[#F1F5F9]`}>
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        }
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage="Couldn't run this report. Check the filters and try again."
        footer={
          data?.truncated ? (
            <p className="text-[11px] text-[#94A3B8]">
              Results are based on a capped sample (the backend has no aggregation/export endpoint —
              see docs/reports/reports_backend_devreport.md). Narrow the date range for complete figures.
            </p>
          ) : undefined
        }
      >
        <DataTable columns={def.columns} rows={rows} />
      </WidgetCard>
    </div>
  );
}

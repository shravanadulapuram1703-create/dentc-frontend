import { Download, FileText, Table2 } from "lucide-react";
import {
  type RangePreset,
  type DateRange,
  PRESET_LABELS,
} from "../lib/reportRange";
import { utils } from "../../../styles/theme.js";

interface Props {
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  custom: DateRange;
  onCustomChange: (r: DateRange) => void;
  onExportCsv: () => void;
  /** Disable export while data is still loading. */
  exportDisabled?: boolean;
}

const inputCls =
  "px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]";

/**
 * Reports filter + export bar. Date-range presets drive every KPI/chart on the
 * page. CSV export is client-side; PDF/Excel are disabled pending backend export
 * endpoints (see docs/reports/reports_backend_devreport.md gap #4).
 */
export default function ReportFilterBar({
  preset,
  onPresetChange,
  custom,
  onCustomChange,
  onExportCsv,
  exportDisabled,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={preset}
        onChange={(e) => onPresetChange(e.target.value as RangePreset)}
        className={inputCls}
        aria-label="Date range preset"
      >
        {(Object.keys(PRESET_LABELS) as RangePreset[]).map((p) => (
          <option key={p} value={p}>
            {PRESET_LABELS[p]}
          </option>
        ))}
      </select>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={custom.from}
            max={custom.to || undefined}
            onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
            className={inputCls}
            aria-label="From date"
          />
          <span className="text-[#64748B] text-sm">to</span>
          <input
            type="date"
            value={custom.to}
            min={custom.from || undefined}
            onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
            className={inputCls}
            aria-label="To date"
          />
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exportDisabled}
          className={utils.cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors",
            exportDisabled
              ? "bg-[#94A3B8] cursor-not-allowed"
              : "bg-[#3A6EA5] hover:bg-[#2f5a8c]",
          )}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
        {/* PDF / Excel export needs a backend endpoint (devreport gap #4). */}
        <button
          type="button"
          disabled
          title="PDF export requires a backend endpoint (not available yet)"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[#94A3B8] border border-[#E2E8F0] bg-white cursor-not-allowed"
        >
          <FileText className="w-4 h-4" /> PDF
        </button>
        <button
          type="button"
          disabled
          title="Excel export requires a backend endpoint (not available yet)"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[#94A3B8] border border-[#E2E8F0] bg-white cursor-not-allowed"
        >
          <Table2 className="w-4 h-4" /> Excel
        </button>
      </div>
    </div>
  );
}

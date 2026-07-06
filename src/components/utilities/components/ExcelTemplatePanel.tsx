// Fee Schedule Excel Template panel — real, fully client-side. Download the blank
// template, then upload a completed file to get an inline validation report
// (header check + per-row errors) before any import would be committed.
import { useState } from "react";
import { Download, Upload, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import WidgetCard from "../../dashboard/components/WidgetCard";
import KpiStat from "../../dashboard/components/KpiStat";
import {
  downloadFeeScheduleTemplate,
  validateFeeScheduleUpload,
  FEE_TEMPLATE_HEADERS,
  type ValidationReport,
} from "../lib/feeScheduleTemplate";

export default function ExcelTemplatePanel() {
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    setReport(null);
    try {
      setReport(await validateFeeScheduleUpload(file));
    } finally {
      setBusy(false);
    }
  };

  const ok = report && report.header_ok && report.errors.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Download */}
      <WidgetCard title="1 · Download template" icon={<Download className="w-4 h-4" />}>
        <div className="space-y-3">
          <p className="text-sm text-[#475569]">
            Download the current fee-schedule import template, fill it in with one row per procedure code, then upload it
            for validation.
          </p>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B] mb-1">Columns</p>
            <code className="text-xs text-[#1F3A5F]">{FEE_TEMPLATE_HEADERS.join(",  ")}</code>
          </div>
          <button
            type="button"
            onClick={downloadFeeScheduleTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white text-sm font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download CSV template
          </button>
          <p className="text-[11px] text-[#94A3B8]">Opens directly in Excel / Google Sheets / LibreOffice.</p>
        </div>
      </WidgetCard>

      {/* Upload + validate */}
      <WidgetCard title="2 · Upload & validate" icon={<Upload className="w-4 h-4" />}>
        <div className="space-y-4">
          <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-[#CBD5E1] rounded-lg text-sm text-[#475569] cursor-pointer hover:border-[#3A6EA5] hover:bg-[#EFF6FF] transition-colors">
            <Upload className="w-4 h-4" />
            <span className="truncate">{fileName || "Choose completed CSV file…"}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
          </label>

          {busy && (
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <Loader2 className="w-4 h-4 animate-spin" /> Validating…
            </div>
          )}

          {report && !busy && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <KpiStat label="Rows" value={report.total_rows.toLocaleString()} tone="blue" />
                <KpiStat label="Valid" value={report.valid_rows.toLocaleString()} tone="teal" />
                <KpiStat
                  label="Errors"
                  value={report.errors.length.toLocaleString()}
                  tone={report.errors.length > 0 ? "red" : "neutral"}
                />
              </div>

              {ok ? (
                <div className="flex items-start gap-2 rounded-lg border-2 border-[#2FB9A7]/40 bg-[#2FB9A7]/10 p-3">
                  <CheckCircle2 className="w-4 h-4 text-[#259688] shrink-0 mt-0.5" />
                  <p className="text-sm text-[#0F5132]">
                    All {report.valid_rows} row(s) passed validation. This file is ready to import.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#D97706]">
                    <AlertTriangle className="w-4 h-4" /> {report.errors.length} issue(s) found — fix and re-upload
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] max-h-48 overflow-y-auto divide-y divide-[#E2E8F0]">
                    {report.errors.map((e, i) => (
                      <div key={i} className="flex gap-3 px-3 py-2 text-xs">
                        <span className="shrink-0 font-bold text-[#DC2626] tabular-nums">
                          {e.row === 0 ? "Header" : `Row ${e.row}`}
                        </span>
                        <span className="text-[#475569]">{e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </WidgetCard>
    </div>
  );
}

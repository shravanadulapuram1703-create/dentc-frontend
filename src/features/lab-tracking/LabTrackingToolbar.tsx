// Lab Tracking filter + action bar.
//
// Filters mirror the legacy Lab Report "Report Type" radios (All / Not Sent /
// Not Received / Received) plus an appointment date range. Actions cover the
// legacy outputs (Lab Report, Cost Report — server PDFs; CSV export) and
// saving / checking-in / removing the selected case.

import { Printer, Save, CheckCircle2, X, FileDown, Trash2 } from 'lucide-react';
import type { LabFilter } from './labModel';

const FILTERS: { key: LabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'not_sent', label: 'Not Sent' },
  { key: 'not_received', label: 'Not Received' },
  { key: 'received', label: 'Received' },
];

interface Props {
  filter: LabFilter;
  onFilter: (f: LabFilter) => void;
  /** Server-side counts per review filter (badges on the segmented control). */
  counts?: Partial<Record<LabFilter, number>>;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  // actions
  hasSelected: boolean;
  saving: boolean;
  onSave: () => void;
  onCheckIn: () => void;
  onRemove: () => void;
  onCancel: () => void;
  onPrintLabReport: () => void;
  onPrintCostReport: () => void;
  onExportCsv: () => void;
}

export default function LabTrackingToolbar({
  filter,
  onFilter,
  counts,
  from,
  to,
  onFrom,
  onTo,
  hasSelected,
  saving,
  onSave,
  onCheckIn,
  onRemove,
  onCancel,
  onPrintLabReport,
  onPrintCostReport,
  onExportCsv,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      {/* Status segmented filter */}
      <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
        {FILTERS.map((f) => {
          const n = counts?.[f.key];
          return (
            <button
              key={f.key}
              onClick={() => onFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
              {n != null && (
                <span className={`ml-1 tabular-nums ${filter === f.key ? 'text-blue-100' : 'text-slate-400'}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <span>From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <span>To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          onClick={onPrintLabReport}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" /> Lab Report
        </button>
        <button
          onClick={onPrintCostReport}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" /> Cost Report
        </button>
        <button
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FileDown className="h-3.5 w-3.5" /> Export CSV
        </button>

        {hasSelected && (
          <>
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <button
              onClick={onCheckIn}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Check-in (today)
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onRemove}
              disabled={saving}
              title="Remove this appointment from lab tracking (clears the lab fields)"
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove Lab
            </button>
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Lab Edit / Check-in panel — the legacy appointment "Lab" sub-form (M12):
// Lab vendor · Lab Cost · Sent on · Due on · Recvd. on · Short Notice.
//
// Checking-in a case = entering the Received-on date (+ cost) and saving. The
// vendor and short-notice controls are display-only (no backend column yet —
// gap LAB-1), flagged inline so the user isn't misled into thinking they save.

import { AlertTriangle } from 'lucide-react';
import { fmtDate, fmtTime, type LabCase, type LabDraft } from './labModel';

interface Props {
  selected: LabCase;
  draft: LabDraft;
  vendors: string[];
  onChange: (patch: Partial<LabDraft>) => void;
}

const labelCls = 'text-xs font-semibold text-slate-600';
const inputCls =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function LabCaseEditPanel({ selected, draft, vendors, onChange }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {/* Appointment context (read-only) */}
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">
          Appt: <span className="font-medium text-slate-700">{fmtDate(selected.date)} {fmtTime(selected.start_time)}</span>
        </span>
        <span className="text-slate-500">
          Provider: <span className="font-medium text-slate-700">{selected.provider_name || '—'}</span>
        </span>
        <span className="text-slate-500">
          Description: <span className="font-medium text-slate-700">{selected.procedure_label || '—'}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Lab vendor (display-only) */}
        <div>
          <label className={labelCls}>
            Lab
            <span className="ml-1 font-normal text-amber-600" title="No backend field yet (LAB-1)">
              · not saved
            </span>
          </label>
          <input
            list="lab-vendor-list"
            className={inputCls}
            value={draft.lab_vendor}
            onChange={(e) => onChange({ lab_vendor: e.target.value })}
            placeholder="Lab vendor…"
          />
          <datalist id="lab-vendor-list">
            {vendors.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>

        {/* Lab Cost */}
        <div>
          <label className={labelCls}>Lab Cost</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={draft.lab_cost}
            onChange={(e) => onChange({ lab_cost: e.target.value })}
            placeholder="0.00"
          />
        </div>

        {/* Short notice (display-only) */}
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={draft.short_notice}
              onChange={(e) => onChange({ short_notice: e.target.checked })}
            />
            Short Notice
            <span className="text-xs text-amber-600" title="No backend field yet (LAB-1)">
              · not saved
            </span>
          </label>
        </div>

        {/* Sent on */}
        <div>
          <label className={labelCls}>Sent on</label>
          <input
            type="date"
            className={inputCls}
            value={draft.lab_sent_on}
            onChange={(e) => onChange({ lab_sent_on: e.target.value })}
          />
        </div>

        {/* Due on */}
        <div>
          <label className={labelCls}>Due on</label>
          <input
            type="date"
            className={inputCls}
            value={draft.lab_due_on}
            onChange={(e) => onChange({ lab_due_on: e.target.value })}
          />
        </div>

        {/* Received on (check-in) */}
        <div>
          <label className={labelCls}>Recvd. on</label>
          <input
            type="date"
            className={inputCls}
            value={draft.lab_received_on}
            onChange={(e) => onChange({ lab_received_on: e.target.value })}
          />
        </div>
      </div>

      {(draft.lab_vendor || draft.short_notice) && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          Lab vendor and Short Notice are display-only — the backend has no field for them yet (LAB-1).
        </p>
      )}
    </div>
  );
}

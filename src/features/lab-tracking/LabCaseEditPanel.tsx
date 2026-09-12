// Lab Edit / Check-in panel — the legacy appointment "Lab" sub-form (M12):
// Lab (vendor) · DDS · Lab Cost · Short Notice · Sent on · Due on · Recvd. on.
//
// Every control binds to a real appointment column now (LAB-1 shipped the
// `labs` catalog + `lab_vendor_id` / `lab_short_notice`; `lab_dds` is the
// dentist the case is for). Checking-in a case = entering the Received-on
// date (+ cost) and saving. Picking a vendor with a default turnaround
// pre-fills Due on from Sent on when Due on is still empty.

import { AlertTriangle } from 'lucide-react';
import type { LabRead } from '@/api/generated/model';
import {
  addDaysIso,
  dateOrderError,
  fmtDate,
  fmtTime,
  labVendorLabel,
  type LabCase,
  type LabDraft,
} from './labModel';

interface Props {
  selected: LabCase;
  draft: LabDraft;
  vendors: LabRead[];
  onChange: (patch: Partial<LabDraft>) => void;
}

const labelCls = 'text-xs font-semibold text-slate-600';
const inputCls =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function LabCaseEditPanel({ selected, draft, vendors, onChange }: Props) {
  const vendor = vendors.find((v) => String(v.id) === draft.lab_vendor_id) ?? null;
  const orderError = dateOrderError(draft);

  /** Vendor change: also pre-fill Due on = Sent on + default turnaround when
   *  the vendor has one and Due on is empty. */
  const handleVendor = (id: string) => {
    const v = vendors.find((x) => String(x.id) === id);
    const patch: Partial<LabDraft> = { lab_vendor_id: id };
    if (v?.default_turnaround_days && draft.lab_sent_on && !draft.lab_due_on) {
      patch.lab_due_on = addDaysIso(draft.lab_sent_on, v.default_turnaround_days);
    }
    onChange(patch);
  };

  /** Sent on change: keep Due on in step when the vendor has a turnaround and
   *  Due on was empty or previously derived. */
  const handleSent = (sent: string) => {
    const patch: Partial<LabDraft> = { lab_sent_on: sent };
    if (sent && vendor?.default_turnaround_days && !draft.lab_due_on) {
      patch.lab_due_on = addDaysIso(sent, vendor.default_turnaround_days);
    }
    onChange(patch);
  };

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
        {selected.days_overdue != null && selected.days_overdue > 0 && (
          <span className="font-semibold text-red-600">{selected.days_overdue} day(s) overdue</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Lab vendor */}
        <div>
          <label className={labelCls} htmlFor="lab-vendor">Lab</label>
          <select
            id="lab-vendor"
            className={inputCls}
            value={draft.lab_vendor_id}
            onChange={(e) => handleVendor(e.target.value)}
          >
            <option value="">— No lab selected —</option>
            {vendors.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {labVendorLabel(v)}
                {v.is_active ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
          {vendors.length === 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              No labs in the catalog yet — add them under Setup → Lab Tracking → Labs.
            </p>
          )}
        </div>

        {/* DDS */}
        <div>
          <label className={labelCls} htmlFor="lab-dds">DDS</label>
          <input
            id="lab-dds"
            type="text"
            maxLength={100}
            className={inputCls}
            value={draft.lab_dds}
            onChange={(e) => onChange({ lab_dds: e.target.value })}
            placeholder="Dentist the case is for"
          />
        </div>

        {/* Lab Cost */}
        <div>
          <label className={labelCls} htmlFor="lab-cost">Lab Cost</label>
          <input
            id="lab-cost"
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={draft.lab_cost}
            onChange={(e) => onChange({ lab_cost: e.target.value })}
            placeholder="0.00"
          />
        </div>

        {/* Sent on */}
        <div>
          <label className={labelCls} htmlFor="lab-sent">Sent on</label>
          <input
            id="lab-sent"
            type="date"
            className={inputCls}
            value={draft.lab_sent_on}
            onChange={(e) => handleSent(e.target.value)}
          />
        </div>

        {/* Due on */}
        <div>
          <label className={labelCls} htmlFor="lab-due">
            Due on
            {vendor?.default_turnaround_days ? (
              <span className="ml-1 font-normal text-slate-400">· {vendor.default_turnaround_days}-day turnaround</span>
            ) : null}
          </label>
          <input
            id="lab-due"
            type="date"
            className={inputCls}
            min={draft.lab_sent_on || undefined}
            value={draft.lab_due_on}
            onChange={(e) => onChange({ lab_due_on: e.target.value })}
          />
        </div>

        {/* Received on (check-in) */}
        <div>
          <label className={labelCls} htmlFor="lab-received">Recvd. on</label>
          <input
            id="lab-received"
            type="date"
            className={inputCls}
            min={draft.lab_sent_on || undefined}
            value={draft.lab_received_on}
            onChange={(e) => onChange({ lab_received_on: e.target.value })}
          />
        </div>

        {/* Short notice */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={draft.lab_short_notice}
              onChange={(e) => onChange({ lab_short_notice: e.target.checked })}
            />
            Short Notice
          </label>
        </div>
      </div>

      {orderError && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600" role="alert">
          <AlertTriangle className="h-3.5 w-3.5" />
          {orderError}
        </p>
      )}
    </div>
  );
}

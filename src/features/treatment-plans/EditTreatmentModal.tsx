import { useMemo, useState } from 'react';
import type { ProviderRead, TreatmentPlanItemRead, TreatmentPlanItemUpdate } from '@/api/generated/model';
import { STATUS_ORDER, STATUS_LABEL, num, type TxStatus, normalizeStatus } from './txModel';

// Legacy Denticon M08 "Edit Treatment" window — the per-procedure detail editor
// opened by clicking a row's hyperlinked Diagnosed Date. On the
// `feature/phase_data_migration` branch the item carries real backend columns
// for most of these fields (phase_id, provider_id, discount, diagnosed_date,
// start_date, end_date); a handful of legacy fields still have no backend home
// and are rendered disabled with a shared "not stored yet" footnote for layout
// parity (see gaps PLAN-11/17/18/19 in the dev report).

export interface EditTreatmentSave {
  patch: TreatmentPlanItemUpdate;
  /** Target legacy Tx Plan ID when the user re-parents the item (else null). */
  targetTid: number | null;
}

interface EditTreatmentModalProps {
  item: TreatmentPlanItemRead;
  providers: ProviderRead[];
  availableTids: number[];
  currentTid: number;
  officeName?: string;
  descriptionFallback?: string;
  busy: boolean;
  onSave: (save: EditTreatmentSave) => void;
  onDelete: () => void;
  onClose: () => void;
}

const label = 'flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600';
const field =
  'h-7 rounded border border-slate-300 px-2 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
const selectField = `${field} tx-select`;
const readonlyField = 'h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-500';
const gatedField = `${field} cursor-not-allowed bg-slate-50 text-slate-400`;

/** Strip an ISO datetime/date to the yyyy-MM-dd a <input type="date"> expects. */
function toDateInput(v: string | null | undefined): string {
  if (!v) return '';
  return v.slice(0, 10);
}
/** Normalize a date input back to null when empty (backend wants null, not ''). */
function fromDateInput(v: string): string | null {
  return v.trim() ? v : null;
}
function fmtStamp(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US');
}

export default function EditTreatmentModal(props: EditTreatmentModalProps) {
  const { item, providers, availableTids, currentTid, officeName, descriptionFallback, busy } = props;

  // ---- Form state (mirrors backend snake_case field names) ----------------
  const [tid, setTid] = useState<number>(currentTid);
  const [phaseId, setPhaseId] = useState<string>(item.phase_id != null ? String(item.phase_id) : '');
  const [description, setDescription] = useState<string>(item.description ?? descriptionFallback ?? '');
  const [providerId, setProviderId] = useState<string>(item.provider_id ?? item.diagnosed_by ?? '');
  const [tooth, setTooth] = useState<string>(item.tooth ?? '');
  const [surface, setSurface] = useState<string>(item.surface ?? '');
  const [fee, setFee] = useState<string>(item.fee ?? '0');
  const [estIns, setEstIns] = useState<string>(item.insurance_estimate ?? '0');
  const [discount, setDiscount] = useState<string>(item.discount ?? '');
  const [status, setStatus] = useState<TxStatus>(normalizeStatus(item.status));
  const [diagnosedDate, setDiagnosedDate] = useState<string>(toDateInput(item.diagnosed_date ?? item.created_at));
  const [startDate, setStartDate] = useState<string>(toDateInput(item.start_date));
  const [endDate, setEndDate] = useState<string>(toDateInput(item.end_date));

  const tidOptions = useMemo(() => {
    const set = new Set(availableTids);
    set.add(currentTid);
    return [...set].sort((a, b) => a - b);
  }, [availableTids, currentTid]);

  const estPat = Math.max(0, num(fee) - num(estIns)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const submit = () => {
    const patch: TreatmentPlanItemUpdate = {
      description: description.trim() || null,
      // Dual-write: the new dedicated column AND the legacy stopgap the grid /
      // bulk actions still read, so provider & phase stay consistent everywhere.
      provider_id: providerId || null,
      diagnosed_by: providerId || null,
      phase_id: phaseId.trim() ? Number(phaseId) : null,
      billing_order: phaseId.trim() ? String(Number(phaseId)) : item.billing_order ?? null,
      tooth: tooth.trim() || null,
      surface: surface.trim() || null,
      fee: fee.trim() === '' ? '0' : fee,
      insurance_estimate: estIns.trim() === '' ? '0' : estIns,
      discount: discount.trim() === '' ? null : discount,
      status,
      diagnosed_date: fromDateInput(diagnosedDate),
      start_date: fromDateInput(startDate),
      end_date: fromDateInput(endDate),
    };
    props.onSave({ patch, targetTid: tid !== currentTid ? tid : null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div className="mt-8 w-full max-w-5xl rounded-lg bg-white shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center justify-between rounded-t-lg bg-sky-700 px-4 py-2 text-white">
          <h2 className="text-sm font-bold tracking-wide">
            Edit Treatment — {item.procedure_code}
            {description ? ` · ${description}` : ''}
          </h2>
          <button
            className="rounded px-2 text-lg leading-none hover:bg-white/20"
            onClick={props.onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            {/* ---- Column 1: identity + billing ---- */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>
                  TX Plan ID <span className="text-red-500">*</span>
                  <select className={selectField} value={tid} onChange={(e) => setTid(Number(e.target.value))}>
                    {tidOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  Phase ID
                  <input
                    type="number"
                    min={1}
                    className={field}
                    value={phaseId}
                    placeholder="—"
                    onChange={(e) => setPhaseId(e.target.value)}
                  />
                </label>
              </div>
              <label className={label}>
                Code
                <input className={readonlyField} value={item.procedure_code} readOnly />
              </label>
              <label className={label}>
                Description
                <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className={label}>
                Treating Provider
                <select className={selectField} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                  <option value="">— Select provider —</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.short_id ? `${p.short_id} : ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>
                  Fee
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className={field}
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                  />
                </label>
                <label className={label}>
                  Est Ins
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className={field}
                    value={estIns}
                    onChange={(e) => setEstIns(e.target.value)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>
                  Est Pat
                  <input className={readonlyField} value={estPat} readOnly />
                </label>
                <label className={label}>
                  Discount %
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className={field}
                    value={discount}
                    placeholder="0.00"
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* ---- Column 2: dates + tooth ---- */}
            <div className="flex flex-col gap-3">
              <label className={label}>
                Diagnosed Date
                <input
                  type="date"
                  className={field}
                  value={diagnosedDate}
                  onChange={(e) => setDiagnosedDate(e.target.value)}
                />
              </label>
              <label className={label}>
                Start Date
                <input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className={label}>
                End Date
                <input type="date" className={field} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>
                  Tooth
                  <input className={field} value={tooth} onChange={(e) => setTooth(e.target.value)} />
                </label>
                <label className={label}>
                  Surface
                  <input className={field} value={surface} onChange={(e) => setSurface(e.target.value)} />
                </label>
              </div>
              {/* Gated legacy date/duration fields (no backend column yet) */}
              <div className="grid grid-cols-2 gap-3">
                <label className={`${label} opacity-60`}>
                  Accepted Date †
                  <input className={gatedField} value="" placeholder="—" disabled />
                </label>
                <label className={`${label} opacity-60`}>
                  Scheduled Date †
                  <input className={gatedField} value="" placeholder="—" disabled />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={`${label} opacity-60`}>
                  Pre Auth Date †
                  <input className={gatedField} value="" placeholder="—" disabled />
                </label>
                <label className={`${label} opacity-60`}>
                  Duration †
                  <input className={gatedField} value="" placeholder="—" disabled />
                </label>
              </div>
            </div>

            {/* ---- Column 3: status + metadata ---- */}
            <div className="flex flex-col gap-3">
              <fieldset className="rounded border border-slate-200 p-2">
                <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</legend>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {STATUS_ORDER.map((s) => (
                    <label key={s} className="flex items-center gap-1 text-xs text-slate-700">
                      <input type="radio" name="edit-status" checked={status === s} onChange={() => setStatus(s)} />
                      {STATUS_LABEL[s]}
                    </label>
                  ))}
                  {/* Legacy-only statuses with no backend enum value */}
                  {['Scheduled', 'Completed', 'Internal Referral', 'External Referral'].map((s) => (
                    <label key={s} className="flex items-center gap-1 text-xs text-slate-400" title="Not in backend status enum">
                      <input type="radio" name="edit-status" disabled />
                      {s} †
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="rounded border border-slate-200 p-2 opacity-60">
                <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Pre-Auth Status †
                </legend>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    <input type="radio" name="preauth" disabled /> Sent
                  </label>
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    <input type="radio" name="preauth" disabled /> Closed
                  </label>
                </div>
              </fieldset>

              <div className="rounded border border-slate-200 p-2 text-[11px] text-slate-600">
                <div className="mb-1 font-bold uppercase tracking-wide text-slate-500">Record</div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                  <dt className="text-slate-400">Treating Office</dt>
                  <dd>{officeName || '—'}</dd>
                  <dt className="text-slate-400">Created By †</dt>
                  <dd>—</dd>
                  <dt className="text-slate-400">Created On</dt>
                  <dd>{fmtStamp(item.created_at)}</dd>
                  <dt className="text-slate-400">Modified By †</dt>
                  <dd>—</dd>
                  <dt className="text-slate-400">Modified On</dt>
                  <dd>{fmtStamp(item.updated_at)}</dd>
                  <dt className="text-slate-400">Fee Schedule †</dt>
                  <dd>—</dd>
                </dl>
              </div>

              <label className={`${label} opacity-60`}>
                Treatment Counselor †
                <input className={gatedField} value="" placeholder="—" disabled />
              </label>
            </div>
          </div>

          {/* Notes (gated — no backend field on the item) */}
          <label className={`${label} mt-3 opacity-60`}>
            Notes †
            <textarea
              className={`${gatedField} h-16 resize-none py-1`}
              value=""
              placeholder="Per-procedure notes are not stored by the backend yet."
              disabled
            />
          </label>

          <p className="mt-2 text-[11px] text-slate-400">
            † Legacy field with no backend column yet — shown for parity, not saved. See the treatment-plan dev report.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-slate-200 bg-slate-50 px-4 py-2">
          <button
            className="mr-auto rounded border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
            disabled={busy}
            onClick={props.onDelete}
          >
            Delete
          </button>
          <button
            className="rounded bg-sky-600 px-4 py-1 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
            disabled={busy}
            onClick={submit}
          >
            Save
          </button>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            disabled={busy}
            onClick={props.onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

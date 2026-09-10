import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  ProcedureCodeRead,
  ProviderRead,
  TreatmentPlanInsuranceDetailRead,
  TreatmentPlanItemRead,
  TreatmentPlanItemUpdate,
} from '@/api/generated/model';
import { listTreatmentPlanInsuranceDetails } from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import { resolveProcedureFee, type FeeScheduleContext } from '@/services/feeScheduleResolver';
import ToothNumberPicker from '@/features/progress-notes/ToothNumberPicker';
import { SETTABLE_STATUSES, STATUS_LABEL, num, type SettableTxStatus, normalizeStatus } from './txModel';
import { providerOptionLabel } from '@/services/providerDirectory';

// Legacy Denticon M08 "EDIT TREATMENT" window — the per-procedure detail editor
// opened by double-clicking a grid row (or clicking its Diag Date link). The
// layout mirrors the legacy window cell-for-cell: four label/field columns
// (identity+billing · dates+tooth · STATUS/PRE AUTH · record), then the
// DENTAL CROSS CODING / NOTES strip and the DELETE · HIDE DENTAL · SAVE ·
// CANCEL footer.
//
// Backend homes (all snake_case, written unchanged):
//   treatment_plan_item      — tx plan (re-parent), phase_id, description,
//                              provider_id(+diagnosed_by), tooth, surface, fee,
//                              insurance_estimate, discount, status,
//                              diagnosed/start/end dates
//   treatment-plan-insurance-details (one row per item) — preauth_date, notes,
//                              and the ADVANCED read-only coverage figures
// Fields with no backend column are rendered disabled with a "†" and are not
// saved (see the gap list in docs/treatment-plans/treatment_plan_backend_devreport.md).

export interface EditTreatmentInsuranceDetailSave {
  /** Existing detail row id (PATCH) or null (POST a new row for the item). */
  id: number | null;
  preauth_date: string | null;
  notes: string | null;
}

export interface EditTreatmentSave {
  patch: TreatmentPlanItemUpdate;
  /** Target legacy Tx Plan ID when the user re-parents the item (else null). */
  targetTid: number | null;
  /** Pre Auth Date / Notes changes (insurance-detail row); null when untouched. */
  insurance_detail: EditTreatmentInsuranceDetailSave | null;
}

interface EditTreatmentModalProps {
  item: TreatmentPlanItemRead;
  providers: ProviderRead[];
  availableTids: number[];
  currentTid: number;
  /** True when a ledger charge was posted for this item (derived "Completed"). */
  completed: boolean;
  officeName?: string;
  procedureCode?: ProcedureCodeRead;
  feeCtx: FeeScheduleContext;
  descriptionFallback?: string;
  busy: boolean;
  onSave: (save: EditTreatmentSave) => void;
  onDelete: () => void;
  onClose: () => void;
}

// ---- Styling ---------------------------------------------------------------

const input =
  'h-6 w-full rounded-sm border border-slate-300 bg-white px-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
const selectInput = `${input} tx-select`;
const readonlyInput = 'h-6 w-full rounded-sm border border-slate-200 bg-slate-100 px-1.5 text-xs text-slate-600';
const gatedInput = `${input} cursor-not-allowed bg-slate-50 text-slate-400`;
const footerBtn =
  'rounded bg-sky-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-40';
const smallBtn =
  'rounded bg-sky-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40';
const panelTitle = 'px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700';

/** One legacy label | field row inside a column. */
function Row({ label, gated, children }: { label: string; gated?: boolean; children: ReactNode }) {
  return (
    <>
      <div
        className={`flex min-h-8 items-center border-b border-r border-slate-300 bg-slate-50 px-2 text-[11px] font-semibold ${
          gated ? 'text-slate-400' : 'text-slate-700'
        }`}
      >
        {label}
        {gated && <span className="ml-0.5">†</span>}
      </div>
      <div className="flex min-h-8 items-center gap-1 border-b border-slate-300 px-1">{children}</div>
    </>
  );
}

function Column({ children, labelWidth = '128px' }: { children: ReactNode; labelWidth?: string }) {
  return (
    <div
      className="grid border-l border-t border-slate-300 bg-white"
      style={{ gridTemplateColumns: `${labelWidth} minmax(0,1fr)` }}
    >
      {children}
    </div>
  );
}

// ---- Helpers ---------------------------------------------------------------

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
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtMoney(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDetailMoney(v: string | null | undefined): string {
  return v == null || v === '' ? '—' : fmtMoney(num(v));
}

export default function EditTreatmentModal(props: EditTreatmentModalProps) {
  const { item, providers, availableTids, currentTid, completed, officeName, procedureCode, feeCtx, descriptionFallback, busy } =
    props;

  // ---- Item form state (mirrors backend snake_case field names) -----------
  const [tid, setTid] = useState<number>(currentTid);
  const [phaseId, setPhaseId] = useState<string>(item.phase_id != null ? String(item.phase_id) : '');
  const [description, setDescription] = useState<string>(item.description ?? descriptionFallback ?? '');
  const [providerId, setProviderId] = useState<string>(item.provider_id ?? item.diagnosed_by ?? '');
  const [tooth, setTooth] = useState<string>(item.tooth ?? '');
  const [surface, setSurface] = useState<string>(item.surface ?? '');
  const [fee, setFee] = useState<string>(item.fee ?? '0');
  const [estIns, setEstIns] = useState<string>(item.insurance_estimate ?? '0');
  const [discount, setDiscount] = useState<string>(item.discount ?? '');
  const [status, setStatus] = useState<SettableTxStatus>(() => {
    const s = normalizeStatus(item.status);
    return s === 'completed' ? 'diagnosed' : s;
  });
  const [diagnosedDate, setDiagnosedDate] = useState<string>(toDateInput(item.diagnosed_date ?? item.created_at));
  const [startDate, setStartDate] = useState<string>(toDateInput(item.start_date));
  const [endDate, setEndDate] = useState<string>(toDateInput(item.end_date));

  // ---- Per-item insurance detail (Pre Auth Date / Notes / ADVANCED figures) -
  const detailQuery = useQuery({
    queryKey: ['tx-item-ins-detail', item.id],
    queryFn: async (): Promise<TreatmentPlanInsuranceDetailRead | null> => {
      const res = await listTreatmentPlanInsuranceDetails({ plan_item_id: item.id, size: 200 });
      const live = (res.items ?? []).filter((d) => !d.is_archived);
      return live[0] ?? null;
    },
  });
  const detail = detailQuery.data ?? null;
  const [preauthDate, setPreauthDate] = useState('');
  const [notes, setNotes] = useState('');
  const [detailSeeded, setDetailSeeded] = useState(false);
  useEffect(() => {
    if (!detailQuery.isSuccess || detailSeeded) return;
    setPreauthDate(toDateInput(detail?.preauth_date));
    setNotes(detail?.notes ?? '');
    setDetailSeeded(true);
  }, [detailQuery.isSuccess, detail, detailSeeded]);

  // ---- Fee schedule used (resolved client-side from Setup assignments) -----
  const feeQuery = useQuery({
    queryKey: [
      'tx-fee-schedule-used',
      item.procedure_code,
      feeCtx.candidates.map((c) => c.fee_schedule_id).join(','),
      feeCtx.ucr_schedule_id,
    ],
    queryFn: () =>
      resolveProcedureFee(feeCtx, item.procedure_code, {
        default_fee: procedureCode?.default_fee,
        on_date: item.diagnosed_date ?? null,
      }),
  });
  const feeScheduleUsed =
    feeQuery.data?.fee_schedule_name ?? (feeQuery.data?.source === 'code_default' ? 'Code default fee' : '');

  // ---- UI state -------------------------------------------------------------
  const [showDental, setShowDental] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toothPickerOpen, setToothPickerOpen] = useState(false);

  const tidOptions = useMemo(() => {
    const set = new Set(availableTids);
    set.add(currentTid);
    return [...set].sort((a, b) => a - b);
  }, [availableTids, currentTid]);

  const estPat = Math.max(0, num(fee) - num(estIns));

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
      diagnosed_date: fromDateInput(diagnosedDate),
      start_date: fromDateInput(startDate),
      end_date: fromDateInput(endDate),
    };
    // `completed` is server-derived (422 if set directly) — never send it.
    if (!completed) patch.status = status;

    const preauthChanged = preauthDate !== toDateInput(detail?.preauth_date);
    const notesChanged = notes !== (detail?.notes ?? '');
    const insurance_detail: EditTreatmentInsuranceDetailSave | null =
      detailSeeded && (preauthChanged || notesChanged)
        ? { id: detail?.id ?? null, preauth_date: fromDateInput(preauthDate), notes: notes.trim() || null }
        : null;

    props.onSave({ patch, targetTid: tid !== currentTid ? tid : null, insurance_detail });
  };

  const pickStatus = (s: SettableTxStatus) => {
    if (!completed) setStatus(s);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3">
      <div className="mt-4 w-full max-w-[1200px] rounded border border-sky-900/40 bg-slate-100 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center justify-between bg-sky-700 px-3 py-1.5 text-white">
          <h2 className="text-xs font-bold uppercase tracking-wider">Edit Treatment</h2>
          <button className="rounded px-2 text-lg leading-none hover:bg-white/20" onClick={props.onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-2">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.25fr_1.05fr_1fr_1fr]">
            {/* ---- Column 1: identity + billing ---- */}
            <Column labelWidth="140px">
              <Row label="Treatment Counselor" gated>
                <select
                  className={`${selectInput} cursor-not-allowed bg-slate-50 text-slate-400`}
                  value=""
                  disabled
                  title="Not stored by the backend yet"
                >
                  <option value="">—</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {providerOptionLabel(p)}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="TX Plan ID">
                <select className={selectInput} value={tid} onChange={(e) => setTid(Number(e.target.value))}>
                  {tidOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Phase ID">
                <input
                  type="number"
                  min={1}
                  className={input}
                  value={phaseId}
                  placeholder="—"
                  onChange={(e) => setPhaseId(e.target.value)}
                />
              </Row>
              <Row label="">
                <span />
              </Row>
              <Row label="Code">
                <input className={readonlyInput} value={item.procedure_code} readOnly />
              </Row>
              <Row label="ADA Code">
                <input className={readonlyInput} value={procedureCode?.code ?? item.procedure_code} readOnly />
              </Row>
              <Row label="Description">
                <input className={input} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Row>
              <Row label="Treating Provider">
                <select className={selectInput} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                  <option value="">— Select provider —</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {providerOptionLabel(p)}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Fee">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={`${input} text-right`}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </Row>
              <Row label="Est Ins">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={`${input} text-right`}
                  value={estIns}
                  onChange={(e) => setEstIns(e.target.value)}
                />
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() => setShowAdvanced((v) => !v)}
                  title="Insurance estimate breakdown for this procedure"
                >
                  Advanced
                </button>
              </Row>
              {showAdvanced && (
                <div className="col-span-2 border-b border-slate-300 bg-sky-50/60 px-2 py-1.5 text-[11px] text-slate-700">
                  <div className="mb-1 font-bold uppercase tracking-wide text-slate-600">Insurance estimate detail</div>
                  {detailQuery.isLoading ? (
                    <div className="text-slate-400">Loading…</div>
                  ) : (
                    <dl className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-0.5">
                      <dt className="text-slate-500">Coverage %</dt>
                      <dd>{detail?.coverage_pct ?? '—'}</dd>
                      <dt className="text-slate-500">Deductible</dt>
                      <dd>{fmtDetailMoney(detail?.deductible)}</dd>
                      <dt className="text-slate-500">Est Ins</dt>
                      <dd>{fmtDetailMoney(detail?.estimated_ins)}</dd>
                      <dt className="text-slate-500">Annual Max Rem</dt>
                      <dd>{fmtDetailMoney(detail?.annual_max_rem)}</dd>
                      <dt className="text-slate-500">Est Pat</dt>
                      <dd>{detail ? fmtDetailMoney(detail.estimated_pat) : fmtMoney(estPat)}</dd>
                      <dt className="text-slate-500">Pre-Auth #</dt>
                      <dd>{detail?.preauth_number ?? '—'}</dd>
                      <dt className="text-slate-500">Pre-Auth Amt</dt>
                      <dd>{fmtDetailMoney(detail?.preauth_amount)}</dd>
                      <dt className="text-slate-500">Pre-Auth Expires</dt>
                      <dd>{detail?.preauth_expires ?? '—'}</dd>
                    </dl>
                  )}
                  {!detail && !detailQuery.isLoading && (
                    <div className="mt-1 text-slate-400">No insurance estimate on file — run Re-Estimate on the plan.</div>
                  )}
                </div>
              )}
            </Column>

            {/* ---- Column 2: dates + tooth ---- */}
            <Column labelWidth="112px">
              <Row label="Diagnosed Date">
                <input type="date" className={input} value={diagnosedDate} onChange={(e) => setDiagnosedDate(e.target.value)} />
              </Row>
              <Row label="Start Date">
                <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Row>
              <Row label="Accepted Date" gated>
                <input className={gatedInput} value="" placeholder="—" disabled />
              </Row>
              <Row label="Scheduled Date" gated>
                <input className={gatedInput} value="" placeholder="—" disabled />
              </Row>
              <Row label="End Date">
                <input type="date" className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Row>
              <Row label="Pre Auth Date">
                <input
                  type="date"
                  className={input}
                  value={preauthDate}
                  disabled={!detailSeeded}
                  onChange={(e) => setPreauthDate(e.target.value)}
                />
              </Row>
              <Row label="Tooth">
                <input className={input} value={tooth} onChange={(e) => setTooth(e.target.value)} />
                <button type="button" className={smallBtn} onClick={() => setToothPickerOpen(true)} title="Pick tooth number">
                  V
                </button>
              </Row>
              <Row label="Surface">
                <input className={input} value={surface} onChange={(e) => setSurface(e.target.value)} />
              </Row>
              <Row label="Duration" gated>
                <input
                  className={gatedInput}
                  value={procedureCode?.default_duration_minutes ?? 0}
                  disabled
                  title="Per-procedure duration is not stored by the backend yet (code default shown)"
                />
              </Row>
              <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-300 px-2 py-1.5 text-[11px] text-slate-400">
                <label className="flex cursor-not-allowed items-center gap-1" title="Not stored by the backend yet">
                  <input type="checkbox" disabled /> Update End Date At Posting †
                </label>
                <label className="flex cursor-not-allowed items-center gap-1" title="Not stored by the backend yet">
                  <input type="checkbox" disabled /> Re-Estimate At Posting †
                </label>
              </div>
            </Column>

            {/* ---- Column 3: STATUS + PRE AUTH STATUS ---- */}
            <div className="flex flex-col border border-slate-300 bg-white">
              <div className={`${panelTitle} border-b border-slate-300 bg-slate-50`}>Status</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 px-2 py-2 text-xs text-slate-700">
                {SETTABLE_STATUSES.map((s) => (
                  <label key={s} className={`flex items-center gap-1.5 ${completed ? 'text-slate-400' : ''}`}>
                    <input
                      type="radio"
                      name="edit-status"
                      checked={!completed && status === s}
                      disabled={completed}
                      onChange={() => pickStatus(s)}
                    />
                    {STATUS_LABEL[s]}
                  </label>
                ))}
                <label className={`flex items-center gap-1.5 ${completed ? 'text-slate-400' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!completed && status === 'scheduled'}
                    disabled={completed}
                    onChange={(e) => pickStatus(e.target.checked ? 'scheduled' : 'diagnosed')}
                  />
                  Scheduled
                </label>
                <label className="flex items-center gap-1.5 text-slate-400" title="Not in the backend status enum">
                  <input type="checkbox" disabled /> Internal Referral †
                </label>
                <label
                  className="flex items-center gap-1.5 text-slate-500"
                  title="Set automatically when a charge is posted to the ledger for this procedure"
                >
                  <input type="checkbox" checked={completed} disabled readOnly /> Completed
                </label>
                <label className="flex items-center gap-1.5 text-slate-400" title="Not in the backend status enum">
                  <input type="checkbox" disabled /> External Referral †
                </label>
              </div>
              <div className={`${panelTitle} border-y border-slate-300 bg-slate-50`}>Pre Auth Status</div>
              <div className="flex gap-6 px-2 py-2 text-xs text-slate-400">
                <label className="flex cursor-not-allowed items-center gap-1.5" title="Not stored by the backend yet">
                  <input type="radio" name="preauth" disabled /> Sent †
                </label>
                <label className="flex cursor-not-allowed items-center gap-1.5" title="Not stored by the backend yet">
                  <input type="radio" name="preauth" disabled /> Closed †
                </label>
              </div>
              {completed && (
                <div className="mx-2 mb-2 rounded border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] text-teal-800">
                  This procedure was posted to the ledger, so its status is Completed and cannot be changed here.
                </div>
              )}
            </div>

            {/* ---- Column 4: record ---- */}
            <Column labelWidth="118px">
              <Row label="Treating Office">
                <span className="truncate text-xs text-slate-700" title={officeName}>
                  {officeName || '—'}
                </span>
              </Row>
              <Row label="Created By" gated>
                <span className="text-xs text-slate-400">—</span>
              </Row>
              <Row label="Created On">
                <span className="text-xs text-slate-700">{fmtStamp(item.created_at)}</span>
              </Row>
              <Row label="Modified By" gated>
                <span className="text-xs text-slate-400">—</span>
              </Row>
              <Row label="Modified On">
                <span className="text-xs text-slate-700">{fmtStamp(item.updated_at)}</span>
              </Row>
              <Row label="Discount %">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  className={`${input} text-right`}
                  value={discount}
                  placeholder="0.00"
                  onChange={(e) => setDiscount(e.target.value)}
                />
                <span className="text-xs text-slate-500">%</span>
              </Row>
              <Row label="Fee Schedule Used">
                <span className="truncate text-xs text-slate-700" title={feeQuery.data?.reason}>
                  {feeQuery.isLoading ? 'Resolving…' : feeScheduleUsed || '—'}
                </span>
              </Row>
              <Row label="Referral Type" gated>
                <input className={gatedInput} value="" placeholder="—" disabled />
              </Row>
              <Row label="Referring Dentist" gated>
                <input className={gatedInput} value="" placeholder="—" disabled />
                <button type="button" className={smallBtn} disabled title="Not stored by the backend yet">
                  …
                </button>
              </Row>
            </Column>
          </div>

          {/* ---- DENTAL CROSS CODING INFORMATION / NOTES ---- */}
          {showDental && (
            <div className="mt-2">
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)]">
                <div>
                  <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-sky-800">
                    Dental Cross Coding Information
                  </div>
                  <div className="mt-1 border border-slate-300 bg-white">
                    <div className="bg-sky-700 px-2 py-1 text-[11px] font-bold text-white">ICD-10 Diagnostic Codes</div>
                    <div className="flex h-24 items-center justify-center px-2 text-[11px] text-slate-400">
                      No diagnostic codes linked †
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-sky-800">Notes</div>
                    <button type="button" className={`${footerBtn} py-1`} disabled title="Not stored by the backend yet">
                      Clear Dental Cross Coding Info †
                    </button>
                  </div>
                  <textarea
                    className="mt-1 h-[124px] w-full resize-none rounded-sm border border-slate-300 bg-white px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50"
                    value={notes}
                    disabled={!detailSeeded}
                    placeholder={detailSeeded ? 'Notes for this procedure' : 'Loading…'}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <p className="mt-2 px-1 text-[10px] text-slate-400">
            † Legacy field with no backend column yet — shown for parity, not saved. See the treatment-plan dev report.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-300 bg-slate-100 px-3 py-2">
          <button className={footerBtn} disabled={busy} onClick={props.onDelete}>
            Delete
          </button>
          <button className={footerBtn} disabled={busy} onClick={() => setShowDental((v) => !v)}>
            {showDental ? 'Hide Dental' : 'Show Dental'}
          </button>
          <button className={footerBtn} disabled={busy} onClick={submit}>
            Save
          </button>
          <button className={footerBtn} disabled={busy} onClick={props.onClose}>
            Cancel
          </button>
        </div>
      </div>

      {toothPickerOpen && (
        <ToothNumberPicker
          initial={tooth ? tooth.split(',').map((t) => t.trim()).filter(Boolean) : []}
          onSave={(teeth) => {
            setTooth(teeth.join(','));
            setToothPickerOpen(false);
          }}
          onCancel={() => setToothPickerOpen(false)}
        />
      )}
    </div>
  );
}

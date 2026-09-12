import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  IcdCodeRead,
  ItemIcdCodeRead,
  ProcedureCodeRead,
  ProviderRead,
  ReferralRead,
  TreatmentPlanInsuranceDetailRead,
  TreatmentPlanItemRead,
  TreatmentPlanItemUpdate,
  UserRead,
} from '@/api/generated/model';
import { listTreatmentPlanInsuranceDetails } from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import { resolveProcedureFee, type FeeScheduleContext } from '@/services/feeScheduleResolver';
import { providerOptionLabel } from '@/services/providerDirectory';
import ToothNumberPicker from '@/features/progress-notes/ToothNumberPicker';
import { SETTABLE_STATUSES, STATUS_LABEL, num, type SettableTxStatus, normalizeStatus } from './txModel';
import { listAllReferrals, loadAllUsers, searchIcdCodes } from './treatmentPlanService';

// Legacy Denticon M08 "EDIT TREATMENT" window — the per-procedure detail editor
// opened by double-clicking a grid row (or clicking its Diag Date link). The
// layout mirrors the legacy window cell-for-cell: four label/field columns
// (identity+billing · dates+tooth · STATUS/PRE AUTH · record), then the
// DENTAL CROSS CODING / NOTES strip and the DELETE · HIDE DENTAL · SAVE ·
// CANCEL footer.
//
// Backend homes (all snake_case, written unchanged — see
// docs/treatment-plans/treatment_plan_edit_backend_response.md):
//   treatment_plan_item — tx plan (re-parent), phase_id, description,
//     provider_id(+diagnosed_by), tooth, surface, fee, insurance_estimate,
//     discount, status (incl. scheduled / internal_referral / external_referral),
//     diagnosed/start/end/accepted/scheduled dates, duration_minutes, notes,
//     counselor_user_id, referral_id + referral_type, the two "at posting"
//     flags, icd_code_ids (replaces the set), created/updated_by_name,
//     fee_schedule_name (read-only, stamped by the server pricing)
//   treatment-plan-insurance-details (one row per item) — preauth_date,
//     preauth_status (sent/closed) and the ADVANCED read-only coverage figures
// `completed` is server-derived (posting a charge) and is never sent.

export interface EditTreatmentInsuranceDetailSave {
  /** Existing detail row id (PATCH) or null (POST a new row for the item). */
  id: number | null;
  preauth_date: string | null;
  preauth_status: string | null;
}

export interface EditTreatmentSave {
  patch: TreatmentPlanItemUpdate;
  /** Target legacy Tx Plan ID when the user re-parents the item (else null). */
  targetTid: number | null;
  /** Pre Auth Date / Status changes (insurance-detail row); null when untouched. */
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
const footerBtn =
  'rounded bg-sky-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-40';
const smallBtn =
  'rounded bg-sky-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40';
const panelTitle = 'px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700';

/** Statuses the legacy window exposes as checkboxes (mutually exclusive with the radios). */
const CHECKBOX_STATUSES: { value: SettableTxStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'internal_referral', label: 'Internal Referral' },
  { value: 'external_referral', label: 'External Referral' },
];

/** One legacy label | field row inside a column. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-8 items-center border-b border-r border-slate-300 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700">
        {label}
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
function userLabel(u: UserRead): string {
  const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return name ? `${name} (${u.username})` : u.username;
}
function referralLabel(r: ReferralRead): string {
  const person = [r.last_name, r.first_name].filter(Boolean).join(', ');
  return person || r.practice_name || r.contact_name || `Referral #${r.id}`;
}
function icdLabel(c: { code?: string | null; icd10?: string | null; description?: string | null }): string {
  return [c.icd10 || c.code, c.description].filter(Boolean).join(' — ');
}

export default function EditTreatmentModal(props: EditTreatmentModalProps) {
  const { item, providers, availableTids, currentTid, completed, officeName, procedureCode, feeCtx, descriptionFallback, busy } =
    props;

  // ---- Item form state (mirrors backend snake_case field names) -----------
  const [tid, setTid] = useState<number>(currentTid);
  const [phaseId, setPhaseId] = useState<string>(item.phase_id != null ? String(item.phase_id) : '');
  const [description, setDescription] = useState<string>(item.description ?? descriptionFallback ?? '');
  const [providerId, setProviderId] = useState<string>(item.provider_id ?? item.diagnosed_by ?? '');
  const [counselorUserId, setCounselorUserId] = useState<string>(
    item.counselor_user_id != null ? String(item.counselor_user_id) : '',
  );
  const [tooth, setTooth] = useState<string>(item.tooth ?? '');
  const [surface, setSurface] = useState<string>(item.surface ?? '');
  const [fee, setFee] = useState<string>(item.fee ?? '0');
  const [estIns, setEstIns] = useState<string>(item.insurance_estimate ?? '0');
  const [discount, setDiscount] = useState<string>(item.discount ?? '');
  const [duration, setDuration] = useState<string>(item.duration_minutes != null ? String(item.duration_minutes) : '');
  const [status, setStatus] = useState<SettableTxStatus>(() => {
    const s = normalizeStatus(item.status);
    return s === 'completed' ? 'diagnosed' : s;
  });
  const [diagnosedDate, setDiagnosedDate] = useState<string>(toDateInput(item.diagnosed_date ?? item.created_at));
  const [startDate, setStartDate] = useState<string>(toDateInput(item.start_date));
  const [endDate, setEndDate] = useState<string>(toDateInput(item.end_date));
  const [acceptedDate, setAcceptedDate] = useState<string>(toDateInput(item.accepted_date));
  const [scheduledDate, setScheduledDate] = useState<string>(toDateInput(item.scheduled_date));
  const [referralId, setReferralId] = useState<string>(item.referral_id != null ? String(item.referral_id) : '');
  const [referralType, setReferralType] = useState<string>(item.referral_type ?? '');
  const [updateEndDateAtPosting, setUpdateEndDateAtPosting] = useState<boolean>(!!item.update_end_date_at_posting);
  const [reEstimateAtPosting, setReEstimateAtPosting] = useState<boolean>(!!item.re_estimate_at_posting);
  const [notes, setNotes] = useState<string>(item.notes ?? '');
  const [icdCodes, setIcdCodes] = useState<ItemIcdCodeRead[]>(() => [...(item.icd_codes ?? [])]);

  // ---- Per-item insurance detail (Pre Auth Date / Status / ADVANCED figures)
  const detailQuery = useQuery({
    queryKey: ['tx-item-ins-detail', item.id],
    queryFn: async (): Promise<TreatmentPlanInsuranceDetailRead | null> => {
      const res = await listTreatmentPlanInsuranceDetails({ plan_item_id: item.id, size: 200 });
      return (res.items ?? [])[0] ?? null;
    },
  });
  const detail = detailQuery.data ?? null;
  const [preauthDate, setPreauthDate] = useState('');
  const [preauthStatus, setPreauthStatus] = useState('');
  const [detailSeeded, setDetailSeeded] = useState(false);
  useEffect(() => {
    if (!detailQuery.isSuccess || detailSeeded) return;
    setPreauthDate(toDateInput(detail?.preauth_date));
    setPreauthStatus((detail?.preauth_status ?? '').toLowerCase());
    setDetailSeeded(true);
  }, [detailQuery.isSuccess, detail, detailSeeded]);

  // ---- Lookups: counselor users, referral sources, ICD-10 search -----------
  const usersQuery = useQuery({ queryKey: ['tx-users'], queryFn: loadAllUsers, staleTime: 5 * 60_000 });
  const referralsQuery = useQuery({ queryKey: ['tx-referrals'], queryFn: listAllReferrals, staleTime: 5 * 60_000 });
  const [icdQuery, setIcdQuery] = useState('');
  const icdSearch = useQuery({
    queryKey: ['tx-icd-search', icdQuery.trim()],
    enabled: icdQuery.trim().length >= 2,
    queryFn: () => searchIcdCodes(icdQuery.trim()),
  });

  // ---- Fee schedule used ----------------------------------------------------
  // The server stamps `fee_schedule_name` when its pricing produced the fee
  // (PLAN-29). Older / hand-priced items carry none; fall back to what Setup's
  // assignments would pick today, flagged as a resolution rather than a record.
  const feeQuery = useQuery({
    queryKey: [
      'tx-fee-schedule-used',
      item.procedure_code,
      feeCtx.candidates.map((c) => c.fee_schedule_id).join(','),
      feeCtx.ucr_schedule_id,
    ],
    enabled: !item.fee_schedule_name,
    queryFn: () =>
      resolveProcedureFee(feeCtx, item.procedure_code, {
        default_fee: procedureCode?.default_fee,
        on_date: item.diagnosed_date ?? null,
      }),
  });
  const feeScheduleUsed = item.fee_schedule_name
    ? { text: item.fee_schedule_name, title: 'Fee schedule recorded on this procedure' }
    : feeQuery.data?.fee_schedule_name
      ? { text: `${feeQuery.data.fee_schedule_name} (resolved)`, title: `Not recorded on the item — ${feeQuery.data.reason}` }
      : { text: feeQuery.isLoading ? 'Resolving…' : '—', title: 'No fee schedule recorded on this procedure' };

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
  const durationPlaceholder = String(procedureCode?.default_duration_minutes ?? 30);

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
      duration_minutes: duration.trim() === '' ? null : Number(duration),
      diagnosed_date: fromDateInput(diagnosedDate),
      start_date: fromDateInput(startDate),
      end_date: fromDateInput(endDate),
      accepted_date: fromDateInput(acceptedDate),
      scheduled_date: fromDateInput(scheduledDate),
      counselor_user_id: counselorUserId ? Number(counselorUserId) : null,
      referral_id: referralId ? Number(referralId) : null,
      referral_type: referralType || null,
      update_end_date_at_posting: updateEndDateAtPosting,
      re_estimate_at_posting: reEstimateAtPosting,
      notes: notes.trim() || null,
      icd_code_ids: icdCodes.map((c) => c.id),
    };
    // `completed` is server-derived (422 if set directly) — never send it.
    if (!completed) patch.status = status;

    const preauthChanged = preauthDate !== toDateInput(detail?.preauth_date);
    const preauthStatusChanged = preauthStatus !== (detail?.preauth_status ?? '').toLowerCase();
    const insurance_detail: EditTreatmentInsuranceDetailSave | null =
      detailSeeded && (preauthChanged || preauthStatusChanged)
        ? { id: detail?.id ?? null, preauth_date: fromDateInput(preauthDate), preauth_status: preauthStatus || null }
        : null;

    props.onSave({ patch, targetTid: tid !== currentTid ? tid : null, insurance_detail });
  };

  const pickStatus = (s: SettableTxStatus) => {
    if (!completed) setStatus(s);
  };
  /** Unchecking a checkbox status falls back to the item's last radio status. */
  const radioFallback = (): SettableTxStatus => {
    const before = normalizeStatus(item.status_before_scheduled ?? item.status);
    return SETTABLE_STATUSES.includes(before as SettableTxStatus) ? (before as SettableTxStatus) : 'diagnosed';
  };

  const addIcd = (c: IcdCodeRead) => {
    if (icdCodes.some((x) => x.id === c.id)) return;
    setIcdCodes((prev) => [...prev, { id: c.id, code: c.code, icd10: c.icd10, description: c.description, ordinal: prev.length }]);
    setIcdQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3">
      <div className="mt-4 w-full max-w-[1200px] rounded border border-sky-900/40 bg-slate-100 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center justify-between bg-sky-700 px-3 py-1.5 text-white">
          <h2 className="text-xs font-bold uppercase tracking-wider !text-white">Edit Treatment</h2>
          <button className="rounded px-2 text-lg leading-none hover:bg-white/20" onClick={props.onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-2">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.25fr_1.05fr_1fr_1fr]">
            {/* ---- Column 1: identity + billing ---- */}
            <Column labelWidth="140px">
              <Row label="Treatment Counselor">
                <select
                  className={selectInput}
                  value={counselorUserId}
                  onChange={(e) => setCounselorUserId(e.target.value)}
                  disabled={usersQuery.isLoading}
                >
                  <option value="">{usersQuery.isLoading ? 'Loading users…' : '—'}</option>
                  {(usersQuery.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
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
              <Row label="Accepted Date">
                <input
                  type="date"
                  className={input}
                  value={acceptedDate}
                  title="Stamped automatically the first time the procedure is Accepted; editable"
                  onChange={(e) => setAcceptedDate(e.target.value)}
                />
              </Row>
              <Row label="Scheduled Date">
                <input
                  type="date"
                  className={input}
                  value={scheduledDate}
                  title="Follows the soonest live appointment this procedure is booked on; editable"
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
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
              <Row label="Duration">
                <input
                  type="number"
                  min={0}
                  step={5}
                  className={`${input} text-right`}
                  value={duration}
                  placeholder={durationPlaceholder}
                  title={`Minutes. Blank = procedure-code default (${durationPlaceholder})`}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <span className="text-[11px] text-slate-500">min</span>
              </Row>
              <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-300 px-2 py-1.5 text-[11px] text-slate-700">
                <label className="flex items-center gap-1" title="When posted to the ledger, set End Date to the service date even if one is already set">
                  <input
                    type="checkbox"
                    checked={updateEndDateAtPosting}
                    onChange={(e) => setUpdateEndDateAtPosting(e.target.checked)}
                  />
                  Update End Date At Posting
                </label>
                <label className="flex items-center gap-1" title="When posted to the ledger, recompute the insurance estimate from today's coverage first">
                  <input type="checkbox" checked={reEstimateAtPosting} onChange={(e) => setReEstimateAtPosting(e.target.checked)} />
                  Re-Estimate At Posting
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
                    title="Set automatically when the procedure is booked on an appointment; can also be set by hand"
                    onChange={(e) => pickStatus(e.target.checked ? 'scheduled' : radioFallback())}
                  />
                  Scheduled
                </label>
                {CHECKBOX_STATUSES.filter((c) => c.value !== 'scheduled').map((c) => (
                  <label key={c.value} className={`flex items-center gap-1.5 ${completed ? 'text-slate-400' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!completed && status === c.value}
                      disabled={completed}
                      onChange={(e) => pickStatus(e.target.checked ? c.value : radioFallback())}
                    />
                    {c.label}
                  </label>
                ))}
                <label
                  className="flex items-center gap-1.5 text-slate-500"
                  title="Set automatically when a charge is posted to the ledger for this procedure"
                >
                  <input type="checkbox" checked={completed} disabled readOnly /> Completed
                </label>
              </div>
              <div className={`${panelTitle} border-y border-slate-300 bg-slate-50`}>Pre Auth Status</div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-2 py-2 text-xs text-slate-700">
                {['sent', 'closed'].map((s) => (
                  <label key={s} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="preauth"
                      checked={preauthStatus === s}
                      disabled={!detailSeeded}
                      onChange={() => setPreauthStatus(s)}
                    />
                    {s === 'sent' ? 'Sent' : 'Closed'}
                  </label>
                ))}
                {preauthStatus && (
                  <button type="button" className="text-[11px] text-sky-700 underline" onClick={() => setPreauthStatus('')}>
                    clear
                  </button>
                )}
                {detail?.preauth_status_at && (
                  <span className="basis-full text-[10px] text-slate-400">Status set {fmtStamp(detail.preauth_status_at)}</span>
                )}
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
              <Row label="Created By">
                <span className="truncate text-xs text-slate-700">{item.created_by_name || '—'}</span>
              </Row>
              <Row label="Created On">
                <span className="text-xs text-slate-700">{fmtStamp(item.created_at)}</span>
              </Row>
              <Row label="Modified By">
                <span className="truncate text-xs text-slate-700">{item.updated_by_name || '—'}</span>
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
                <span className="truncate text-xs text-slate-700" title={feeScheduleUsed.title}>
                  {feeScheduleUsed.text}
                </span>
              </Row>
              <Row label="Referral Type">
                <select className={selectInput} value={referralType} onChange={(e) => setReferralType(e.target.value)}>
                  <option value="">—</option>
                  <option value="in">In (referred to us)</option>
                  <option value="out">Out (referred elsewhere)</option>
                </select>
              </Row>
              <Row label="Referring Dentist">
                <select
                  className={selectInput}
                  value={referralId}
                  disabled={referralsQuery.isLoading}
                  onChange={(e) => setReferralId(e.target.value)}
                >
                  <option value="">{referralsQuery.isLoading ? 'Loading referrals…' : '—'}</option>
                  {(referralsQuery.data ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {referralLabel(r)}
                    </option>
                  ))}
                </select>
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
                    <ul className="max-h-24 min-h-12 overflow-y-auto text-[11px]">
                      {icdCodes.length === 0 ? (
                        <li className="px-2 py-3 text-center text-slate-400">No diagnostic codes linked</li>
                      ) : (
                        icdCodes.map((c) => (
                          <li key={c.id} className="flex items-center gap-2 border-b border-slate-100 px-2 py-0.5 text-slate-700">
                            <span className="min-w-0 flex-1 truncate" title={icdLabel(c)}>
                              {icdLabel(c)}
                            </span>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-red-600"
                              title="Remove"
                              onClick={() => setIcdCodes((prev) => prev.filter((x) => x.id !== c.id))}
                            >
                              ×
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                    <div className="relative border-t border-slate-200 p-1">
                      <input
                        className={input}
                        value={icdQuery}
                        placeholder="Add ICD-10: search code or description…"
                        onChange={(e) => setIcdQuery(e.target.value)}
                      />
                      {icdQuery.trim().length >= 2 && (
                        <ul className="absolute left-1 right-1 z-10 mt-0.5 max-h-40 overflow-y-auto rounded border border-slate-300 bg-white text-[11px] shadow-lg">
                          {icdSearch.isLoading ? (
                            <li className="px-2 py-1 text-slate-400">Searching…</li>
                          ) : (icdSearch.data ?? []).length === 0 ? (
                            <li className="px-2 py-1 text-slate-400">No matches</li>
                          ) : (
                            (icdSearch.data ?? []).map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className="w-full px-2 py-1 text-left hover:bg-sky-50 disabled:text-slate-300"
                                  disabled={icdCodes.some((x) => x.id === c.id)}
                                  onClick={() => addIcd(c)}
                                >
                                  {icdLabel(c)}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-sky-800">Notes</div>
                    <button
                      type="button"
                      className={`${footerBtn} py-1`}
                      disabled={icdCodes.length === 0}
                      title="Remove every linked ICD-10 code (saved with Save)"
                      onClick={() => setIcdCodes([])}
                    >
                      Clear Dental Cross Coding Info
                    </button>
                  </div>
                  <textarea
                    className="mt-1 h-[124px] w-full resize-none rounded-sm border border-slate-300 bg-white px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={notes}
                    placeholder="Notes for this procedure"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
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

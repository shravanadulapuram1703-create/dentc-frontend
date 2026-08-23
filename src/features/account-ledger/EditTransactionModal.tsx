// Ledger drill-down — the legacy "Edit Treatment" / "Edit Payment" windows.
//
// Clicking a ledger row's Date opens the source transaction here, exactly as the
// legacy Patient Ledger does. Claim rows are NOT handled here: they drill into
// the existing full-page claim screen (`/patient/:id/claim/:claimId`,
// `components/patient/ClaimDetail.tsx`) which already renders the legacy
// "Primary Dental Insurance Claim" window.
//
// The record is re-fetched by id on open rather than reusing the ledger row, so
// the window always shows the authoritative record (the feed is denormalised and
// drops several of these fields).

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2, Save, X, AlertTriangle } from 'lucide-react';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import { providerOptionLabel } from '@/services/providerDirectory';
import { useDefinitions } from '@/hooks/useDefinitions';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  getPatientProcedure,
  updatePatientProcedure,
  deletePatientProcedure,
} from '@/api/generated/endpoints/clinical/clinical';
import {
  getPatientPayment,
  updatePatientPayment,
  deletePatientPayment,
} from '@/api/generated/endpoints/billing/billing';
import { loadProcedureCodes, codeDescription } from '@/features/transactions/transactionsService';
import { money, num, fmtDate } from '@/features/transactions/transactionsModel';
import type { PatientProcedureRead, PatientPaymentRead } from '@/api/generated/model';
import type { LedgerRow } from './accountLedgerModel';

interface Props {
  row: LedgerRow; // the ledger row that was clicked (kind 'charge' | 'payment')
  officeLabel: (id: number | null | undefined) => string;
  userLabel: (id: number | null | undefined) => string;
  onClose: () => void;
  /** Called after a successful save/delete so the ledger can refresh. */
  onChanged: () => void;
}

const HEADER_BG = 'linear-gradient(180deg,#2a4a73,#1d3a5f)';

const cellLabel = 'w-[136px] shrink-0 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600';
const cellValue = 'px-2 py-1.5 text-[12px] text-slate-800';
const input =
  'h-7 w-full rounded border border-slate-300 px-2 text-[12px] text-slate-800 ' +
  'focus:border-[#1f6fc4] focus:outline-none focus:ring-1 focus:ring-[#1f6fc4]/30';
const inputRo = 'h-7 w-full rounded border border-slate-200 bg-slate-100 px-2 text-[12px] text-slate-500';

/** One label/field pair in the legacy three-column grid. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-stretch border-b border-slate-200 last:border-b-0">
      <div className={cellLabel}>{label}</div>
      <div className={`flex flex-1 items-center ${cellValue}`}>{children}</div>
    </div>
  );
}

/** A field the backend has no column for — shown for layout parity, disabled. */
function Gated({ label, hint }: { label: string; hint: string }) {
  return (
    <Field label={label}>
      <input disabled value="" title={hint} className={`${inputRo} cursor-not-allowed`} />
    </Field>
  );
}

const stamp = (v: string | null | undefined): string => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US');
};

const NOT_STORED = 'The backend has no column for this field yet — see the ledger gap report.';

export default function EditTransactionModal({
  row,
  officeLabel,
  userLabel,
  onClose,
  onChanged,
}: Props) {
  const isCharge = row.kind === 'charge';

  const [proc, setProc] = useState<PatientProcedureRead | null>(null);
  const [pay, setPay] = useState<PatientPaymentRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ---- Editable form state (bound directly to backend snake_case names) ----
  const [date_of_service, setDos] = useState('');
  const [tooth, setTooth] = useState('');
  const [surface, setSurface] = useState('');
  const [provider_id, setProviderId] = useState('');
  const [fee, setFee] = useState('');
  const [insurance_estimate, setEstIns] = useState('');
  const [hold_claim, setHoldClaim] = useState(false);
  const [notes, setNotes] = useState('');
  const [payment_date, setPaymentDate] = useState('');
  const [amount, setAmount] = useState('');
  const [check_number, setCheckNumber] = useState('');
  const [bank_number, setBankNumber] = useState('');

  useBodyScrollLock(true);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Scope the provider picker to the transaction's own office, not the patient's.
  const { providers, providerLabel } = useProviderDirectory(row.office_id);
  const { definitions: paymentDefs } = useDefinitions('payment_method');

  // ---- Load the source record -------------------------------------------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      await loadProcedureCodes(); // warm the cache so codeDescription() is sync
      if (isCharge) {
        const p = await getPatientProcedure(row.source_id);
        if (!alive) return;
        setProc(p);
        setDos((p.date_of_service ?? '').slice(0, 10));
        setTooth(p.tooth ?? '');
        setSurface(p.surface ?? '');
        setProviderId(p.provider_id ?? '');
        setFee(p.fee ?? '');
        setEstIns(p.insurance_estimate ?? '');
        setHoldClaim(Boolean(p.hold_claim));
        setNotes(p.notes ?? '');
      } else {
        const p = await getPatientPayment(row.source_id);
        if (!alive) return;
        setPay(p);
        setPaymentDate((p.payment_date ?? '').slice(0, 10));
        setAmount(p.amount ?? '');
        setCheckNumber(p.check_number ?? '');
        setBankNumber(p.bank_number ?? '');
        setNotes(p.notes ?? '');
      }
    };
    load()
      .catch((err) => {
        if (!alive) return;
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setError(detail || 'Could not load this transaction.');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [isCharge, row.source_id]);

  const paymentMethodLabel = useMemo(() => {
    const m = new Map(paymentDefs.map((d) => [d.key1, d.description]));
    return (code: string | null | undefined) => (code ? m.get(code) || code : '—');
  }, [paymentDefs]);

  // A procedure already attached to a claim must not have its money moved from
  // here — that would silently desync the submitted claim. Legacy locks the same
  // fields; tooth/surface/DOS stay editable.
  const billed = Boolean(proc?.claim_id);

  const estPat = Math.max(0, num(fee) - num(insurance_estimate));

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isCharge) {
        await updatePatientProcedure(row.source_id, {
          date_of_service: date_of_service || undefined,
          tooth: tooth.trim() || null,
          surface: surface.trim() || null,
          provider_id: provider_id || null,
          hold_claim,
          notes: notes.trim() || null,
          // Financials only when the charge has not been claimed.
          ...(billed ? {} : { fee: fee || undefined, insurance_estimate: insurance_estimate || undefined }),
        });
      } else {
        await updatePatientPayment(row.source_id, {
          payment_date: payment_date || undefined,
          amount: amount || undefined,
          check_number: check_number.trim() || null,
          bank_number: bank_number.trim() || null,
          notes: notes.trim() || null,
        });
      }
      onChanged();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Could not save this transaction.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const what = isCharge ? 'procedure' : 'payment';
    if (!window.confirm(`Delete this ${what}? It will be removed from the ledger.`)) return;
    setBusy(true);
    setError(null);
    try {
      if (isCharge) await deletePatientProcedure(row.source_id);
      else await deletePatientPayment(row.source_id);
      onChanged();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || `Could not delete this ${what}.`);
    } finally {
      setBusy(false);
    }
  };

  const title = isCharge ? 'Edit Treatment' : 'Edit Payment';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="my-6 flex w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ background: HEADER_BG }}>
          <div className="text-sm font-semibold uppercase tracking-wide">{title}</div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" /> Loading transaction…
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {billed && (
              <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This procedure is attached to a claim, so its Fee and Est Ins are locked here. You
                can still change Tooth #, Surface and DOS.
              </div>
            )}

            <div className="grid gap-px bg-slate-200 p-4 md:grid-cols-3">
              {isCharge ? (
                <>
                  {/* ---- Column 1 ---- */}
                  <div className="bg-white">
                    <Field label="DOS">
                      <input
                        type="date"
                        value={date_of_service}
                        onChange={(e) => setDos(e.target.value)}
                        className={input}
                      />
                    </Field>
                    <Field label="Transaction Date">
                      <span className="font-mono">{fmtDate(proc?.created_at) || '—'}</span>
                    </Field>
                    <Field label="Code">
                      <span className="font-mono font-semibold text-[#1f6fc4]">{proc?.procedure_code}</span>
                    </Field>
                    <Field label="ADA Code">
                      <span className="font-mono">{proc?.procedure_code}</span>
                    </Field>
                    <Field label="Tooth">
                      <input value={tooth} onChange={(e) => setTooth(e.target.value)} className={input} />
                    </Field>
                    <Field label="Surface">
                      <input value={surface} onChange={(e) => setSurface(e.target.value)} className={input} />
                    </Field>
                    <Gated label="Duration (mins)" hint={NOT_STORED} />
                    <Field label="Fee">
                      <input
                        value={fee}
                        disabled={billed}
                        onChange={(e) => setFee(e.target.value)}
                        className={billed ? inputRo : input}
                      />
                    </Field>
                    <Gated label="Contract PlanID" hint={NOT_STORED} />
                    <Gated label="Referral Type" hint={NOT_STORED} />
                  </div>

                  {/* ---- Column 2 ---- */}
                  <div className="bg-white">
                    <Field label="Patient Name">{proc?.patient_name || row.patient}</Field>
                    <Field label="Treating Provider">
                      <select
                        value={provider_id}
                        onChange={(e) => setProviderId(e.target.value)}
                        className={input}
                      >
                        <option value="">— Select provider —</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>{providerOptionLabel(p)}</option>
                        ))}
                        {/* Keep a provider who no longer works at this office selectable. */}
                        {provider_id && !providers.some((p) => p.id === provider_id) && (
                          <option value={provider_id}>{providerLabel(provider_id)}</option>
                        )}
                      </select>
                    </Field>
                    <Field label="Description">
                      <span>{codeDescription(proc?.procedure_code ?? '') || '—'}</span>
                    </Field>
                    {/* Est Ins and Hold Claim share a row, as they do on-prem. */}
                    <Field label="Est Ins">
                      <div className="flex w-full items-center gap-3">
                        <input
                          value={insurance_estimate}
                          disabled={billed}
                          onChange={(e) => setEstIns(e.target.value)}
                          className={billed ? inputRo : input}
                        />
                        <label
                          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-slate-700"
                          title="Hold this charge back from claim creation. Held charges show an H in the ledger's Bill column and cannot be selected for a claim."
                        >
                          <input
                            type="checkbox"
                            checked={hold_claim}
                            onChange={(e) => setHoldClaim(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[#1f6fc4]"
                          />
                          Hold Claim
                        </label>
                      </div>
                    </Field>
                    <Field label="Est Pat">
                      <span className="font-mono">${money(estPat)}</span>
                    </Field>
                    <Field label="Posted From">
                      {proc?.treatment_plan_id ? 'Treatment Plan' : 'Individual'}
                    </Field>
                    <Gated label="Referring Dentist" hint={NOT_STORED} />
                  </div>

                  {/* ---- Column 3 ---- */}
                  <div className="bg-white">
                    <Field label="Created By">{userLabel(proc?.created_by) || '—'}</Field>
                    <Field label="Created On">{stamp(proc?.created_at)}</Field>
                    <Gated label="Modified By" hint={NOT_STORED} />
                    <Gated label="Modified On" hint={NOT_STORED} />
                    <Field label="UCR Fee">
                      <span className="font-mono">${money(proc?.ucr_fee)}</span>
                    </Field>
                    <Gated label="Fee Schedule Used" hint={NOT_STORED} />
                    <Field label="Office">{officeLabel(proc?.office_id)}</Field>
                    <Field label="Billing Status">{proc?.billing_status || '—'}</Field>
                    <Field label="Claim">
                      {proc?.claim_id ? <span className="font-mono text-[11px]">{proc.claim_id}</span> : 'Not billed'}
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  {/* ---- Payment: column 1 ---- */}
                  <div className="bg-white">
                    <Field label="Transaction Date">
                      <span className="font-mono">{fmtDate(pay?.created_at) || '—'}</span>
                    </Field>
                    <Field label="Payment Date">
                      <input
                        type="date"
                        value={payment_date}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className={input}
                      />
                    </Field>
                    <Field label="Code">
                      <span className="font-mono font-semibold text-orange-700">{row.code}</span>
                    </Field>
                    <Field label="Amount">
                      <input value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
                    </Field>
                    <Field label="Check #">
                      <input value={check_number} onChange={(e) => setCheckNumber(e.target.value)} className={input} />
                    </Field>
                    <Field label="Bank #">
                      <input value={bank_number} onChange={(e) => setBankNumber(e.target.value)} className={input} />
                    </Field>
                    <Gated label="EOB #" hint={NOT_STORED} />
                  </div>

                  {/* ---- Payment: column 2 ---- */}
                  <div className="bg-white">
                    <Field label="Patient Name">{pay?.patient_name || row.patient}</Field>
                    <Field label="Description">{row.detail || row.description}</Field>
                    <Field label="Payment Type">{pay?.payment_type || '—'}</Field>
                    <Field label="Payment Method">{paymentMethodLabel(pay?.payment_method)}</Field>
                    <Field label="Provider">{providerLabel(pay?.provider_id) || '—'}</Field>
                    <Gated label="Apply To" hint={NOT_STORED} />
                    <Gated label="Posted From" hint={NOT_STORED} />
                  </div>

                  {/* ---- Payment: column 3 ---- */}
                  <div className="bg-white">
                    <Field label="Created By">{userLabel(pay?.created_by) || '—'}</Field>
                    <Field label="Created On">{stamp(pay?.created_at)}</Field>
                    <Gated label="Modified By" hint={NOT_STORED} />
                    <Gated label="Modified On" hint={NOT_STORED} />
                    <Field label="Office">{officeLabel(pay?.office_id)}</Field>
                    <Field label="Voided">{pay?.is_void ? 'Yes' : 'No'}</Field>
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            <div className="px-4 pb-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#1f6fc4]">Notes</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded border border-slate-300 p-2 text-[12px] focus:border-[#1f6fc4] focus:outline-none focus:ring-1 focus:ring-[#1f6fc4]/30"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Greyed fields have no backend column yet and are shown for parity with the legacy window.
              </p>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md bg-[#1f6fc4] px-3 py-1.5 text-[11px] font-bold uppercase text-white shadow-sm hover:bg-[#175aa8] disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
              <button
                onClick={onClose}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

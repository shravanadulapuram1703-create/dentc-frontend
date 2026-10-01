import { useEffect, useMemo, useState } from 'react';
import { Loader2, Check, XCircle } from 'lucide-react';
import type { PatientProcedureRead, PatientAdjustmentCreate } from '@/api/generated/model';
import { createPatientAdjustment, createPatientPayment } from '@/api/generated/endpoints/billing/billing';
import { useDefinitions } from '@/hooks/useDefinitions';
import { ACCENT_BLUE, HEADER_GRADIENT, genId } from './transactionsModel';
import { type ProviderOption } from '@/services/providerDirectory';
import ProviderSelect from './ProviderSelect';
import { ProceduresToPost } from './PaymentsTab';
import {
  ADJUSTMENT_GROUPS,
  DEBIT_ADJUSTMENT_PAYMENT_TYPE,
  adjustmentCodeOptions,
  type AdjustmentGroup,
  type AdjustmentSign,
} from './transactionCodes';

interface Props {
  patientId: number;
  officeId: number | null;
  transactionDateIso: string;
  patientName: string;
  outstanding: PatientProcedureRead[];
  /** Providers serving this office; `allProviders` keeps the rest reachable. */
  providers: ProviderOption[];
  allProviders: ProviderOption[];
  /** Toolbar provider (seeded from the patient's preferred provider) — the adjustment defaults to it. */
  defaultProviderId: string;
  providerLabel: (id: string | null | undefined) => string;
  codeDescription: (code: string) => string;
  onApplied: () => void;
}

const INPUT = 'w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none';

export default function AdjustmentsTab({
  patientId,
  officeId,
  transactionDateIso,
  patientName,
  outstanding,
  providers,
  allProviders,
  defaultProviderId,
  providerLabel,
  codeDescription,
  onApplied,
}: Props) {
  const { definitions: adjustmentDefs } = useDefinitions('adjustment');
  // Legacy catalog overlaid by whatever the backend has seeded (see transactionCodes.ts).
  const codes = useMemo(() => adjustmentCodeOptions(adjustmentDefs), [adjustmentDefs]);

  const [searchCode, setSearchCode] = useState('');
  const [searchSign, setSearchSign] = useState<'All' | AdjustmentSign>('All');
  const [searchGroup, setSearchGroup] = useState<'All' | AdjustmentGroup>('All');
  const [searchDescription, setSearchDescription] = useState('');
  /** Selected adjustment code — stored as `adjustment_type`. */
  const [adjustment_type, setAdjustmentType] = useState('');

  const selectedCode = codes.find((c) => c.code === adjustment_type) ?? null;
  const isDebit = selectedCode?.sign === '+';

  const [amount, setAmount] = useState('');
  const [provider_id, setProviderId] = useState(defaultProviderId);
  // Follow the toolbar provider until the user picks one here explicitly.
  const [providerTouched, setProviderTouched] = useState(false);
  useEffect(() => {
    if (!providerTouched) setProviderId(defaultProviderId);
  }, [defaultProviderId, providerTouched]);
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');

  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleCodes = codes.filter(
    (c) =>
      (!searchCode || c.code.toLowerCase().includes(searchCode.toLowerCase())) &&
      (searchSign === 'All' || c.sign === searchSign) &&
      (searchGroup === 'All' || c.group === searchGroup) &&
      (!searchDescription || c.description.toLowerCase().includes(searchDescription.toLowerCase())),
  );

  const totalAllocated = Object.values(allocAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  /** A debit (+) code cannot be split per procedure (gap ADJ-2) — drop any split already keyed in. */
  const pickCode = (code: string) => {
    setAdjustmentType(code);
    setError(null);
    if (codes.find((c) => c.code === code)?.sign === '+') {
      setAllocAmounts({});
      setSelected(new Set());
    }
  };

  const reset = () => {
    setAmount('');
    setRef('');
    setNotes('');
    setAdjustmentType('');
    setProviderTouched(false);
    setProviderId(defaultProviderId);
    setAllocAmounts({});
    setSelected(new Set());
    setError(null);
  };

  const apply = async () => {
    if (!selectedCode) {
      setError('Select an adjustment code from the list.');
      return;
    }
    const mergedNotes = [ref ? `Ref# ${ref}` : '', notes].filter(Boolean).join(' — ');

    // Per-procedure adjustments (one record per row with a New Amt) take precedence;
    // otherwise a single account-level adjustment using the Amount field.
    const perProc = isDebit
      ? []
      : outstanding
          .map((p) => ({ id: p.id, amt: parseFloat(allocAmounts[p.id] || '0') }))
          .filter((a) => a.amt > 0);

    const amt = parseFloat(amount);
    if (perProc.length === 0 && (!amt || Number.isNaN(amt) || amt <= 0)) {
      setError(isDebit ? 'Enter an Amount.' : 'Enter an Amount, or a New Amt on at least one procedure.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isDebit) {
        // `/patient-adjustments` is always applied as a credit by the backend, so a
        // balance-increasing (+) code is persisted as a signed `patient_payments`
        // row — `payment_type = 'adjustment'`, positive amount — the one row kind
        // whose stored sign the ledger honours as a delta (see transactionCodes.ts, gap ADJ-2).
        await createPatientPayment({
          id: genId(),
          patient_id: patientId,
          office_id: officeId,
          payment_date: transactionDateIso,
          amount: amt.toFixed(2),
          payment_type: DEBIT_ADJUSTMENT_PAYMENT_TYPE,
          payment_method: selectedCode.code,
          ...(provider_id ? { provider_id } : {}),
          ...(mergedNotes ? { notes: mergedNotes } : {}),
        });
      } else {
        const base: Omit<PatientAdjustmentCreate, 'amount' | 'procedure_id'> = {
          patient_id: patientId,
          office_id: officeId,
          adjustment_date: transactionDateIso,
          adjustment_type: selectedCode.code,
          write_off_type: selectedCode.group.toLowerCase(),
          ...(provider_id ? { provider_id } : {}),
          ...(mergedNotes ? { notes: mergedNotes } : {}),
        };
        if (perProc.length > 0) {
          for (const row of perProc) {
            await createPatientAdjustment({ ...base, amount: row.amt.toFixed(2), procedure_id: row.id });
          }
        } else {
          await createPatientAdjustment({ ...base, amount: amt.toFixed(2) });
        }
      }
      reset();
      onApplied();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Failed to record adjustment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[520px_1fr]">
        {/* Adjustment code picker: Search Code | All (+/-) | All (Production/Collection) | Search Description */}
        <div className="rounded border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_72px_120px_minmax(0,1fr)] gap-1 border-b border-slate-200 bg-slate-50 p-2">
            <input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search Code"
              title="Search by adjustment code"
              className="w-full min-w-0 rounded border border-[#2566a8] px-2 py-1.5 text-xs focus:outline-none"
            />
            <select
              value={searchSign}
              onChange={(e) => setSearchSign(e.target.value as 'All' | AdjustmentSign)}
              title="+ increases the patient balance, - decreases it"
              className="tx-select w-full min-w-0 rounded border border-slate-300 px-1 py-1.5 text-xs"
            >
              <option value="All">All</option>
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
            <select
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value as 'All' | AdjustmentGroup)}
              title="Production or Collection adjustment"
              className="tx-select w-full min-w-0 rounded border border-slate-300 px-1 py-1.5 text-xs"
            >
              <option value="All">All</option>
              {ADJUSTMENT_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
              placeholder="Search Description"
              title="Search by description"
              className="w-full min-w-0 rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none"
            />
          </div>
          <div
            className="grid grid-cols-[86px_40px_100px_minmax(0,1fr)] gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: HEADER_GRADIENT }}
          >
            <span>Search Code</span>
            <span>All</span>
            <span>All</span>
            <span>Search Description</span>
          </div>
          <div className="max-h-48 overflow-y-auto" data-testid="adjustment-code-list">
            {visibleCodes.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">No adjustment codes match.</div>
            ) : (
              visibleCodes.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => pickCode(c.code)}
                  data-code={c.code}
                  className={`grid w-full grid-cols-[86px_40px_100px_minmax(0,1fr)] items-center gap-2 border-b border-slate-100 px-3 py-1.5 text-left text-xs transition hover:bg-sky-50 ${
                    adjustment_type === c.code ? 'bg-sky-100' : ''
                  }`}
                >
                  <span className="font-semibold text-[#1d4ed8]">{c.code}</span>
                  <span className={`font-bold ${c.sign === '+' ? 'text-red-600' : 'text-emerald-700'}`}>{c.sign}</span>
                  <span className="text-slate-600">{c.group}</span>
                  <span className="min-w-0 truncate text-slate-800" title={c.description}>
                    {c.description}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Adjustment entry fields */}
        <div className="rounded border border-slate-200 bg-white" data-testid="adjustment-panel" data-sign={selectedCode?.sign ?? ''}>
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#E8EFF7] px-3 py-1.5">
            <span className="text-xs font-bold text-[#16406e]">
              {selectedCode ? (isDebit ? 'Debit adjustment (+)' : 'Credit adjustment (-)') : 'Adjustment'}
            </span>
            <span className="text-[11px] text-slate-600">
              {selectedCode ? (
                <>
                  <span className="font-semibold text-[#1d4ed8]">{selectedCode.code}</span> · {selectedCode.group} ·{' '}
                  {selectedCode.description}
                </>
              ) : (
                'Select an adjustment code to open its entry form'
              )}
            </span>
          </div>
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-3 gap-3">
              <Labeled label="Amount" required>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${INPUT} text-right`}
                />
              </Labeled>
              <Labeled label="Provider">
                <ProviderSelect
                  kind="treating"
                  value={provider_id}
                  onChange={(id) => {
                    setProviderTouched(true);
                    setProviderId(id);
                  }}
                  officeProviders={providers}
                  allProviders={allProviders}
                  placeholder="All Providers"
                  className="tx-select w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                  title="Provider the adjustment is booked against"
                />
              </Labeled>
              <Labeled label="Ref #">
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference" className={INPUT} />
              </Labeled>
            </div>
            <Labeled label="Notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={INPUT} />
            </Labeled>
            {selectedCode && (
              <div
                className={`rounded px-3 py-2 text-[11px] ${
                  isDebit ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {isDebit
                  ? 'This code INCREASES the patient balance. It posts to the account as a whole; a per-procedure split is not available for debit adjustments.'
                  : 'This code DECREASES the patient balance. Enter an Amount for the account, or a New Amt on specific procedures below.'}
              </div>
            )}
            {error && <div className="rounded bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
            <div className="flex justify-end gap-2">
              <button
                onClick={apply}
                disabled={saving}
                style={{ background: ACCENT_BLUE }}
                className="flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                APPLY
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 rounded bg-slate-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-slate-600"
              >
                <XCircle className="h-3.5 w-3.5" />
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProceduresToPost
        kind="adjustment"
        outstanding={outstanding}
        patientName={patientName}
        providerLabel={providerLabel}
        codeDescription={codeDescription}
        allocAmounts={allocAmounts}
        setAllocAmounts={setAllocAmounts}
        selected={selected}
        setSelected={setSelected}
        totalAllocated={totalAllocated}
        disabled={isDebit}
        disabledReason={isDebit ? 'Debit (+) adjustments post to the account, not per procedure' : undefined}
      />
    </div>
  );
}

function Labeled({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

import { useState } from 'react';
import { Loader2, Check, XCircle } from 'lucide-react';
import type { PatientProcedureRead, PatientAdjustmentCreate } from '@/api/generated/model';
import { createPatientAdjustment } from '@/api/generated/endpoints/billing/billing';
import { useDefinitions } from '@/hooks/useDefinitions';
import { ACCENT_BLUE } from './transactionsModel';
import { providerOptionLabel, type ProviderOption } from '@/services/providerDirectory';
import { ProceduresToPost } from './PaymentsTab';

interface Props {
  patientId: number;
  officeId: number | null;
  transactionDateIso: string;
  patientName: string;
  outstanding: PatientProcedureRead[];
  providers: ProviderOption[];
  providerLabel: (id: string | null | undefined) => string;
  codeDescription: (code: string) => string;
  onApplied: () => void;
}

export default function AdjustmentsTab({
  patientId,
  officeId,
  transactionDateIso,
  patientName,
  outstanding,
  providers,
  providerLabel,
  codeDescription,
  onApplied,
}: Props) {
  const { definitions: adjustmentDefs } = useDefinitions('adjustment');
  const codes = adjustmentDefs.map((d) => ({ code: d.key1, group: d.key2 ?? 'Production', description: d.description }));

  const [searchCode, setSearchCode] = useState('');
  const [searchGroup, setSearchGroup] = useState('All');
  const [searchType, setSearchType] = useState('All');
  const [searchDescription, setSearchDescription] = useState('');
  const [reason, setReason] = useState('');

  const [amount, setAmount] = useState('');
  const [providerId, setProviderId] = useState('');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');

  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = ['All', ...new Set(codes.map((c) => c.group).filter(Boolean))];

  const visibleCodes = codes.filter(
    (c) =>
      (!searchCode || c.code.toLowerCase().includes(searchCode.toLowerCase())) &&
      (searchGroup === 'All' || c.group === searchGroup) &&
      (!searchDescription || c.description.toLowerCase().includes(searchDescription.toLowerCase())),
  );

  const totalAllocated = Object.values(allocAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const reset = () => {
    setAmount('');
    setRef('');
    setNotes('');
    setReason('');
    setProviderId('');
    setAllocAmounts({});
    setSelected(new Set());
  };

  const apply = async () => {
    if (!reason) {
      setError('Select an adjustment code from the list.');
      return;
    }
    // Per-procedure adjustments (one record per row with a New Amt) take precedence;
    // otherwise a single account-level adjustment using the Amount field.
    const perProc = outstanding
      .map((p) => ({ id: p.id, amt: parseFloat(allocAmounts[p.id] || '0') }))
      .filter((a) => a.amt > 0);

    const base: Omit<PatientAdjustmentCreate, 'amount' | 'procedure_id'> = {
      patient_id: patientId,
      office_id: officeId,
      adjustment_date: transactionDateIso,
      adjustment_type: reason,
      ...(providerId ? { provider_id: providerId } : {}),
      ...(notes || ref ? { notes: [ref ? `Ref# ${ref}` : '', notes].filter(Boolean).join(' — ') } : {}),
    };

    if (perProc.length === 0) {
      const amt = parseFloat(amount);
      if (!amt || Number.isNaN(amt) || amt <= 0) {
        setError('Enter an Amount, or a New Amt on at least one procedure.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (perProc.length > 0) {
        for (const row of perProc) {
          await createPatientAdjustment({ ...base, amount: row.amt.toFixed(2), procedure_id: row.id });
        }
      } else {
        await createPatientAdjustment({ ...base, amount: parseFloat(amount).toFixed(2) });
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[460px_1fr]">
        {/* Adjustment code picker */}
        <div className="rounded border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_90px_90px_1fr] gap-1 border-b border-slate-200 bg-slate-50 p-2">
            <input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search code"
              className="rounded border border-[#2566a8] px-2 py-1.5 text-xs focus:outline-none"
            />
            <select
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value)}
              className="tx-select rounded border border-slate-300 px-1 py-1.5 text-xs"
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="tx-select rounded border border-slate-300 px-1 py-1.5 text-xs"
            >
              <option value="All">All</option>
            </select>
            <input
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
              placeholder="Search Description"
              className="rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {visibleCodes.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">No adjustment codes defined.</div>
            ) : (
              visibleCodes.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setReason(c.code)}
                  className={`grid w-full grid-cols-[80px_90px_1fr] items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs transition hover:bg-sky-50 ${
                    reason === c.code ? 'bg-sky-100' : ''
                  }`}
                >
                  <span className="font-semibold text-[#1d4ed8]">{c.code}</span>
                  <span className="text-slate-600">{c.group}</span>
                  <span className="text-slate-800">{c.description}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Adjustment entry fields */}
        <div className="space-y-3 rounded border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-3 gap-3">
            <Labeled label="Amount" required>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-right text-xs focus:border-[#2566a8] focus:outline-none"
              />
            </Labeled>
            <Labeled label="Provider">
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="tx-select w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
              >
                <option value="">All Providers</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {providerOptionLabel(p)}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Ref #">
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Reference"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none"
              />
            </Labeled>
          </div>
          <Labeled label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none"
            />
          </Labeled>
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

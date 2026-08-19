import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Loader2, Printer, BookOpen, FilePlus2 } from 'lucide-react';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import { providerOptionLabel } from '@/services/providerDirectory';
import { useDefinitions } from '@/hooks/useDefinitions';
import type { PatientProcedureRead, PatientBalance } from '@/api/generated/model';
import { createInsuranceClaim, getPatientBalance } from '@/api/generated/endpoints/billing/billing';
import { updatePatientProcedure } from '@/api/generated/endpoints/clinical/clinical';
import {
  loadRawTransactions,
  buildEntryRows,
  loadOutstandingProcedures,
  codeDescription,
  type RawTransactions,
} from './transactionsService';
import {
  genId,
  money,
  num,
  fmtDate,
  todayDisplay,
  toIsoDate,
  HEADER_GRADIENT,
  ACCENT_BLUE,
  ACTION_TEAL,
} from './transactionsModel';
import AddProceduresTab from './AddProceduresTab';
import PaymentsTab from './PaymentsTab';
import AdjustmentsTab from './AdjustmentsTab';

interface OutletCtx {
  patient: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    dob?: string;
    officeId?: string;
  };
}

type Tab = 'add' | 'payments' | 'adjustments';

const GRID_COLS = [
  'Pm', 'Date', 'Patient', 'Office', 'A', 'Code', 'Th', 'Surf', 'At', 'N',
  'Description', 'Bill', 'Dur', 'Provider', 'Est Pat', 'Est Ins', 'Amount',
] as const;

export default function TransactionsEntryPage() {
  const { patient } = useOutletContext<OutletCtx>();
  const { patientId: patientIdParam } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const patientId = Number(patient?.id ?? patientIdParam);
  const validId = Number.isFinite(patientId) && patientId > 0;
  const officeId = patient?.officeId ? Number(patient.officeId) : null;
  const patientName = patient?.name ?? 'Unknown Patient';

  const [transactionDate, setTransactionDate] = useState(todayDisplay());
  const [appliedIso, setAppliedIso] = useState(toIsoDate(todayDisplay()));
  const [tab, setTab] = useState<Tab>('add');

  const [providerId, setProviderId] = useState('');
  const [hygienistId, setHygienistId] = useState('');

  // One shared provider directory for the whole app — scoped to this patient's
  // office, but never empty (many offices have no provider rows on the legacy
  // `office_id` scalar) and labels resolve against every provider so historical
  // rows show a name instead of a raw "PRV-138".
  const { providers, providerLabel } = useProviderDirectory(patient?.officeId);

  const [raw, setRaw] = useState<RawTransactions>({ procs: [], pays: [], adjs: [] });
  const [outstanding, setOutstanding] = useState<PatientProcedureRead[]>([]);
  const [balance, setBalance] = useState<PatientBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [creatingClaim, setCreatingClaim] = useState(false);

  // Definition lookups for the grid description columns.
  const { definitions: paymentDefs } = useDefinitions('payment_method');
  const { definitions: adjustmentDefs } = useDefinitions('adjustment');

  const paymentLabel = useMemo(() => {
    const m = new Map(paymentDefs.map((d) => [d.key1, d.description]));
    return (code: string | null | undefined) => (code ? m.get(code) || code : '');
  }, [paymentDefs]);
  const adjustmentLabel = useMemo(() => {
    const m = new Map(adjustmentDefs.map((d) => [d.key1, d.description]));
    return (code: string | null | undefined) => (code ? m.get(code) || code : '');
  }, [adjustmentDefs]);

  // Network load keyed ONLY on stable primitives (patient, date, manual reloads).
  // Label resolvers are deliberately NOT deps — they change identity every render
  // (useDefinitions returns a fresh array), and mapping happens in useMemo below.
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    setLoading(true);
    Promise.all([loadRawTransactions(patientId, appliedIso), loadOutstandingProcedures(patientId)])
      .then(([rawTx, out]) => {
        if (!alive) return;
        setRaw(rawTx);
        setOutstanding(out);
      })
      .catch(() => {
        if (!alive) return;
        setRaw({ procs: [], pays: [], adjs: [] });
        setOutstanding([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [validId, patientId, appliedIso, reloadKey]);

  // Account balance for the Responsible dashboard block. Loaded independently of
  // the transaction grid and NEVER blocks it — the balance endpoint can be slow on
  // a cold cache. Refetches after any post (reloadKey) so the balance stays live.
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    setBalanceLoading(true);
    getPatientBalance(patientId)
      .then((b) => alive && setBalance(b))
      .catch(() => alive && setBalance(null))
      .finally(() => alive && setBalanceLoading(false));
    return () => {
      alive = false;
    };
  }, [validId, patientId, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const rows = useMemo(
    () => buildEntryRows(raw, patientName, providerLabel, paymentLabel, adjustmentLabel),
    [raw, patientName, providerLabel, paymentLabel, adjustmentLabel],
  );
  const todayCharges = useMemo(() => raw.procs.reduce((s, p) => s + num(p.fee), 0), [raw.procs]);
  // Today's estimate split for the dashboard: insurance portion is the sum of the
  // day's procedure insurance estimates; patient portion is the remainder (charges
  // − insurance − deductible, with deductible 0 until CHG-7 is implemented).
  const todayEstIns = useMemo(() => raw.procs.reduce((s, p) => s + num(p.insurance_estimate), 0), [raw.procs]);

  const handleGo = () => setAppliedIso(toIsoDate(transactionDate));

  const handleCreateClaim = async () => {
    const billable = outstanding.filter((p) => !p.claim_id);
    if (billable.length === 0) {
      alert('No unbilled procedures available to create a claim.');
      return;
    }
    setCreatingClaim(true);
    try {
      const dates = billable.map((p) => new Date(p.date_of_service)).filter((d) => !Number.isNaN(d.getTime()));
      const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
      const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();
      const claimId = genId();
      await createInsuranceClaim({
        id: claimId,
        patient_id: patientId,
        office_id: billable[0]?.office_id ?? officeId,
        claim_number: String(Date.now()),
        claim_type: 'dental',
        billing_order: 'primary',
        date_of_service_from: minDate.toISOString().slice(0, 10),
        date_of_service_to: maxDate.toISOString().slice(0, 10),
        total_billed: billable.reduce((s, p) => s + num(p.fee), 0).toFixed(2),
        est_insurance: billable.reduce((s, p) => s + num(p.insurance_estimate), 0).toFixed(2),
      });
      await Promise.allSettled(billable.map((p) => updatePatientProcedure(p.id, { claim_id: claimId })));
      navigate(`/patient/${patientId}/claim/${claimId}`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to create claim.');
    } finally {
      setCreatingClaim(false);
    }
  };

  if (!validId) {
    return <div className="p-6 text-center text-red-600">Patient context is required.</div>;
  }

  return (
    <div className="bg-slate-50 p-4 text-[#1E293B]">
      {/* Header bar — mirrors the Restorative Chart header (patient identity is
          already shown in the patient banner above, so it is not repeated here). */}
      <div className="flex items-center px-5 py-2 text-sm font-semibold text-white" style={{ background: HEADER_GRADIENT }}>
        Transactions Entry
        <span className="ml-3 rounded bg-white/15 px-2 py-0.5 text-xs font-normal">{patientName}</span>
        <button onClick={() => window.print()} className="ml-auto rounded p-1 hover:bg-white/10" title="Print">
          <Printer className="h-4 w-4" />
        </button>
      </div>

      {/* Patient Dashboard — the legacy check-out review block. Left: the
          Responsible party's running account (Balance / Est Ins / Est Pat) from
          the balance endpoint. Right: today's charge split so the front desk can
          confirm at a glance what the patient owes before checking out. */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-2 border-x border-b border-slate-200 bg-white px-5 py-3 text-xs md:grid-cols-[1.3fr_1fr_1.2fr]">
        {/* Responsible + running balance */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-semibold text-slate-500">Responsible</dt>
          <dd className="font-semibold text-slate-800">{patientName}</dd>
          <dt className="font-semibold text-slate-500">RP BD</dt>
          <dd className="text-slate-700">{patient?.dob ? fmtDate(patient.dob) : '—'}</dd>
          <dt className="font-semibold text-slate-500">Balance</dt>
          <dd className={`font-bold tabular-nums ${num(balance?.balance) > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {balanceLoading ? '…' : money(balance?.balance)}
          </dd>
          <dt className="font-semibold text-slate-500">Est Ins</dt>
          <dd className="tabular-nums text-blue-700">{balanceLoading ? '…' : money(balance?.estimated_insurance)}</dd>
          <dt className="font-semibold text-slate-500">Est Pat</dt>
          <dd className="tabular-nums text-slate-800">{balanceLoading ? '…' : money(balance?.estimated_patient)}</dd>
        </dl>

        {/* Insurance (carrier names not joined on this screen yet — see CHG-7) */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 content-start">
          <dt className="font-semibold text-slate-500">Prim. Ins</dt>
          <dd className="text-slate-400" title="Carrier name not joined on this screen yet (CHG-8)">—</dd>
          <dt className="font-semibold text-slate-500">Sec. Ins</dt>
          <dd className="text-slate-400" title="Carrier name not joined on this screen yet (CHG-8)">—</dd>
        </dl>

        {/* Today's charge split */}
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 content-start">
          <dt className="font-semibold text-slate-500">Today&apos;s Total Charges</dt>
          <dd className="text-right font-bold tabular-nums text-slate-900">{money(todayCharges)}</dd>
          <dt className="font-semibold text-slate-500" title="Deductible applied is not computed yet (CHG-7 / PLAN-3)">
            Today&apos;s Est Ded †
          </dt>
          <dd className="text-right tabular-nums text-slate-500">{money(0)}</dd>
          <dt className="font-semibold text-slate-500">Today&apos;s Est Ins Portion</dt>
          <dd className="text-right tabular-nums text-blue-700">{money(todayEstIns)}</dd>
          <dt className="font-semibold text-slate-500">Today&apos;s Est Pat Portion</dt>
          <dd className="text-right font-semibold tabular-nums text-slate-900">
            {money(Math.max(0, todayCharges - todayEstIns))}
          </dd>
        </dl>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-x border-b border-slate-200 bg-slate-100 px-4 py-2">
        <label className="text-xs font-semibold text-slate-600">Transaction Date</label>
        <input
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          onBlur={handleGo}
          className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-[#2566a8] focus:outline-none"
        />
        <button
          onClick={handleGo}
          className="rounded px-3 py-1 text-xs font-bold text-white shadow-sm"
          style={{ background: ACCENT_BLUE }}
        >
          GO
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="tx-select rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
            title="Treating provider for procedures added on this screen"
          >
            <option value="">-- Select Provider --</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {providerOptionLabel(p)}
              </option>
            ))}
          </select>
          <select
            value={hygienistId}
            onChange={(e) => setHygienistId(e.target.value)}
            className="tx-select rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
          >
            <option value="">-- Preferred Hygienist --</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {providerOptionLabel(p)}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigate(`/patient/${patientId}/ledger`)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            LEDGER
          </button>
          <button
            onClick={handleCreateClaim}
            disabled={creatingClaim}
            className="flex items-center gap-1 rounded px-3 py-1 text-xs font-bold text-white shadow-sm disabled:opacity-50"
            style={{ background: ACTION_TEAL }}
          >
            {creatingClaim ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
            CREATE CLAIM
          </button>
        </div>
      </div>

      {/* Transactions grid */}
      <div className="overflow-x-auto border-x border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="text-white" style={{ background: HEADER_GRADIENT }}>
            <tr>
              {GRID_COLS.map((c) => (
                <th key={c} className="whitespace-nowrap px-2 py-2 text-left font-bold uppercase tracking-wide">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={GRID_COLS.length} className="px-2 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={GRID_COLS.length} className="px-2 py-10 text-center text-slate-400">
                  No records to display.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-center">{r.pm ? '✓' : ''}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-700">{r.date}</td>
                  <td className="px-2 py-1.5 text-slate-700">{r.patient}</td>
                  <td className="px-2 py-1.5 text-slate-700">{r.office}</td>
                  <td className="px-2 py-1.5 text-slate-700">{r.apply_to}</td>
                  <td className="px-2 py-1.5">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800">{r.code}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-slate-700">{r.tooth}</td>
                  <td className="px-2 py-1.5 text-center text-slate-700">{r.surface}</td>
                  <td className="px-2 py-1.5" />
                  <td className="px-2 py-1.5" />
                  <td className="px-2 py-1.5 text-slate-800">{r.description}</td>
                  <td className="px-2 py-1.5 text-slate-700">{r.bill}</td>
                  <td className="px-2 py-1.5" />
                  <td className="px-2 py-1.5 text-slate-700">{r.provider}</td>
                  <td className="px-2 py-1.5 text-right text-slate-900">{r.est_pat ? money(r.est_pat) : ''}</td>
                  <td className="px-2 py-1.5 text-right text-blue-700">{r.est_ins ? money(r.est_ins) : ''}</td>
                  <td className={`px-2 py-1.5 text-right font-semibold ${r.amount < 0 ? 'text-green-700' : 'text-slate-900'}`}>
                    {money(r.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tabs */}
      <div className="flex border-x border-b border-slate-200 bg-[#F7F9FC]">
        {([
          ['add', 'Add Procedures'],
          ['payments', 'Payments'],
          ['adjustments', 'Adjustments'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
              tab === key
                ? 'border-b-2 border-[#2566a8] bg-white text-[#1d4ed8]'
                : 'text-slate-500 hover:text-[#16406e]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-b border-x border-b border-slate-200 bg-white p-4">
        {tab === 'add' && (
          <AddProceduresTab
            patientId={patientId}
            officeId={officeId}
            providerId={providerId}
            transactionDateIso={appliedIso}
            onPosted={refresh}
          />
        )}
        {tab === 'payments' && (
          <PaymentsTab
            patientId={patientId}
            officeId={officeId}
            transactionDateIso={appliedIso}
            patientName={patientName}
            outstanding={outstanding}
            providers={providers}
            defaultProviderId={providerId}
            providerLabel={providerLabel}
            codeDescription={codeDescription}
            onApplied={refresh}
          />
        )}
        {tab === 'adjustments' && (
          <AdjustmentsTab
            patientId={patientId}
            officeId={officeId}
            transactionDateIso={appliedIso}
            patientName={patientName}
            outstanding={outstanding}
            providers={providers}
            providerLabel={providerLabel}
            codeDescription={codeDescription}
            onApplied={refresh}
          />
        )}
      </div>
    </div>
  );
}

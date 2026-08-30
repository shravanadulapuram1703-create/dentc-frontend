import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Printer, BookOpen, FilePlus2 } from 'lucide-react';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import { useDefinitions } from '@/hooks/useDefinitions';
import type { PatientProcedureRead, PatientBalance } from '@/api/generated/model';
import { createInsuranceClaim, getPatientBalance } from '@/api/generated/endpoints/billing/billing';
import { updatePatientProcedure } from '@/api/generated/endpoints/clinical/clinical';
import { useGetPatient } from '@/api/generated/endpoints/patients/patients';
import {
  loadRawTransactions,
  buildEntryRows,
  loadOutstandingProcedures,
  loadOfficeDirectory,
  loadInsuranceSummary,
  codeDescription,
  type RawTransactions,
  type OfficeLabel,
  type InsuranceSummary,
  type InsuranceSummaryEntry,
} from './transactionsService';
import {
  genId,
  money,
  num,
  fmtDate,
  todayDisplay,
  toIsoDate,
  officeLabelResolver,
  HEADER_GRADIENT,
  ACCENT_BLUE,
  ACTION_TEAL,
} from './transactionsModel';
import ProviderSelect from './ProviderSelect';
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

  // The open tab lives in the URL so other screens can deep-link into it — the
  // dashboard's "Collect Payment" quick action opens ?tab=payments directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab =
    tabParam === 'payments' || tabParam === 'adjustments' || tabParam === 'add'
      ? tabParam
      : 'add';
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'add') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const [providerId, setProviderId] = useState('');
  const [hygienistId, setHygienistId] = useState('');

  // One shared provider directory for the whole app. `providers` is the office
  // roster (`/offices/{id}/providers/effective`), `allProviders` is the tenant
  // list — ProviderSelect renders the roster first and keeps everyone else
  // reachable, because the roster is genuinely sparse (PROV-1). Labels always
  // resolve against the full directory, so a historical row posted by an
  // out-of-office or deactivated provider still shows a name, not "PRV-138".
  const { providers, allProviders, providerLabel } = useProviderDirectory(patient?.officeId);

  // The patient's own record carries the defaults the legacy screen opens with.
  // Same query key as the patient shell above, so this is a cache hit, not a
  // second request.
  const patientQuery = useGetPatient(patientId, { query: { enabled: validId } });
  const preferred_provider_id = patientQuery.data?.preferred_provider_id ?? '';
  const preferred_hygienist_id = patientQuery.data?.preferred_hygienist_id ?? '';

  // Seed the toolbar from `patients.preferred_provider_id` /
  // `preferred_hygienist_id` once they arrive, without clobbering a manual pick.
  const [providerTouched, setProviderTouched] = useState(false);
  const [hygienistTouched, setHygienistTouched] = useState(false);
  useEffect(() => {
    if (!providerTouched && preferred_provider_id) setProviderId(preferred_provider_id);
  }, [preferred_provider_id, providerTouched]);
  useEffect(() => {
    if (!hygienistTouched && preferred_hygienist_id) setHygienistId(preferred_hygienist_id);
  }, [preferred_hygienist_id, hygienistTouched]);

  const [raw, setRaw] = useState<RawTransactions>({ procs: [], pays: [], adjs: [] });
  const [outstanding, setOutstanding] = useState<PatientProcedureRead[]>([]);
  const [balance, setBalance] = useState<PatientBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [offices, setOffices] = useState<Map<number, OfficeLabel>>(new Map());
  const [insurance, setInsurance] = useState<InsuranceSummary>({ primary: null, secondary: null });
  const [insuranceLoading, setInsuranceLoading] = useState(true);
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

  // Office names for the grid's OFFICE column. Tenant-level reference data —
  // loaded once, independent of the patient/date.
  useEffect(() => {
    let alive = true;
    loadOfficeDirectory()
      .then((m) => alive && setOffices(m))
      .catch(() => alive && setOffices(new Map()));
    return () => {
      alive = false;
    };
  }, []);

  // Primary/secondary carriers for the check-out block (CHG-8). Three-hop join,
  // so it loads on its own and never blocks the grid.
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    setInsuranceLoading(true);
    loadInsuranceSummary(patientId)
      .then((s) => alive && setInsurance(s))
      .catch(() => alive && setInsurance({ primary: null, secondary: null }))
      .finally(() => alive && setInsuranceLoading(false));
    return () => {
      alive = false;
    };
  }, [validId, patientId]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const officeLabel = useMemo(() => officeLabelResolver(offices), [offices]);
  const rows = useMemo(
    () => buildEntryRows(raw, patientName, providerLabel, paymentLabel, adjustmentLabel, officeLabel),
    [raw, patientName, providerLabel, paymentLabel, adjustmentLabel, officeLabel],
  );
  const todayCharges = useMemo(() => raw.procs.reduce((s, p) => s + num(p.fee), 0), [raw.procs]);
  // Today's estimate split for the dashboard: insurance portion is the sum of the
  // day's procedure insurance estimates; patient portion is the remainder (charges
  // − insurance − deductible, with deductible 0 until CHG-7 is implemented).
  const todayEstIns = useMemo(() => raw.procs.reduce((s, p) => s + num(p.insurance_estimate), 0), [raw.procs]);

  const handleGo = () => setAppliedIso(toIsoDate(transactionDate));

  const handleCreateClaim = async () => {
    // A charge on Hold Claim is deliberately held back from billing, so it must
    // never be swept onto a claim here either (the ledger enforces the same rule
    // by disabling its Prn checkbox).
    const unbilled = outstanding.filter((p) => !p.claim_id);
    const billable = unbilled.filter((p) => !p.hold_claim);
    const heldBack = unbilled.length - billable.length;
    if (billable.length === 0) {
      alert(
        heldBack > 0
          ? `No unbilled procedures available to create a claim (${heldBack} on Hold Claim).`
          : 'No unbilled procedures available to create a claim.',
      );
      return;
    }
    if (
      heldBack > 0 &&
      !confirm(
        `${heldBack} procedure(s) are on Hold Claim and will be left off this claim.

Create a claim for the remaining ${billable.length}?`,
      )
    ) {
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

        {/* Insurance — carriers joined from patient_insurance → insurance_plans →
            insurance_carriers, with the remaining annual max the front desk
            quotes at check-out. */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 content-start">
          <dt className="font-semibold text-slate-500">Prim. Ins</dt>
          <dd>
            <CarrierCell entry={insurance.primary} loading={insuranceLoading} />
          </dd>
          <dt className="font-semibold text-slate-500">Sec. Ins</dt>
          <dd>
            <CarrierCell entry={insurance.secondary} loading={insuranceLoading} />
          </dd>
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
          <ProviderSelect
            kind="treating"
            value={providerId}
            onChange={(id) => {
              setProviderTouched(true);
              setProviderId(id);
            }}
            officeProviders={providers}
            allProviders={allProviders}
            placeholder="-- Select Provider --"
            className="tx-select rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
            title="Treating provider for procedures added on this screen (defaults to the patient's preferred provider)"
          />
          <ProviderSelect
            kind="hygienist"
            value={hygienistId}
            onChange={(id) => {
              setHygienistTouched(true);
              setHygienistId(id);
            }}
            officeProviders={providers}
            allProviders={allProviders}
            placeholder="-- Preferred Hygienist --"
            className="tx-select rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
            title="Hygienist credited on procedures added here (posted as hygienist_id; defaults to the patient's preferred hygienist)"
          />
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
            hygienistId={hygienistId}
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
            allProviders={allProviders}
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
            allProviders={allProviders}
            providerLabel={providerLabel}
            codeDescription={codeDescription}
            onApplied={refresh}
          />
        )}
      </div>
    </div>
  );
}

/**
 * One carrier line in the check-out block. Shows the carrier, the plan type and
 * the remaining annual maximum — the three things asked for at the desk.
 */
function CarrierCell({
  entry,
  loading,
}: {
  entry: InsuranceSummaryEntry | null;
  loading: boolean;
}) {
  if (loading) return <span className="text-slate-400">…</span>;
  if (!entry) return <span className="text-slate-400">None on file</span>;
  const max = num(entry.max_remaining);
  return (
    <span className="text-slate-800">
      <span className="font-semibold">{entry.carrier_name}</span>
      {entry.plan_type && <span className="text-slate-500"> · {entry.plan_type}</span>}
      {entry.max_remaining != null && (
        <span className="text-slate-500" title="Remaining annual maximum">
          {' '}
          · Max Rem {money(max)}
        </span>
      )}
    </span>
  );
}

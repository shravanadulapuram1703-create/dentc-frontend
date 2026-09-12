import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { ProcedureCodeRead, ExplosionCodeRead } from '@/api/generated/model';
import { loadProcedureCodes } from '@/components/setup/insurance/procedureCodeService';
import {
  EMPTY_FEE_CONTEXT,
  loadFeeScheduleContext,
  type FeeScheduleContext,
} from '@/services/feeScheduleResolver';
import { EMPTY_COVERAGE_CONTEXT, loadCoverageContext, type CoverageContext } from '@/services/coverageResolver';
import { priceProcedure, type PricedProcedure } from '@/services/procedurePricing';
import { postCompletedProcedure } from '@/features/procedures/procedureEntryService';
import { needsProcedureDetails } from '@/features/procedures/procedureRequirements';
import ProcedureDetailsDialog, {
  type ProcedureDetailsHeader,
  type ProcedureDetailsRowInput,
  type ProcedureDetailsRowResult,
} from '@/features/procedures/ProcedureDetailsDialog';
import { PROC_CATEGORIES, money, HEADER_GRADIENT, ACCENT_BLUE, type ProcCategory } from './transactionsModel';
import {
  codesInCategory,
  filterCodes,
  loadExplosionCodes,
  expandExplosion,
} from './transactionsService';

interface Props {
  patientId: number;
  officeId: number | null;
  providerId: string;
  /** Toolbar hygienist — posted as `hygienist_id` alongside the treating provider. */
  hygienistId: string;
  transactionDateIso: string;
  /** Refresh the top grid after a charge posts. */
  onPosted: () => void;
}

/** One-line hint the UI shows after a charge completes a planned procedure. */
function completedPlanHint(code: string, marked: boolean): string {
  return marked
    ? `${code} also completed the matching procedure on the treatment plan.`
    : `${code} posted, but the matching treatment-plan procedure could not be marked completed.`;
}

export default function AddProceduresTab({
  patientId,
  officeId,
  providerId,
  hygienistId,
  transactionDateIso,
  onPosted,
}: Props) {
  const [activeCat, setActiveCat] = useState<ProcCategory>(PROC_CATEGORIES[0]!);
  const [allCodes, setAllCodes] = useState<ProcedureCodeRead[]>([]);
  const [loading, setLoading] = useState(false);

  const [byCode, setByCode] = useState('');
  const [byUserCode, setByUserCode] = useState('');
  const [byDescription, setByDescription] = useState('');

  const [selected, setSelected] = useState<ProcedureCodeRead | null>(null);
  // Rows waiting in the legacy "Add Procedure Details" pop-up (tooth / quadrant /
  // surfaces / material the code requires). One row for a single code, several
  // for an explosion code.
  const [details, setDetails] = useState<ProcedureDetailsRowInput[] | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fee schedules configured in Setup → Insurance → Fee Schedules. Loaded once
  // per patient/office/provider, then every code is priced from it.
  const [feeCtx, setFeeCtx] = useState<FeeScheduleContext>(EMPTY_FEE_CONTEXT);
  // Primary plan coverage rules, so Est Ins matches what the chart / treatment
  // plan would quote for the same code (one pricing pipeline everywhere).
  const [coverageCtx, setCoverageCtx] = useState<CoverageContext>(EMPTY_COVERAGE_CONTEXT);
  const [quote, setQuote] = useState<PricedProcedure | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Explosion (multi-procedure) codes for this office. The resource is live but
  // unseeded on tenant 1, so an empty list is expected — the control disables
  // itself from the data instead of being hard-coded off.
  const [explosionCodes, setExplosionCodes] = useState<ExplosionCodeRead[]>([]);
  const [explosionCode, setExplosionCode] = useState('');
  const [exploding, setExploding] = useState(false);

  useEffect(() => {
    let alive = true;
    loadExplosionCodes(officeId)
      .then((rows) => alive && setExplosionCodes(rows))
      .catch(() => alive && setExplosionCodes([]));
    return () => {
      alive = false;
    };
  }, [officeId]);

  useEffect(() => {
    let alive = true;
    loadFeeScheduleContext({ patient_id: patientId, office_id: officeId, provider_id: providerId || null })
      .then((ctx) => alive && setFeeCtx(ctx))
      .catch(() => alive && setFeeCtx(EMPTY_FEE_CONTEXT));
    return () => {
      alive = false;
    };
  }, [patientId, officeId, providerId]);

  useEffect(() => {
    let alive = true;
    loadCoverageContext({ patient_id: patientId })
      .then((ctx) => alive && setCoverageCtx(ctx))
      .catch(() => alive && setCoverageCtx(EMPTY_COVERAGE_CONTEXT));
    return () => {
      alive = false;
    };
  }, [patientId]);

  // Price the highlighted code so the fee split is visible before it is posted.
  useEffect(() => {
    if (!selected) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoting(true);
    priceProcedure(feeCtx, coverageCtx, selected.code, {
      default_fee: selected.default_fee,
      on_date: transactionDateIso,
    })
      .then((q) => alive && setQuote(q))
      .catch(() => alive && setQuote(null))
      .finally(() => alive && setQuoting(false));
    return () => {
      alive = false;
    };
  }, [selected, feeCtx, coverageCtx, transactionDateIso]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setSelected(null);
    codesInCategory(activeCat)
      .then((codes) => {
        if (alive) setAllCodes(codes);
      })
      .catch(() => {
        if (alive) setAllCodes([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeCat]);

  const visible = useMemo(
    () => filterCodes(allCodes, byCode, byUserCode, byDescription),
    [allCodes, byCode, byUserCode, byDescription],
  );

  interface PostRow {
    code: ProcedureCodeRead;
    tooth?: string | null;
    surface?: string | null;
    quadrant?: string | null;
    material_id?: number | null;
  }

  /**
   * Post one or more charges through the shared entry path — the same charge the
   * chart's Completed tab and the treatment plan's Post to Ledger create. If a
   * code/tooth is still planned on the treatment plan, that item is completed too.
   * `head` lets the Add Procedure Details pop-up override provider / date.
   */
  const postRows = async (rows: PostRow[], head?: Partial<ProcedureDetailsHeader>) => {
    const provider_id = head?.provider_id ?? providerId;
    const date = head?.date ?? transactionDateIso;
    if (!provider_id) {
      setError('Select a treating provider (top of screen) before adding a procedure.');
      return;
    }
    if (officeId == null) {
      setError('Missing office context for this patient.');
      return;
    }
    setPosting(true);
    setError(null);
    setNotice(null);
    try {
      let completedPlanned = 0;
      let lastHint: string | null = null;
      for (const r of rows) {
        // Price from the applicable fee schedule + plan coverage. Resolve at post
        // time rather than trusting the preview — the selection may have changed.
        const priced = await priceProcedure(feeCtx, coverageCtx, r.code.code, {
          default_fee: r.code.default_fee,
          on_date: date,
        });
        const result = await postCompletedProcedure({
          patient_id: patientId,
          office_id: officeId,
          procedure_code: r.code.code,
          date_of_service: date,
          provider_id,
          hygienist_id: hygienistId || null,
          tooth: r.tooth || null,
          surface: r.surface || null,
          quadrant: r.quadrant || null,
          material_id: r.material_id ?? null,
          fee: priced.fee,
          patient_estimate: priced.patient_estimate,
          insurance_estimate: priced.insurance_estimate,
          ucr_fee: priced.ucr_fee,
        });
        if (result.plan_item) {
          completedPlanned += 1;
          lastHint = completedPlanHint(r.code.code, result.plan_item_marked);
        }
      }
      setNotice(
        completedPlanned === 0 ? null
          : rows.length === 1 ? lastHint
          : `${completedPlanned} planned procedure(s) on the treatment plan marked completed.`,
      );
      setSelected(null);
      setDetails(null);
      setExplosionCode('');
      onPosted();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } }; message?: string });
      setError(detail?.response?.data?.detail || detail?.message || 'Failed to add procedure. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  /** Pop-up SAVE — every required detail has been validated by the dialog. */
  const onDetailsSave = (rows: ProcedureDetailsRowResult[], head: ProcedureDetailsHeader) =>
    postRows(rows.map((r) => ({ code: r.code, tooth: r.tooth, surface: r.surface, quadrant: r.quadrant, material_id: r.material_id })), head);

  /**
   * Expand the selected explosion code and post every procedure it contains.
   * Fees still come from the fee-schedule resolver (the expansion's own
   * `default_fee` is the code-table fee, which is 0.00 on migrated data).
   * Tooth/surface defaults carried by the bundle pre-fill the Add Procedure
   * Details pop-up, which opens whenever any exploded code requires details.
   */
  const runExplosion = async () => {
    if (!explosionCode) return;
    if (officeId == null) {
      setError('Missing office context for this patient.');
      return;
    }
    setExploding(true);
    setError(null);
    try {
      const items = await expandExplosion(explosionCode, officeId);
      if (items.length === 0) {
        setError(`Explosion code ${explosionCode} expands to no procedures.`);
        return;
      }
      const codes = await loadProcedureCodes();
      const rows: ProcedureDetailsRowInput[] = [];
      for (const item of items) {
        const code = codes.get(item.procedure_code);
        if (!code) {
          setError(`Explosion code ${explosionCode} references unknown procedure ${item.procedure_code}.`);
          return;
        }
        rows.push({ code, tooth: item.tooth, surface: item.surface });
      }
      if (rows.some((r) => needsProcedureDetails(r.code))) setDetails(rows);
      else await postRows(rows);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || `Failed to post explosion code ${explosionCode}.`);
    } finally {
      setExploding(false);
    }
  };

  // Codes whose procedure_codes row requires a tooth / surfaces / quadrant /
  // material open the legacy Add Procedure Details pop-up; the rest post at once.
  const addProcedure = (code: ProcedureCodeRead) => {
    if (needsProcedureDetails(code)) setDetails([{ code }]);
    else void postRows([{ code }]);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_300px_1fr]">
      {/* Category buttons */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Add Procedures By Categories
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PROC_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat)}
              style={activeCat.key === cat.key ? { background: ACCENT_BLUE, borderColor: ACCENT_BLUE } : undefined}
              className={`rounded border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide transition ${
                activeCat.key === cat.key
                  ? 'text-white'
                  : 'border-slate-300 bg-white text-[#16406e] hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add procedure by code / user code / description */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Add Procedure By</div>
        <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
          <Field label="Code" value={byCode} onChange={setByCode} />
          <Field label="User Code" value={byUserCode} onChange={setByUserCode} />
          <Field label="Description" value={byDescription} onChange={setByDescription} />
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Explosion Codes</label>
            <div className="flex gap-2">
              <select
                value={explosionCode}
                onChange={(e) => setExplosionCode(e.target.value)}
                disabled={explosionCodes.length === 0}
                className="tx-select min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                title={
                  explosionCodes.length === 0
                    ? 'No explosion codes are defined for this office yet.'
                    : 'Post every procedure in a multi-procedure bundle at once'
                }
              >
                <option value="">*Select Exp. Code*</option>
                {explosionCodes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code}
                    {c.description ? ` — ${c.description}` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={runExplosion}
                disabled={!explosionCode || exploding}
                style={explosionCode && !exploding ? { background: ACCENT_BLUE } : undefined}
                className="rounded bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-400 disabled:cursor-not-allowed enabled:text-white"
              >
                {exploding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'GO'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Procedure list */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Procedures for <span className="italic text-[#16406e]">{activeCat.label}</span>
          </span>
          <button
            onClick={() => selected && addProcedure(selected)}
            disabled={!selected || posting}
            style={{ background: ACCENT_BLUE }}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            ADD PROCEDURE
          </button>
        </div>

        {error && <div className="mb-2 rounded bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
        {notice && <div className="mb-2 rounded bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</div>}

        {selected && <FeeBreakdown code={selected.code} quote={quote} loading={quoting} />}

        <div className="max-h-72 overflow-y-auto rounded border border-slate-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 text-white" style={{ background: HEADER_GRADIENT }}>
              <tr>
                <th className="w-24 px-3 py-2 text-left font-bold uppercase tracking-wide">Code</th>
                <th className="w-24 px-3 py-2 text-left font-bold uppercase tracking-wide">User Code</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                    No procedures found.
                  </td>
                </tr>
              ) : (
                visible.map((c) => (
                  <tr
                    key={c.code}
                    onClick={() => setSelected(c)}
                    onDoubleClick={() => addProcedure(c)}
                    className={`cursor-pointer transition hover:bg-sky-50 ${
                      selected?.code === c.code ? 'bg-sky-100' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-1.5 font-semibold text-[#1d4ed8]">{c.code}</td>
                    <td className="px-3 py-1.5 text-slate-600">{c.legacy_code || '-'}</td>
                    <td className="px-3 py-1.5 text-slate-800">{c.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {details && (
        <ProcedureDetailsDialog
          mode="charge"
          office_id={officeId}
          patient_id={patientId}
          rows={details}
          header={{ provider_id: providerId, date: transactionDateIso }}
          busy={posting}
          onSave={onDetailsSave}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  );
}

/**
 * The fee split the selected code will post with, read from the fee schedule
 * that applies to this patient/office/provider. Shown before posting so the
 * front desk can see the patient vs insurance segregation, and which schedule
 * produced it.
 */
function FeeBreakdown({
  code,
  quote,
  loading,
}: {
  code: string;
  quote: PricedProcedure | null;
  loading: boolean;
}) {
  const priced = quote?.fee_source === 'fee_schedule';
  return (
    <div className="mb-2 rounded border border-slate-200 bg-[#F7F9FC] px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#16406e]">{code} fee</span>
        {loading || !quote ? (
          <span className="text-xs text-slate-400">Pricing…</span>
        ) : (
          <>
            <Amount label="Fee" value={quote.fee} className="text-slate-900" strong />
            <Amount label="Est Ins" value={quote.insurance_estimate} className="text-blue-700" />
            <Amount label="Est Pat" value={quote.patient_estimate} className="text-slate-900" />
            {quote.ucr_fee != null && <Amount label="UCR" value={quote.ucr_fee} className="text-slate-500" />}
          </>
        )}
      </div>
      {!loading && quote && (
        <div className={`mt-1 text-[11px] ${priced ? 'text-slate-500' : 'text-amber-700'}`}>
          {priced ? 'Fee schedule: ' : ''}
          {quote.fee_reason}
          {quote.coverage_pct > 0 && ` · Insurance ${quote.coverage_pct}% (${quote.coverage_reason})`}
        </div>
      )}
      {!loading && quote?.fee_conflict && (
        <div className="mt-1 text-[11px] font-semibold text-amber-700">
          Conflicting fee schedule assignment — {quote.fee_conflict}. Check Setup → Insurance → Fee
          Schedules → Assignments.
        </div>
      )}
    </div>
  );
}

function Amount({
  label,
  value,
  className,
  strong,
}: {
  label: string;
  value: number;
  className: string;
  strong?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <span className={`tabular-nums text-xs ${strong ? 'font-bold' : ''} ${className}`}>{money(value)}</span>
    </span>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-20 shrink-0 text-[11px] font-semibold text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none"
      />
    </div>
  );
}

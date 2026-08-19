import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { ProcedureCodeRead, PatientProcedureCreate } from '@/api/generated/model';
import { createPatientProcedure } from '@/api/generated/endpoints/clinical/clinical';
import ToothSurfaceEnforcement from '@/components/patient/ToothSurfaceEnforcement';
import {
  EMPTY_FEE_CONTEXT,
  loadFeeScheduleContext,
  resolveProcedureFee,
  type FeeScheduleContext,
  type ResolvedProcedureFee,
} from '@/services/feeScheduleResolver';
import { PROC_CATEGORIES, genId, money, num, HEADER_GRADIENT, ACCENT_BLUE, type ProcCategory } from './transactionsModel';
import { codesInCategory, filterCodes } from './transactionsService';

interface Props {
  patientId: number;
  officeId: number | null;
  providerId: string;
  transactionDateIso: string;
  /** Refresh the top grid after a charge posts. */
  onPosted: () => void;
}

// Fabricate the structured rules ToothSurfaceEnforcement expects from the flat
// requires_* booleans the backend exposes (same approach as AddProcedure — the
// structured anatomy/surface/material rules are a backend gap, CHG-2).
function toEnforcementProcedure(c: ProcedureCodeRead) {
  return {
    code: c.code,
    userCode: c.legacy_code ?? '',
    description: c.description,
    category: c.category,
    requirements: {
      tooth: c.requires_tooth,
      surface: c.requires_surface,
      quadrant: c.requires_quadrant,
      materials: c.requires_lab,
    },
    anatomyRules: {
      mode: c.requires_quadrant ? ('QUADRANT' as const) : c.requires_tooth ? ('TOOTH' as const) : ('NONE' as const),
      allowedToothSet: 'BOTH' as const,
      allowMultipleTeeth: false,
    },
    surfaceRules: {
      enabled: c.requires_surface,
      min: c.requires_surface ? 1 : undefined,
      max: c.requires_surface ? 5 : undefined,
      allowedSurfaces: ['M', 'O', 'D', 'B', 'L', 'I', 'F'],
    },
    materialsRules: {
      enabled: c.requires_lab,
      options: ['High Noble Metal', 'Base Metal', 'Noble Metal', 'Titanium', 'Resin', 'Porcelain/Ceramic', 'Zirconia', 'E.max'],
      min: c.requires_lab ? 1 : undefined,
      max: undefined,
    },
    defaultFee: num(c.default_fee),
  };
}

export default function AddProceduresTab({ patientId, officeId, providerId, transactionDateIso, onPosted }: Props) {
  const [activeCat, setActiveCat] = useState<ProcCategory>(PROC_CATEGORIES[0]!);
  const [allCodes, setAllCodes] = useState<ProcedureCodeRead[]>([]);
  const [loading, setLoading] = useState(false);

  const [byCode, setByCode] = useState('');
  const [byUserCode, setByUserCode] = useState('');
  const [byDescription, setByDescription] = useState('');

  const [selected, setSelected] = useState<ProcedureCodeRead | null>(null);
  const [enforcing, setEnforcing] = useState<ProcedureCodeRead | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fee schedules configured in Setup → Insurance → Fee Schedules. Loaded once
  // per patient/office/provider, then every code is priced from it.
  const [feeCtx, setFeeCtx] = useState<FeeScheduleContext>(EMPTY_FEE_CONTEXT);
  const [quote, setQuote] = useState<ResolvedProcedureFee | null>(null);
  const [quoting, setQuoting] = useState(false);

  useEffect(() => {
    let alive = true;
    loadFeeScheduleContext({ patient_id: patientId, office_id: officeId, provider_id: providerId || null })
      .then((ctx) => alive && setFeeCtx(ctx))
      .catch(() => alive && setFeeCtx(EMPTY_FEE_CONTEXT));
    return () => {
      alive = false;
    };
  }, [patientId, officeId, providerId]);

  // Price the highlighted code so the fee split is visible before it is posted.
  useEffect(() => {
    if (!selected) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoting(true);
    resolveProcedureFee(feeCtx, selected.code, {
      default_fee: selected.default_fee,
      on_date: transactionDateIso,
    })
      .then((q) => alive && setQuote(q))
      .catch(() => alive && setQuote(null))
      .finally(() => alive && setQuoting(false));
    return () => {
      alive = false;
    };
  }, [selected, feeCtx, transactionDateIso]);

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

  const post = async (
    code: ProcedureCodeRead,
    extras: { tooth?: string; surface?: string; quadrant?: string } = {},
  ) => {
    if (!providerId) {
      setError('Select a treating provider (top of screen) before adding a procedure.');
      return;
    }
    if (officeId == null) {
      setError('Missing office context for this patient.');
      return;
    }
    // Price from the applicable fee schedule. Resolve at post time rather than
    // trusting the preview — the selection may have changed since it was shown.
    const priced = await resolveProcedureFee(feeCtx, code.code, {
      default_fee: code.default_fee,
      on_date: transactionDateIso,
    });
    const body: PatientProcedureCreate = {
      id: genId(),
      patient_id: patientId,
      procedure_code: code.code,
      date_of_service: transactionDateIso,
      provider_id: providerId,
      office_id: officeId,
      tooth: extras.tooth || null,
      surface: extras.surface || null,
      quadrant: extras.quadrant || null,
      fee: priced.fee,
      // The fee schedule entry already stores the segregation (Setup's "Patient
      // Fee" / "Insurance Fee" columns), so the estimates come straight from it.
      patient_estimate: priced.patient_estimate,
      insurance_estimate: priced.insurance_estimate,
      ...(priced.ucr_fee != null ? { ucr_fee: priced.ucr_fee } : {}),
      apply_to: 'P',
    };
    setPosting(true);
    setError(null);
    try {
      await createPatientProcedure(body);
      setSelected(null);
      setEnforcing(null);
      onPosted();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Failed to add procedure. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const addProcedure = (code: ProcedureCodeRead) => {
    if (code.requires_tooth || code.requires_surface || code.requires_quadrant || code.requires_lab) {
      setEnforcing(code);
    } else {
      post(code);
    }
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
                disabled
                className="tx-select min-w-0 flex-1 rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-400"
                title="Explosion (multi-procedure) codes are not yet provided by the backend — see CHG-4."
              >
                <option>*Select Exp. Code*</option>
              </select>
              <button
                disabled
                className="rounded bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-400"
                title="Explosion codes — backend gap CHG-4"
              >
                GO
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

      {enforcing && (
        <ToothSurfaceEnforcement
          isOpen={!!enforcing}
          onClose={() => setEnforcing(null)}
          onSave={(data) =>
            post(enforcing, {
              tooth: data.tooth,
              surface: data.surfaces.join(''),
              quadrant: data.quadrant,
            })
          }
          procedure={toEnforcementProcedure(enforcing) as never}
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
  quote: ResolvedProcedureFee | null;
  loading: boolean;
}) {
  const priced = quote?.source === 'fee_schedule';
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
          {quote.reason}
        </div>
      )}
      {!loading && quote?.conflict && (
        <div className="mt-1 text-[11px] font-semibold text-amber-700">
          Conflicting fee schedule assignment — {quote.conflict}. Check Setup → Insurance → Fee
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

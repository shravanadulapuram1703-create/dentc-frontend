// Legacy "ADD PROCEDURE DETAILS" pop-up — the ONE place every screen collects the
// tooth #, quadrant, surfaces and material a procedure code requires before it is
// planned (Treatment Plan) or charged (Transactions Entry, Ledger, chart).
//
// Layout mirrors the on-premise product: a header row (Treating Provider ·
// Diagnosis/Transaction Date · Tx Plan ID · Phase ID), one grid row per code
// (CODE · Description · Tooth# · Quadrant · Surfaces · Materials), and — floating
// side by side beneath the grid — the SELECT TOOTH NUMBER panel (Universal
// numbering, primary letters, optional supernumerary rows, green quadrant /
// anterior separators) and the SURFACES / CROWN SURFACES panel (Mesial,
// Incisal/Occlusal, Distal, Facial/Buccal, Class V-Facial/Buccal, Lingual,
// Class V-Lingual). Every field the code's `requires_*` flags demand is enforced
// on SAVE (see procedureRequirements.ts) with the legacy red toast wording; the
// rest stay disabled.
//
// Multi-tooth: the Tooth# cell and the SELECT TOOTH NUMBER panel take MANY teeth
// for one code (click toggles, Shift+click selects a range, or type "7-23" /
// "2, 4-6"). SAVE expands the row into one result per tooth, so every caller
// still writes one separate record per tooth (see multiTooth.ts).
//
// Supporting records (PROC-7c): for a code that requires an X-ray / perio chart /
// photo / missing-tooth info / attachment, a line under the row shows what the
// server already has on file for this patient, tooth and date. It never blocks
// the save (the record is normally captured after the chair); the claim submit
// is where it is enforced.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useListChartMaterials } from '@/api/generated/endpoints/procedures/procedures';
import type { ProcedureCodeRead } from '@/api/generated/model';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import ProviderSelect from '@/features/transactions/ProviderSelect';
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
  QUADRANTS,
  SUPERNUMERARY_LOWER,
  SUPERNUMERARY_PRIMARY_LOWER,
  SUPERNUMERARY_PRIMARY_UPPER,
  SUPERNUMERARY_UPPER,
  decodeSurfaces,
  encodeSurfaces,
  procedureRequirements,
  toothAllowed,
  type ProcedureDetails,
  type ProcedureRequirements,
  type SurfaceChoice,
} from './procedureRequirements';
import { formatToothList, parseToothList, sortTeeth, toothRange } from './multiTooth';
import { fetchProcedureReadiness, readinessLabels, type ProcedureReadiness } from './supportingRecords';

export interface ProcedureDetailsHeader {
  provider_id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Plan mode only. */
  tid?: number;
  phase?: number;
}

export interface ProcedureDetailsRowInput {
  code: ProcedureCodeRead;
  /** Pre-filled values (chart selection, explosion-code defaults, …). */
  tooth?: string | null;
  /** Several teeth for the same code (chart multi-selection); wins over `tooth`. */
  teeth?: string[];
  quadrant?: string | null;
  surface?: string | null;
  material_id?: number | null;
}

/** One per TOOTH: a row with N teeth comes back as N results (same code, details). */
export interface ProcedureDetailsRowResult extends ProcedureDetails {
  code: ProcedureCodeRead;
}

interface Props {
  /** `charge` = Transactions / Ledger / chart Completed; `plan` = Treatment Plan / chart Tx Plans. */
  mode: 'charge' | 'plan';
  office_id: number | null;
  /** Real numeric patient id; enables the supporting-records readiness line per row. */
  patient_id?: number | null;
  rows: ProcedureDetailsRowInput[];
  header: ProcedureDetailsHeader;
  /** Lock the provider (e.g. the chart's toolbar provider drives it). */
  providerLocked?: boolean;
  onSave: (rows: ProcedureDetailsRowResult[], header: ProcedureDetailsHeader) => void | Promise<void>;
  onClose: () => void;
  busy?: boolean;
}

interface RowState {
  /** Running order; empty = no tooth. One record is saved per tooth. */
  teeth: string[];
  /** What the Tooth# box shows while the user is typing a list/range. */
  tooth_text: string | null;
  quadrant: string;
  surfaces: SurfaceChoice[];
  material_id: number | null;
}

// Legacy 2-column surface layout (row by row): a blank keeps Distal alone on its row.
const SURFACE_ROWS: [SurfaceChoice, SurfaceChoice | null][] = [
  ['M', 'IO'],
  ['D', null],
  ['FB', 'FB5'],
  ['L', 'L5'],
];
const SURFACE_LABEL: Record<SurfaceChoice, string> = {
  M: 'Mesial',
  IO: 'Incisal/Occlusal',
  D: 'Distal',
  FB: 'Facial/Buccal',
  FB5: 'Class V-Facial/Buccal',
  L: 'Lingual',
  L5: 'Class V-Lingual',
};

// Green separators (left edge of these teeth): anterior sextant boundaries + midline.
const SEPARATOR_BEFORE = new Set(['6', '9', '12', '27', '24', '21', 'C', 'F', 'I', 'R', 'O', 'L']);

const TITLE_BLUE = '#2f6db5';
const NAVY = '#1f3a5f';
const field = 'h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:border-[#2f6db5] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400';
const panelBtn = 'rounded bg-[#1f3a5f] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#162b47]';

/** Legacy toast wording for each requirement. */
function requirementMessages(code: ProcedureCodeRead, req: ProcedureRequirements, d: ProcedureDetails): string[] {
  const out: string[] = [];
  const tag = `procedure code: ${code.code}`;
  if (req.tooth && !d.tooth.trim()) out.push(`Please specify a tooth number for ${tag}.`);
  if (d.tooth.trim()) {
    const ok = toothAllowed(req, d.tooth);
    if (!ok.allowed) out.push(`${ok.reason} (${tag}).`);
  }
  if (req.surface) {
    const n = decodeSurfaces(d.surface).length;
    if (n < req.min_surfaces) out.push(`Please specify a minimum of ${req.min_surfaces} surface${req.min_surfaces === 1 ? '' : 's'} for ${tag}.`);
    else if (n > req.max_surfaces) out.push(`Please specify a maximum of ${req.max_surfaces} surface${req.max_surfaces === 1 ? '' : 's'} for ${tag}.`);
  }
  if (req.quadrant && !d.quadrant.trim()) out.push(`Please specify a quadrant for ${tag}.`);
  if (req.material && d.material_id == null) out.push(`Please specify a material for ${tag}.`);
  return out;
}

const RECORD_KEYS = ['attachment', 'perio_chart', 'photo', 'xray', 'missing_tooth_info'] as const;

/** Does this row carry at least one supporting-records flag? */
function needsRecords(req: ProcedureRequirements): boolean {
  return RECORD_KEYS.some((k) => req[k]);
}

export default function ProcedureDetailsDialog({ mode, office_id, patient_id, rows, header, providerLocked, onSave, onClose, busy }: Props) {
  // Plan mode: Tx Plan ID / Phase ID default to 1 in STATE (not just the input's
  // displayed value), so what the user sees is what gets saved.
  const [hdr, setHdr] = useState<ProcedureDetailsHeader>(() =>
    mode === 'plan'
      ? { ...header, tid: header.tid && header.tid > 0 ? header.tid : 1, phase: header.phase && header.phase > 0 ? header.phase : 1 }
      : header,
  );
  const reqs = useMemo(() => rows.map((r) => procedureRequirements(r.code)), [rows]);
  const [state, setState] = useState<RowState[]>(() =>
    rows.map((r, i) => ({
      teeth: sortTeeth((r.teeth?.length ? r.teeth : r.tooth ? [r.tooth] : []).map((t) => t.toUpperCase())),
      tooth_text: null,
      quadrant: r.quadrant ?? '',
      surfaces: decodeSurfaces(r.surface),
      material_id: r.material_id ?? reqs[i]!.default_material_id,
    })),
  );
  // Which row's panels are open. The legacy window shows both panels at once,
  // tooth on the left and surfaces on the right, under the grid.
  const prefilled = (r?: ProcedureDetailsRowInput) => !!(r?.tooth || r?.teeth?.length);
  const [toothRow, setToothRow] = useState<number | null>(() => (reqs[0]?.tooth && !prefilled(rows[0]) ? 0 : null));
  const [surfaceRow, setSurfaceRow] = useState<number | null>(() => (reqs[0]?.surface && prefilled(rows[0]) ? 0 : null));
  // Shift+click range anchor: the last tooth clicked in the open panel.
  const anchor = useRef<string | null>(null);
  const [showSuper, setShowSuper] = useState(false);

  const { providers, allProviders } = useProviderDirectory(office_id);
  const materialsQuery = useListChartMaterials({ size: 200 });
  const materials = useMemo(() => materialsQuery.data?.items ?? [], [materialsQuery.data]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const patch = (i: number, p: Partial<RowState>) =>
    setState((s) => s.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  // Supporting-records readiness per row (PROC-7c). Re-judged when the tooth or
  // the date changes, debounced so tooth-grid clicks do not fan out requests.
  const [readiness, setReadiness] = useState<Record<number, ProcedureReadiness | 'loading' | 'error'>>({});
  const readinessSeq = useRef(0);
  // Readiness is judged per tooth; with several teeth it is checked code-wide.
  const toothKey = state.map((r) => (r.teeth.length === 1 ? r.teeth[0] : '')).join('|');
  useEffect(() => {
    if (!patient_id) return;
    const wanted = rows.map((r, i) => ({ r, i })).filter(({ i }) => needsRecords(reqs[i]!));
    if (!wanted.length) return;
    const seq = ++readinessSeq.current;
    setReadiness((prev) => {
      const next = { ...prev };
      for (const { i } of wanted) next[i] = 'loading';
      return next;
    });
    const teeth = toothKey.split('|');
    const timer = window.setTimeout(() => {
      for (const { r, i } of wanted) {
        fetchProcedureReadiness({ patient_id, procedure_code: r.code.code, tooth: teeth[i] || null, date_of_service: hdr.date || null })
          .then((res) => { if (seq === readinessSeq.current) setReadiness((prev) => ({ ...prev, [i]: res })); })
          .catch(() => { if (seq === readinessSeq.current) setReadiness((prev) => ({ ...prev, [i]: 'error' })); });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [patient_id, rows, reqs, toothKey, hdr.date]);

  /** One line under a row: what is on file / still missing / judged later. */
  const readinessLine = (i: number) => {
    const req = reqs[i]!;
    if (!needsRecords(req)) return null;
    const r = readiness[i];
    const base = 'flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1 text-[12px]';
    const tag = <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Records</span>;
    if (!patient_id || r === 'error') {
      const labels = readinessLabels(RECORD_KEYS.filter((k) => req[k]));
      return <div className={`${base} bg-slate-50 text-slate-600`}>{tag} Requires {labels}{r === 'error' ? ' (could not check what is on file)' : ''}.</div>;
    }
    if (!r || r === 'loading') return <div className={`${base} bg-slate-50 text-slate-500`}>{tag} Checking what is on file…</div>;
    const missing = r.missing ?? [];
    const deferred = r.deferred ?? [];
    const satisfied = r.satisfied ?? [];
    const tone = missing.length ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900';
    return (
      <div className={`${base} ${tone}`} role="status">
        {tag}
        {missing.length > 0 && <span><strong>Missing:</strong> {readinessLabels(missing, r)}</span>}
        {satisfied.length > 0 && <span><strong>On file:</strong> {readinessLabels(satisfied, r)}</span>}
        {deferred.length > 0 && <span><strong>Needed before claim:</strong> {readinessLabels(deferred, r)}</span>}
        {missing.length > 0 && <span className="opacity-80">You can still {mode === 'plan' ? 'plan' : 'post'} it; the claim will not submit until these are on file.</span>}
      </div>
    );
  };

  const setTeeth = (i: number, teeth: string[]) => {
    patch(i, { teeth: sortTeeth(teeth), tooth_text: null });
    // Legacy flow: once the tooth is known, the surfaces panel opens beside it.
    if (teeth.length && reqs[i]!.surface) setSurfaceRow(i);
  };

  /** Click toggles one tooth; Shift+click adds every allowed tooth from the last click. */
  const pickTooth = (i: number, tooth: string, range: boolean) => {
    const cur = state[i]!.teeth;
    if (range && anchor.current && anchor.current !== tooth) {
      const span = toothRange(anchor.current, tooth).filter((t) => toothAllowed(reqs[i]!, t).allowed);
      setTeeth(i, [...cur, ...span]);
    } else {
      setTeeth(i, cur.includes(tooth) ? cur.filter((t) => t !== tooth) : [...cur, tooth]);
    }
    anchor.current = tooth;
  };

  /** Typed Tooth# ("7-23", "2, 4-6"): commit on blur / Enter. */
  const commitToothText = (i: number) => {
    const text = state[i]!.tooth_text;
    if (text == null) return;
    const { teeth, invalid } = parseToothList(text);
    if (invalid.length) toast.error(`Not a tooth number: ${invalid.join(', ')}`);
    const blocked = teeth.filter((t) => !toothAllowed(reqs[i]!, t).allowed);
    if (blocked.length) toast.error(`${rows[i]!.code.code} is not valid for tooth ${formatToothList(blocked)} — skipped.`);
    setTeeth(i, teeth.filter((t) => !blocked.includes(t)));
  };

  const toggleSurface = (i: number, key: SurfaceChoice) =>
    patch(i, { surfaces: state[i]!.surfaces.includes(key) ? state[i]!.surfaces.filter((k) => k !== key) : [...state[i]!.surfaces, key] });

  /** One result per tooth (a row with no tooth stays one result). */
  const results = (): ProcedureDetailsRowResult[] =>
    rows.flatMap((r, i) => {
      const s = state[i]!;
      return (s.teeth.length ? s.teeth : ['']).map((tooth) => ({
        code: r.code,
        tooth,
        quadrant: s.quadrant,
        surface: encodeSurfaces(s.surfaces, tooth),
        material_id: s.material_id,
      }));
    });
  const recordCount = state.reduce((n, s) => n + Math.max(1, s.teeth.length), 0);

  const save = async () => {
    const errs: string[] = [];
    if (mode === 'charge' && !hdr.provider_id) errs.push('Please select a treating provider.');
    if (!hdr.date) errs.push(`Please specify the ${mode === 'plan' ? 'diagnosis' : 'transaction'} date.`);
    const out = results();
    const reqOf = new Map(rows.map((r, i) => [r.code, reqs[i]!]));
    out.forEach((r) => errs.push(...requirementMessages(r.code, reqOf.get(r.code)!, r)));
    if (errs.length) {
      [...new Set(errs)].forEach((e) => toast.error(e));
      return;
    }
    await onSave(out, hdr);
  };

  // ---- Cells ---------------------------------------------------------------

  const pickerCell = (i: number, kind: 'tooth' | 'surface') => {
    const req = reqs[i]!;
    const s = state[i]!;
    const on = kind === 'tooth' ? req.tooth : req.surface;
    const open = kind === 'tooth' ? toothRow === i : surfaceRow === i;
    const toggle = () => (kind === 'tooth' ? setToothRow(open ? null : i) : setSurfaceRow(open ? null : i));
    const placeholder = !on ? '' : kind === 'tooth' ? 'e.g. 3 or 7-23' : `${req.min_surfaces === req.max_surfaces ? req.min_surfaces : `${req.min_surfaces}–${req.max_surfaces}`} surf.`;
    return (
      <div className="flex items-center gap-1">
        {kind === 'tooth' ? (
          // Editable: type one tooth, a list or a range; the panel stays in sync.
          <input disabled={!on} value={s.tooth_text ?? formatToothList(s.teeth)} placeholder={placeholder} aria-label={`Tooth for ${rows[i]!.code.code}`}
            title={s.teeth.length > 1 ? `${s.teeth.length} teeth — one record each` : undefined}
            onFocus={() => on && setToothRow(i)}
            onChange={(e) => patch(i, { tooth_text: e.target.value })}
            onBlur={() => commitToothText(i)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitToothText(i); } }}
            className={`${field} w-32 ${on ? 'bg-slate-50' : ''}`} />
        ) : (
          <input readOnly disabled={!on} value={encodeSurfaces(s.surfaces, s.teeth[0] ?? '')} placeholder={placeholder} aria-label={`Surfaces for ${rows[i]!.code.code}`}
            className={`${field} w-32 cursor-pointer ${on ? 'bg-slate-50' : ''}`} onClick={() => on && toggle()} />
        )}
        <button type="button" disabled={!on} onClick={toggle} aria-label={kind === 'tooth' ? 'Pick tooth' : 'Pick surfaces'}
          className="flex h-9 w-7 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">▼</button>
      </div>
    );
  };

  // ---- Panels --------------------------------------------------------------

  const toothButton = (i: number, t: string) => {
    const req = reqs[i]!;
    const check = toothAllowed(req, t);
    const sel = state[i]!.teeth.includes(t);
    return (
      <button key={t} type="button" disabled={!check.allowed} onClick={(e) => pickTooth(i, t, e.shiftKey)} aria-pressed={sel} title={check.allowed ? `Tooth ${t}` : check.reason}
        className={`h-8 w-8 border-b border-r border-slate-200 text-[13px] font-bold ${SEPARATOR_BEFORE.has(t) ? 'border-l-2 border-l-emerald-500' : ''} ${
          sel ? 'bg-[#8fa9c7] text-white' : check.allowed ? 'bg-white text-[#2f6db5] hover:bg-sky-50' : 'bg-slate-100 text-slate-300'}`}>
        {t}
      </button>
    );
  };

  const toothPanel = (i: number) => {
    const blank = (k: string) => <span key={k} className="h-8 w-8 border-b border-r border-slate-200 bg-slate-50" />;
    const primaryRow = (letters: string[], key: string) => (
      <div className="flex">
        {[0, 1, 2].map((k) => blank(`${key}l${k}`))}
        {letters.map((t) => toothButton(i, t))}
        {[0, 1, 2].map((k) => blank(`${key}r${k}`))}
      </div>
    );
    return (
      <div className="w-[520px] rounded border border-slate-300 bg-white shadow-lg">
        <div className="bg-slate-100 px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-[#1f3a5f]">Select Tooth Number</div>
        <div className="px-3 pb-2 pt-3">
          <div className="inline-block border-l border-t border-slate-200">
            <div className="flex">{PERMANENT_UPPER.map((t) => toothButton(i, t))}</div>
            {primaryRow(PRIMARY_UPPER, 'pu')}
            {primaryRow(PRIMARY_LOWER, 'pl')}
            <div className="flex">{PERMANENT_LOWER.map((t) => toothButton(i, t))}</div>
            {showSuper && (
              <>
                <div className="flex">{SUPERNUMERARY_UPPER.map((t) => toothButton(i, t))}</div>
                {primaryRow(SUPERNUMERARY_PRIMARY_UPPER, 'su')}
                {primaryRow(SUPERNUMERARY_PRIMARY_LOWER, 'sl')}
                <div className="flex">{SUPERNUMERARY_LOWER.map((t) => toothButton(i, t))}</div>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">Click to add/remove · <strong>Shift+click</strong> selects a range · or type <strong>7-23</strong> in Tooth#</span>
            <label className="flex shrink-0 items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#1f3a5f]">
              <input type="checkbox" checked={showSuper} onChange={(e) => setShowSuper(e.target.checked)} /> Show Supernumerary Teeth
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
          <span className="text-[11px] text-slate-600" role="status">
            {state[i]!.teeth.length === 0 ? 'No tooth selected' : state[i]!.teeth.length === 1 ? `Tooth ${state[i]!.teeth[0]}` : `${state[i]!.teeth.length} teeth selected — one record each`}
          </span>
          <span className="flex gap-2">
            {state[i]!.teeth.length > 0 && (
              <button type="button" onClick={() => { setTeeth(i, []); anchor.current = null; }} className={panelBtn}>Clear</button>
            )}
            <button type="button" onClick={() => setToothRow(null)} className={panelBtn}>⊗ Close</button>
          </span>
        </div>
      </div>
    );
  };

  const surfacePanel = (i: number) => {
    const req = reqs[i]!;
    const s = state[i]!;
    const needs = req.min_surfaces === req.max_surfaces ? `${req.min_surfaces}` : `${req.min_surfaces}–${req.max_surfaces}`;
    return (
      <div className="w-[430px] rounded border border-slate-300 bg-white shadow-lg">
        <div className="bg-slate-100 px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-[#1f3a5f]">Surfaces Crown Surfaces</div>
        <div className="p-3">
          <div className="rounded border border-slate-200">
            {SURFACE_ROWS.map(([a, b], r) => (
              <div key={a} className={`grid grid-cols-2 gap-x-4 px-3 py-2 text-[13px] text-slate-800 ${r ? 'border-t border-slate-200' : ''}`}>
                {[a, b].map((k, c) => k ? (
                  <label key={k} className={`flex items-center gap-2 ${k === 'IO' ? 'font-semibold' : ''}`}>
                    <input type="checkbox" checked={s.surfaces.includes(k)} onChange={() => toggleSurface(i, k)} /> {SURFACE_LABEL[k]}
                  </label>
                ) : <span key={`b${c}`} />)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
          <span className="flex items-center gap-1 text-[11px] text-slate-600" title={`This code needs ${needs} surface(s)`}>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#2f6db5] text-[10px] font-bold text-white">i</span>
            {s.surfaces.length} of {needs} selected{s.teeth.length > 1 ? ` · applied to all ${s.teeth.length} teeth` : ''}
          </span>
          <button type="button" onClick={() => setSurfaceRow(null)} className={panelBtn}>⊗ Close</button>
        </div>
      </div>
    );
  };

  const node = (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4" style={{ top: 'var(--app-nav-height, 0px)' }} onClick={busy ? undefined : onClose}>
      <div className="flex w-[1480px] max-w-full flex-col rounded border border-slate-300 bg-white shadow-2xl" style={{ maxHeight: 'calc(var(--vh) * 100 - var(--app-nav-height, 0px) - 32px)' }} onClick={(e) => e.stopPropagation()}>
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ background: TITLE_BLUE }}>
          <span className="text-[13px] font-bold uppercase tracking-wide">Add Procedure Details</span>
          <button type="button" onClick={onClose} disabled={busy} className="rounded px-1 text-base leading-none text-rose-300 hover:text-white" aria-label="Close">✖</button>
        </div>

        {/* Header row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-[13px] text-slate-700">
          <label className="flex items-center gap-2">Treating Provider
            <ProviderSelect kind="treating" value={hdr.provider_id} onChange={(id) => setHdr((h) => ({ ...h, provider_id: id }))}
              officeProviders={providers} allProviders={allProviders} placeholder="-- Select Provider --" disabled={providerLocked}
              className={`${field} tx-select w-80`} />
          </label>
          <label className="flex items-center gap-2">{mode === 'plan' ? 'Diagnosis Date' : 'Transaction Date'}<span className="text-rose-500">*</span>
            <input type="date" value={hdr.date} onChange={(e) => setHdr((h) => ({ ...h, date: e.target.value }))} className={`${field} w-44`} />
          </label>
          {mode === 'plan' && (
            <>
              <label className="flex items-center gap-2">Tx Plan ID
                <input type="number" min={1} value={hdr.tid ?? 1} onChange={(e) => setHdr((h) => ({ ...h, tid: Math.max(1, Number(e.target.value) || 1) }))} className={`${field} w-32`} />
              </label>
              <label className="flex items-center gap-2">Phase ID
                <input type="number" min={1} value={hdr.phase ?? 1} onChange={(e) => setHdr((h) => ({ ...h, phase: Math.max(1, Number(e.target.value) || 1) }))} className={`${field} w-32`} />
              </label>
            </>
          )}
        </div>

        {/* Grid + floating panels */}
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-4">
          <table className="w-full table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-28" />
              <col />
              <col className="w-52" />
              <col className="w-52" />
              <col className="w-52" />
              <col className="w-56" />
            </colgroup>
            <thead>
              <tr className="text-left text-white" style={{ background: TITLE_BLUE }}>
                <th className="px-3 py-2.5 font-semibold uppercase">Code</th>
                <th className="px-3 py-2.5 font-semibold">Description</th>
                <th className="px-3 py-2.5 font-semibold">Tooth#</th>
                <th className="px-3 py-2.5 font-semibold">Quadrant</th>
                <th className="px-3 py-2.5 font-semibold">Surfaces</th>
                <th className="px-3 py-2.5 font-semibold">Materials</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const req = reqs[i]!;
                const s = state[i]!;
                return (
                  <tr key={`${r.code.code}-${i}`} className="border-b border-slate-200 align-middle">
                    <td className="border-r border-slate-200 px-3 py-2 font-semibold text-slate-800">{r.code.code}</td>
                    <td className="border-r border-slate-200 px-3 py-2 text-slate-700">{r.code.description}</td>
                    <td className="border-r border-slate-200 px-3 py-2">{pickerCell(i, 'tooth')}</td>
                    <td className="border-r border-slate-200 px-3 py-2">
                      <select disabled={!req.quadrant} value={s.quadrant} onChange={(e) => patch(i, { quadrant: e.target.value })} aria-label={`Quadrant for ${r.code.code}`}
                        className={`${field} tx-select w-full`}>
                        <option value="">{req.quadrant ? '-- Quadrant --' : ''}</option>
                        {QUADRANTS.map((q) => <option key={q.code} value={q.code}>{q.code} — {q.label}</option>)}
                      </select>
                    </td>
                    <td className="border-r border-slate-200 px-3 py-2">{pickerCell(i, 'surface')}</td>
                    <td className="px-3 py-2">
                      <select disabled={!req.material} value={s.material_id ?? ''} onChange={(e) => patch(i, { material_id: e.target.value ? Number(e.target.value) : null })} aria-label={`Material for ${r.code.code}`}
                        className={`${field} tx-select w-full`}>
                        <option value="">{req.material ? '-- Material --' : ''}</option>
                        {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {rows.map((r, i) => {
                const line = readinessLine(i);
                return line ? (
                  <tr key={`rec-${r.code.code}-${i}`} className="border-b border-slate-200">
                    <td colSpan={6} className="p-0">{line}</td>
                  </tr>
                ) : null;
              })}
            </tbody>
          </table>

          {(toothRow != null || surfaceRow != null) && (
            <div className="mt-3 flex flex-wrap items-start justify-center gap-6">
              {toothRow != null && (
                <div>
                  {rows.length > 1 && <div className="mb-1 text-[11px] font-semibold text-slate-500">Tooth for {rows[toothRow]!.code.code}</div>}
                  {toothPanel(toothRow)}
                </div>
              )}
              {surfaceRow != null && (
                <div>
                  {rows.length > 1 && <div className="mb-1 text-[11px] font-semibold text-slate-500">Surfaces for {rows[surfaceRow]!.code.code}</div>}
                  {surfacePanel(surfaceRow)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b bg-slate-200 px-4 py-3">
          {recordCount > rows.length && (
            <span className="mr-auto text-[12px] text-slate-700" role="status">
              Saves <strong>{recordCount}</strong> separate procedure records (one per tooth).
            </span>
          )}
          <button type="button" onClick={() => void save()} disabled={busy} className="rounded bg-[#2f6db5] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#245a97] disabled:opacity-50">
            {busy ? 'Saving…' : recordCount > rows.length ? `💾 Save ${recordCount}` : '💾 Save'}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="rounded px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-50" style={{ background: NAVY }}>✖ Cancel</button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

import type { PerioExamDetailRead, PerioExamDetailCreate } from '@/api/generated/model';

// Periodontal chart data model. Mirrors the legacy Denticon perio chart (M07):
// each tooth carries 6 probing sites (3 facial / buccal + 3 lingual / palatal),
// plus per-surface mobility. The backend PerioExamDetail row is flat — pd1..pd6,
// fgm1..fgm6, mgj1..mgj6, bleed1..bleed6, supp1..supp6, furc1..furc6,
// mobility_buccal / mobility_lingual — so this module owns the mapping between
// that flat row and the (tooth × measure × site) grid the clinician reads.

// ---- Measurement types ----------------------------------------------------
// Outer→inner order on the facial band (the lingual band is the mirror). CAL is
// derived (PD + recession) and read-only; the backend has no CAL column.
export type MeasureType = 'MOB' | 'CAL' | 'FGM' | 'MGJ' | 'FUR' | 'SUP' | 'BLD' | 'PD';

export type MeasureKind = 'value' | 'bool' | 'mobility' | 'derived';

export interface MeasureMeta {
  key: MeasureType;
  label: string;
  /** value = numeric per-site; bool = bleeding/suppuration dot; mobility = one per surface; derived = CAL. */
  kind: MeasureKind;
  /** PerioExamDetail field prefix for value/bool measures (e.g. 'pd' → pd1..pd6). */
  prefix?: 'pd' | 'fgm' | 'mgj' | 'bleed' | 'supp' | 'furc';
}

export const MEASURES: Record<MeasureType, MeasureMeta> = {
  PD: { key: 'PD', label: 'Pocket', kind: 'value', prefix: 'pd' },
  BLD: { key: 'BLD', label: 'Bleeding', kind: 'bool', prefix: 'bleed' },
  SUP: { key: 'SUP', label: 'Suppuration', kind: 'bool', prefix: 'supp' },
  FUR: { key: 'FUR', label: 'Furcation', kind: 'value', prefix: 'furc' },
  MGJ: { key: 'MGJ', label: 'MGJ', kind: 'value', prefix: 'mgj' },
  FGM: { key: 'FGM', label: 'FGM', kind: 'value', prefix: 'fgm' },
  CAL: { key: 'CAL', label: 'CAL', kind: 'derived' },
  MOB: { key: 'MOB', label: 'Mobility', kind: 'mobility' },
};

// Row order on the facial band, outermost (Mobility) → innermost (Pocket, which
// sits against the tooth-number row). The lingual band is this list reversed.
export const FACIAL_ROWS: MeasureType[] = ['MOB', 'CAL', 'FGM', 'MGJ', 'FUR', 'SUP', 'BLD', 'PD'];
export const LINGUAL_ROWS: MeasureType[] = [...FACIAL_ROWS].reverse();

// The measure-type buttons in the data-entry rail (legacy: PD, FGM, MGJ, Bld,
// Sup, Fur, Mob — CAL is computed, never entered).
export const ENTRY_MEASURES: MeasureType[] = ['PD', 'FGM', 'MGJ', 'BLD', 'SUP', 'FUR', 'MOB'];

export type Surface = 'facial' | 'lingual';
export const SITES_PER_SURFACE = 3;

/** Site index (0..5) → surface. 0–2 facial/buccal, 3–5 lingual/palatal. */
export function siteSurface(site: number): Surface {
  return site < SITES_PER_SURFACE ? 'facial' : 'lingual';
}

// ---- Detail draft ----------------------------------------------------------
// A mutable per-tooth working copy. Keeps the backend id (when the row exists)
// so edits route to update vs. create. Field access is dynamic by name, so the
// draft is an indexable bag over the known PerioExamDetail fields.
export interface PerioDetailDraft {
  id?: number;
  exam_id?: number;
  tooth_no: string;
  /** Flat measurement fields (pd1.., bleed1.., mobility_buccal, …), accessed by name. */
  [field: string]: number | boolean | string | null | undefined;
}

export function emptyDraft(tooth_no: string, exam_id?: number): PerioDetailDraft {
  return { tooth_no, exam_id };
}

export function draftFromRead(d: PerioExamDetailRead): PerioDetailDraft {
  return { ...d } as PerioDetailDraft;
}

/** Field name for a (measure, site) value/bool cell, e.g. ('PD',4) → 'pd5'. */
export function fieldName(measure: MeasureType, site: number): string | null {
  const m = MEASURES[measure];
  if (m.kind === 'mobility') return siteSurface(site) === 'facial' ? 'mobility_buccal' : 'mobility_lingual';
  if (!m.prefix) return null; // derived (CAL)
  return `${m.prefix}${site + 1}`; // site 0..5 → suffix 1..6
}

/** Read a numeric cell (PD/FGM/MGJ/FUR) value, or null. */
export function numAt(draft: PerioDetailDraft | undefined, measure: MeasureType, site: number): number | null {
  if (!draft) return null;
  if (measure === 'CAL') return calcCAL(draft, site);
  const f = fieldName(measure, site);
  if (!f) return null;
  const v = draft[f];
  if (typeof v === 'number') return v;
  // `mobility_buccal` / `mobility_lingual` come back from the backend as STRINGS
  // (PerioExamDetailRead types them `string | null`), so a saved mobility grade
  // read blank on the grid — and on the print — until the next edit put a number
  // back in the draft. Coerce numeric strings rather than dropping them.
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/** Read a boolean cell (BLD/SUP). */
export function boolAt(draft: PerioDetailDraft | undefined, measure: MeasureType, site: number): boolean {
  if (!draft) return false;
  const f = fieldName(measure, site);
  return !!(f && draft[f] === true);
}

/** CAL (clinical attachment level) = pocket depth + gingival recession (FGM). */
export function calcCAL(draft: PerioDetailDraft | undefined, site: number): number | null {
  if (!draft) return null;
  const pd = draft[`pd${site + 1}`];
  if (typeof pd !== 'number') return null;
  const fgm = draft[`fgm${site + 1}`];
  return pd + (typeof fgm === 'number' ? fgm : 0);
}

/** Immutably set a numeric/bool cell on a draft, returning the next draft. */
export function setCell(
  draft: PerioDetailDraft,
  measure: MeasureType,
  site: number,
  value: number | boolean | null,
): PerioDetailDraft {
  const f = fieldName(measure, site);
  if (!f) return draft;
  return { ...draft, [f]: value };
}

// ---- Cell navigation -------------------------------------------------------
export interface Cell {
  tooth: string;
  measure: MeasureType;
  /** 0..5 for value/bool; 0 (facial) or 3 (lingual) for mobility. */
  site: number;
}

export function cellKey(c: Cell): string {
  return `${c.tooth}:${c.measure}:${c.site}`;
}

// Probing order for auto-advance: per arch, sweep the facial band of every tooth
// (3 sites each) left→right, then the lingual band. Mobility = one cell/surface.
export function buildCellOrder(measure: MeasureType, arches: string[][]): Cell[] {
  const out: Cell[] = [];
  const kind = MEASURES[measure].kind;
  for (const arch of arches) {
    for (const surf of [0, SITES_PER_SURFACE]) {
      if (kind === 'mobility') {
        for (const tooth of arch) out.push({ tooth, measure, site: surf });
      } else {
        for (const tooth of arch) {
          for (let s = 0; s < SITES_PER_SURFACE; s++) out.push({ tooth, measure, site: surf + s });
        }
      }
    }
  }
  return out;
}

// ---- Persistence body ------------------------------------------------------
// Build the create/update body from a draft. Only the flat measurement fields
// (+ exam_id, tooth_no) are sent — id is carried separately for the update path.
const NUMERIC_FIELDS = [
  ...range6('pd'), ...range6('fgm'), ...range6('mgj'), ...range6('furc'),
  'mobility_buccal', 'mobility_lingual',
];
const BOOL_FIELDS = [...range6('bleed'), ...range6('supp')];

function range6(prefix: string): string[] {
  return [1, 2, 3, 4, 5, 6].map((n) => `${prefix}${n}`);
}

export function detailBody(draft: PerioDetailDraft, examId: number): PerioExamDetailCreate {
  const body: Record<string, unknown> = { exam_id: examId, tooth_no: draft.tooth_no };
  // Send numbers/booleans; send explicit null for fields cleared via Reset so the
  // clear persists. Undefined (never-touched) fields are omitted. The backend
  // numeric columns are INTEGER (e.g. mobility_buccal), so non-integer values
  // (legacy half-grade mobility 0.5/1.5/2.5) are kept on screen but not sent —
  // they 422 otherwise. Backend gap PERIO-8: widen mobility columns to decimal.
  for (const f of NUMERIC_FIELDS) {
    const v = draft[f];
    if (typeof v === 'number') { if (Number.isInteger(v)) body[f] = v; }
    else if (v === null) body[f] = null;
  }
  for (const f of BOOL_FIELDS) {
    const v = draft[f];
    if (typeof v === 'boolean') body[f] = v;
    else if (v === null) body[f] = null;
  }
  return body as unknown as PerioExamDetailCreate;
}

/** True when a draft carries no charted measurement (skip persisting empty teeth). */
export function isDraftEmpty(draft: PerioDetailDraft): boolean {
  for (const f of NUMERIC_FIELDS) if (typeof draft[f] === 'number') return false;
  for (const f of BOOL_FIELDS) if (draft[f] === true) return false;
  return true;
}

// Carry-forward (New Exam → "Yes"): clone the previous exam's measurements onto
// fresh drafts (no id / exam_id — they become new rows under the new exam).
export function carryForward(prev: PerioDetailDraft[]): PerioDetailDraft[] {
  return prev.map((d) => {
    const next: PerioDetailDraft = { tooth_no: d.tooth_no };
    for (const f of NUMERIC_FIELDS) if (typeof d[f] === 'number') next[f] = d[f];
    for (const f of BOOL_FIELDS) if (typeof d[f] === 'boolean') next[f] = d[f];
    return next;
  });
}

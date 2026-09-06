import type { ChartConditionCreate, ChartConditionRead, ChartConditionUpdate, PatientProcedureRead } from '@/api/generated/model';
import { decodeRegion, encodeRegion } from '@/features/restorative/chartModel';
import type { PerioDetailDraft } from '@/features/perio/perioModel';

// Restorative ⇄ Perio integration seam. Both charts read the same persisted
// sources (chart_conditions + patient_procedures), so what one chart records the
// other sees on its next load — no client-side message bus, no duplicate store.
//
//   Restorative → Perio  (tooth status, derived at read time — `deriveToothStatuses`)
//     Missing / extracted / congenitally missing / avulsed / pontic / impacted /
//     unerupted / edentulous → the perio tooth is NOT probeable: cells locked,
//     auto-advance skips it, graphical view greys it, print/compare mark it.
//     Implant → probeable (peri-implant probing is valid) but flagged "i" and the
//     Furcation row is locked (no furcation on an implant). Crown / bridge
//     abutment / restorative-charted Mobility & Recession → informational hints.
//
//   Perio → Restorative  (clinical findings, written as chart_conditions — `planPerioSync`)
//     Mobility (max of buccal/lingual) → MOBILITY m1..m3
//     Furcation (max class over 6 sites) → FURCATION f1..f4
//     Recession (max positive FGM)      → RECESSION <n>mm (junction)
//     Rows are tagged `src=perio` (region) so the sync updates/clears its own
//     rows and never touches hand-charted ones except to adopt a matching one.

export type AbsenceReason =
  | 'missing'
  | 'extracted'
  | 'congenitally-missing'
  | 'avulsed'
  | 'pontic'
  | 'impacted'
  | 'unerupted'
  | 'edentulous'
  | 'not-in-dentition';

export const ABSENCE_LABEL: Record<AbsenceReason, string> = {
  missing: 'Missing',
  extracted: 'Extracted',
  'congenitally-missing': 'Congenitally missing',
  avulsed: 'Avulsed',
  pontic: 'Bridge pontic',
  impacted: 'Impacted',
  unerupted: 'Unerupted',
  edentulous: 'Edentulous arch',
  'not-in-dentition': 'Not in current dentition',
};

export interface ToothClinicalStatus {
  tooth: string;
  /** True when the tooth is in the mouth and can be probed. */
  present: boolean;
  reason: AbsenceReason | null;
  implant: boolean;
  crown: boolean;
  bridge_abutment: boolean;
  /** Mobility grade charted on the restorative chart (1..3), or null. */
  mobility_grade: number | null;
  /** Restorative chart carries a Recession condition on this tooth. */
  recession: boolean;
  /** Human-readable provenance lines, e.g. "Missing — Restorative Chart, 2026-08-01". */
  sources: string[];
}

export const PRESENT_TOOTH = (tooth: string): ToothClinicalStatus => ({
  tooth, present: true, reason: null, implant: false, crown: false, bridge_abutment: false, mobility_grade: null, recession: false, sources: [],
});

// ---- CDT code classes (patient_procedures / treatment-plan items) ----------
// Extraction family D7111–D7251; implant body placement D6010–D6013, D6040, D6050;
// crowns D2710–D2799 (single-unit) and D6058–D6094 (implant-supported crowns).
const EXTRACTION_RE = /^D7(111|140|210|220|230|240|241|250|251)$/i;
const IMPLANT_RE = /^D60(10|11|12|13|40|50)$/i;
const CROWN_RE = /^D2(71\d|72\d|74\d|75\d|78\d|79\d)$|^D60(5[89]|6\d|7\d|8\d|9[0-4])$/i;

const ABSENT_CODES: Record<string, AbsenceReason> = {
  MISSING: 'missing',
  MISSING_CLOSED: 'missing',
  CONGENITALLY_MISSING: 'congenitally-missing',
  AVULSION: 'avulsed',
  BRIDGE_PONTIC: 'pontic',
  IMPACTED: 'impacted',
  IMPACTED_MESIAL: 'impacted',
  IMPACTED_DISTAL: 'impacted',
};

export interface DeriveInput {
  conditions: ChartConditionRead[];
  procedures?: PatientProcedureRead[];
  /** Restorative "Edentulous" toggle (chart settings). */
  edentulous?: boolean;
  /** Teeth present in the restorative dentition band; teeth outside it are unerupted. */
  dentitionTeeth?: Set<string> | null;
}

function fmtDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Per-tooth clinical status (keyed by tooth id "1".."32" / "A".."T"). */
export function deriveToothStatuses(input: DeriveInput): Map<string, ToothClinicalStatus> {
  const map = new Map<string, ToothClinicalStatus>();
  const get = (t: string) => {
    let s = map.get(t);
    if (!s) { s = PRESENT_TOOTH(t); map.set(t, s); }
    return s;
  };
  const absent = (s: ToothClinicalStatus, reason: AbsenceReason, source: string) => {
    s.present = false;
    if (!s.reason) s.reason = reason;
    s.sources.push(source);
  };

  for (const c of input.conditions) {
    if (c.is_inactive || !c.tooth) continue;
    const code = (c.condition_code ?? '').toUpperCase();
    const planned = (c.chart_as ?? '') === 'tx-plan';
    const region = decodeRegion(c.region);
    const when = fmtDate(c.activity_date ?? c.created_at);
    const s = get(c.tooth);
    const src = `Restorative Chart${when ? `, ${when}` : ''}`;

    if (code in ABSENT_CODES) {
      // Missing/Unerupted Permanent (legacy sub-option) → unerupted, not missing.
      const reason: AbsenceReason = (code === 'MISSING' || code === 'MISSING_CLOSED') && (c.tooth_status ?? region.sub) === 'unerupted'
        ? 'unerupted'
        : ABSENT_CODES[code]!;
      absent(s, reason, `${ABSENCE_LABEL[reason]} — ${src}`);
    } else if (code === 'EXTRACTION' && !planned) {
      absent(s, 'extracted', `Extracted — ${src}`);
    } else if (code === 'IMPLANT' && !planned) {
      s.implant = true;
      s.sources.push(`Implant — ${src}`);
    } else if (/^(CROWN|THREE_QUARTER|THREE_QUARTER_CROWN)$/.test(code) && !planned) {
      s.crown = true;
    } else if (code === 'BRIDGE_PILLAR' || code === 'BRIDGE') {
      s.bridge_abutment = true;
    } else if (code === 'MOBILITY') {
      const g = parseInt(((c.grade ?? region.grade) ?? '').replace(/\D/g, ''), 10);
      if (Number.isFinite(g) && g > 0) s.mobility_grade = Math.max(s.mobility_grade ?? 0, g);
    } else if (code === 'RECESSION') {
      s.recession = true;
    }
  }

  for (const p of input.procedures ?? []) {
    if (p.is_void || !p.tooth) continue;
    const s = get(p.tooth);
    const src = `Completed ${p.procedure_code}${p.date_of_service ? `, ${fmtDate(p.date_of_service)}` : ''}`;
    if (EXTRACTION_RE.test(p.procedure_code)) absent(s, 'extracted', `Extracted — ${src}`);
    else if (IMPLANT_RE.test(p.procedure_code)) { s.implant = true; s.sources.push(`Implant — ${src}`); }
    else if (CROWN_RE.test(p.procedure_code)) s.crown = true;
  }

  // An implant placed in the site of an extracted/missing tooth is probeable again.
  for (const s of map.values()) {
    if (s.implant && !s.present && (s.reason === 'missing' || s.reason === 'extracted' || s.reason === 'congenitally-missing' || s.reason === 'avulsed')) {
      s.present = true;
      s.reason = null;
    }
  }

  if (input.dentitionTeeth) {
    for (const t of ALL_PERMANENT) {
      if (input.dentitionTeeth.has(t)) continue;
      const s = get(t);
      if (s.present) absent(s, 'not-in-dentition', 'Not in the dentition selected on the Restorative Chart');
    }
  }

  if (input.edentulous) {
    for (const t of ALL_PERMANENT) {
      const s = get(t);
      if (s.present && !s.implant) absent(s, 'edentulous', 'Edentulous — Restorative Chart setting');
    }
  }

  return map;
}

const ALL_PERMANENT = Array.from({ length: 32 }, (_, i) => String(i + 1));

/** One-line tooltip for a tooth's status, or '' when nothing to say. */
export function statusTooltip(s: ToothClinicalStatus | undefined): string {
  if (!s) return '';
  const lines: string[] = [];
  if (!s.present && s.reason) lines.push(`${ABSENCE_LABEL[s.reason]} — not probeable`);
  if (s.implant) lines.push('Implant — furcation not applicable');
  if (s.crown) lines.push('Crown');
  if (s.bridge_abutment) lines.push('Bridge abutment');
  if (s.mobility_grade) lines.push(`Restorative mobility grade ${s.mobility_grade}`);
  if (s.recession) lines.push('Recession charted on the Restorative Chart');
  for (const src of s.sources) if (!lines.includes(src)) lines.push(src);
  return lines.join('\n');
}

/** Can this (tooth, measure) cell take a value? */
export function cellEnabled(s: ToothClinicalStatus | undefined, measure: string): boolean {
  if (!s) return true;
  if (!s.present) return false;
  if (s.implant && measure === 'FUR') return false;
  return true;
}

// ---- Perio → Restorative sync ---------------------------------------------

export const PERIO_SRC = 'perio';

const numField = (d: PerioDetailDraft, f: string): number | null => {
  const v = d[f];
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

/** Summarised findings for one tooth of one exam. */
export interface PerioToothFindings {
  /** 0.5-step mobility → grade 1..3 (0 = none). */
  mobility: number;
  /** Furcation class 1..4 (0 = none). */
  furcation: number;
  /** Deepest recession in mm (0 = none). */
  recession: number;
  /** Deepest pocket in mm, null when none recorded. */
  max_pd: number | null;
  bleeding_sites: number;
  suppuration_sites: number;
}

export function summariseDraft(d: PerioDetailDraft | undefined): PerioToothFindings {
  const out: PerioToothFindings = { mobility: 0, furcation: 0, recession: 0, max_pd: null, bleeding_sites: 0, suppuration_sites: 0 };
  if (!d) return out;
  const mob = Math.max(numField(d, 'mobility_buccal') ?? 0, numField(d, 'mobility_lingual') ?? 0);
  out.mobility = mob > 0 ? Math.min(3, Math.ceil(mob)) : 0;
  for (let i = 1; i <= 6; i++) {
    out.furcation = Math.max(out.furcation, numField(d, `furc${i}`) ?? 0);
    out.recession = Math.max(out.recession, numField(d, `fgm${i}`) ?? 0);
    const pd = numField(d, `pd${i}`);
    if (pd != null) out.max_pd = Math.max(out.max_pd ?? 0, pd);
    if (d[`bleed${i}`] === true) out.bleeding_sites++;
    if (d[`supp${i}`] === true) out.suppuration_sites++;
  }
  out.furcation = Math.min(4, out.furcation);
  return out;
}

export type SyncOp =
  | { kind: 'create'; data: ChartConditionCreate }
  | { kind: 'update'; id: number; data: ChartConditionUpdate };

interface SyncTarget {
  code: 'MOBILITY' | 'FURCATION' | 'RECESSION';
  area: 'whole' | 'root' | 'junction';
  value: number;
  grade: string;
  description: string;
}

function targets(f: PerioToothFindings, examDate: string): SyncTarget[] {
  const tag = `Perio exam ${examDate}`;
  return [
    { code: 'MOBILITY', area: 'whole', value: f.mobility, grade: `m${f.mobility}`, description: `Mobility grade ${f.mobility} (${tag})` },
    { code: 'FURCATION', area: 'root', value: f.furcation, grade: `f${f.furcation}`, description: `Furcation class ${f.furcation} (${tag})` },
    { code: 'RECESSION', area: 'junction', value: f.recession, grade: `${f.recession}mm`, description: `Recession ${f.recession} mm (${tag})` },
  ];
}

export function isPerioManaged(c: ChartConditionRead): boolean {
  return decodeRegion(c.region).src === PERIO_SRC;
}

/**
 * Plan the chart_conditions writes that make the restorative chart reflect one
 * tooth's findings on the LATEST exam. Pure: returns ops, performs nothing.
 *
 * Per finding: a value > 0 creates (or updates the grade of) the tooth's row;
 * 0 / cleared inactivates the perio-managed row. A hand-charted row of the same
 * code on the tooth is adopted (updated + tagged) rather than duplicated.
 */
export function planPerioSync(args: {
  tooth: string;
  draft: PerioDetailDraft | undefined;
  conditions: ChartConditionRead[];
  patient_id: number;
  office_id: number | null;
  exam_date: string;
}): SyncOp[] {
  const { tooth, draft, conditions, patient_id, office_id, exam_date } = args;
  const ops: SyncOp[] = [];
  const findings = summariseDraft(draft);
  const rows = conditions.filter((c) => !c.is_inactive && c.tooth === tooth);

  for (const t of targets(findings, exam_date)) {
    const same = rows.filter((c) => (c.condition_code ?? '').toUpperCase() === t.code);
    const managed = same.find(isPerioManaged);
    const existing = managed ?? same[0];
    const region = encodeRegion({ grade: t.grade, src: PERIO_SRC });

    if (t.value > 0) {
      if (existing) {
        const curGrade = existing.grade ?? decodeRegion(existing.region).grade ?? null;
        if (curGrade !== t.grade || !isPerioManaged(existing) || existing.activity_date?.slice(0, 10) !== exam_date) {
          ops.push({ kind: 'update', id: existing.id, data: { grade: t.grade, region, description: t.description, activity_date: exam_date } });
        }
      } else {
        ops.push({
          kind: 'create',
          data: {
            patient_id, office_id, tooth, area: t.area, condition_code: t.code, chart_as: 'pre-existing',
            grade: t.grade, region, description: t.description, activity_date: exam_date, is_inactive: false,
          },
        });
      }
    } else if (managed) {
      // Only rows this bridge wrote are cleared — a hand-charted finding stays.
      ops.push({ kind: 'update', id: managed.id, data: { is_inactive: true } });
    }
  }
  return ops;
}

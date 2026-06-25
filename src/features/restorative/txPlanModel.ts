import type { ProcedureCodeRead, TreatmentPlanItemRead, PatientProcedureRead, TreatmentPlanRead } from '@/api/generated/model';
import type { ToothGlyph } from './chartModel';
import type { ToothArea } from './types';
import { toothMeta } from './dentition';

// Tx-Plan / Completed support: ADA-code → tooth classification + enforcement,
// procedure → overlay glyph mapping, source colours, plan resolution, estimates.

export type ChartSource = 'pre-existing' | 'completed' | 'tx-plan';

export const SOURCE_COLOR: Record<ChartSource, string> = {
  'pre-existing': '#1d4ed8', // blue
  completed: '#15803d', // green
  'tx-plan': '#dc2626', // red
};

/** Translucent variant of a #rrggbb colour — used for selection fills/tints. */
export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Math.abs(hash(JSON.stringify(Date)))}`;
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export function classifyTooth(id: string): 'anterior' | 'posterior' {
  const t = toothMeta(id).type;
  return t === 'incisor' || t === 'canine' ? 'anterior' : 'posterior';
}

/** Enforce a procedure code against a tooth (legacy anterior/posterior + valid_teeth). */
export function codeAllowedOnTooth(code: ProcedureCodeRead, toothId: string): { allowed: boolean; reason?: string } {
  if (code.valid_teeth && code.valid_teeth.length > 0 && !code.valid_teeth.includes(toothId)) {
    return { allowed: false, reason: `Not valid for tooth ${toothId}` };
  }
  const area = (code.tooth_area ?? '').toLowerCase();
  if (area === 'anterior' || area === 'posterior') {
    const t = classifyTooth(toothId);
    if (t !== area) return { allowed: false, reason: `This is a ${area} code; tooth ${toothId} is ${t}` };
  }
  return { allowed: true };
}

// Map a procedure code to an overlay glyph code understood by ToothFigure.
export function procedureGlyphCode(codeStr: string, description?: string | null, drawAs?: string | null): string {
  if (drawAs && drawAs.trim()) return drawAs.trim().toUpperCase();
  const d = `${codeStr} ${description ?? ''}`.toLowerCase();
  if (/implant/.test(d)) return 'IMPLANT';
  if (/crown/.test(d)) return 'CROWN';
  if (/(root canal|endo)/.test(d)) return 'RCT';
  if (/extract/.test(d)) return 'EXTRACTION';
  if (/(amalgam|composite|resin|filling|restor)/.test(d)) return 'FILLING';
  if (/(bridge|pontic|abutment)/.test(d)) return 'BRIDGE_PILLAR';
  return 'PROC';
}

function glyphArea(glyphCode: string, surface?: string | null): ToothArea {
  if (surface) return 'surface';
  if (/(CROWN|THREE_QUARTER)/.test(glyphCode)) return 'crown';
  if (/(RCT|ENDO)/.test(glyphCode)) return 'root';
  if (glyphCode === 'FILLING') return 'surface';
  return 'whole';
}

interface OverlayRow {
  tooth?: string | null;
  surface?: string | null;
  procedure_code: string;
  description?: string | null;
}

/** Build per-tooth overlay glyphs from procedures / plan-items, coloured by source. */
export function buildOverlayGlyphs(
  rows: OverlayRow[],
  source: ChartSource,
  codeMap?: Map<string, ProcedureCodeRead>,
): Map<string, ToothGlyph[]> {
  const map = new Map<string, ToothGlyph[]>();
  for (const r of rows) {
    if (!r.tooth) continue;
    const meta = codeMap?.get(r.procedure_code);
    const gcode = procedureGlyphCode(r.procedure_code, r.description ?? meta?.description, meta?.draw_as);
    const glyph: ToothGlyph = {
      area: glyphArea(gcode, r.surface),
      code: gcode,
      color: SOURCE_COLOR[source],
      drawable: true,
      material_id: null,
    };
    const arr = map.get(r.tooth) ?? [];
    arr.push(glyph);
    map.set(r.tooth, arr);
  }
  return map;
}

/** Active plan = highest by created_at (legacy "defaults to highest treatment plan ID"). */
export function activePlan(plans: TreatmentPlanRead[]): TreatmentPlanRead | null {
  if (!plans.length) return null;
  return [...plans].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id.localeCompare(a.id))[0] ?? null;
}

export function estimateInsurance(fee: number, coveragePct: number | null | undefined): number {
  if (!coveragePct) return 0;
  return Math.round(fee * (coveragePct / 100) * 100) / 100;
}

// Predicates for extraction/implant gating (operate on a tooth's glyph codes).
export function toothHasCode(glyphs: ToothGlyph[] | undefined, re: RegExp): boolean {
  return !!glyphs?.some((g) => re.test(g.code.toUpperCase()));
}

export type { TreatmentPlanItemRead, PatientProcedureRead };

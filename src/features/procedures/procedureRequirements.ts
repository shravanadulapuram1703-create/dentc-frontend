// What a procedure code REQUIRES before it can be planned or charged, resolved
// from the backend's procedure_codes row, and the validation that enforces it.
//
// Source of truth (procedure_codes, snake_case):
//   requires_tooth / requires_surface / requires_quadrant / requires_lab  — the flags
//   surface_rules {min,max,allowed} · min_surfaces / max_surfaces          — surface count
//   valid_teeth[] · tooth_area ('anterior' | 'posterior')                 — tooth restriction
//   default_material_id                                                    — material preset
//   requires_attachment / requires_perio_chart / requires_photo /
//   requires_xray / requires_missing_tooth_info                            — supporting records
//     (PROC-7, Setup → Procedure Codes → Charting; see procedureCodeExtras.ts).
//     Whether they are SATISFIED is judged server-side — supportingRecords.ts
//     wraps the readiness endpoints; the claim submit enforces them.
// Only the flags are populated for every code today; the structured rules are
// seeded on a handful, so sensible fallbacks apply (see PROC-INT-5..7 in
// docs/procedures/procedure_entry_integration.md).

import type { ProcedureCodeRead } from '@/api/generated/model';
import {
  PROCEDURE_CODE_EXTRA_KEYS,
  PROCEDURE_CODE_EXTRA_LABELS,
  resolveProcedureCodeExtras,
} from './procedureCodeExtras';

export const QUADRANTS = [
  { code: 'UR', label: 'Upper Right' },
  { code: 'UL', label: 'Upper Left' },
  { code: 'LL', label: 'Lower Left' },
  { code: 'LR', label: 'Lower Right' },
  { code: 'UA', label: 'Upper Arch' },
  { code: 'LA', label: 'Lower Arch' },
  { code: 'FM', label: 'Full Mouth' },
] as const;

/** Legacy Universal numbering: permanent 1–32, primary A–T. */
export const PERMANENT_UPPER = Array.from({ length: 16 }, (_, i) => String(i + 1));
export const PERMANENT_LOWER = Array.from({ length: 16 }, (_, i) => String(32 - i));
export const PRIMARY_UPPER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const PRIMARY_LOWER = ['T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K'];
/** Supernumerary teeth: permanent tooth + 50 (51–82), primary letter + "S" (AS–TS). */
export const SUPERNUMERARY_UPPER = PERMANENT_UPPER.map((t) => String(Number(t) + 50));
export const SUPERNUMERARY_LOWER = PERMANENT_LOWER.map((t) => String(Number(t) + 50));
export const SUPERNUMERARY_PRIMARY_UPPER = PRIMARY_UPPER.map((t) => `${t}S`);
export const SUPERNUMERARY_PRIMARY_LOWER = PRIMARY_LOWER.map((t) => `${t}S`);

const ANTERIOR = new Set([
  '6', '7', '8', '9', '10', '11', '22', '23', '24', '25', '26', '27',
  'C', 'D', 'E', 'F', 'G', 'H', 'M', 'N', 'O', 'P', 'Q', 'R',
]);

/** Anterior vs posterior for a Universal tooth id (supernumerary maps to its base tooth). */
export function toothClass(tooth: string): 'anterior' | 'posterior' | null {
  const t = tooth.trim().toUpperCase();
  if (!t) return null;
  const n = Number(t);
  if (Number.isFinite(n) && n > 50) return ANTERIOR.has(String(n - 50)) ? 'anterior' : 'posterior';
  const base = t.endsWith('S') && t.length === 2 ? t[0]! : t;
  return ANTERIOR.has(base) ? 'anterior' : 'posterior';
}

// ---- Surfaces --------------------------------------------------------------

/**
 * Legacy "Crown Surfaces" choices. The stored surface letter depends on the tooth:
 * Incisal (I) on anterior teeth / Occlusal (O) on posterior; Facial (F) on anterior /
 * Buccal (B) on posterior. Class V (gingival-third facial/lingual) is stored as the
 * surface letter + "5" — see PROC-INT-6 for the vocabulary the backend should own.
 */
export type SurfaceChoice = 'M' | 'IO' | 'D' | 'FB' | 'FB5' | 'L' | 'L5';

export const SURFACE_CHOICES: { key: SurfaceChoice; label: string }[] = [
  { key: 'M', label: 'Mesial' },
  { key: 'IO', label: 'Incisal/Occlusal' },
  { key: 'D', label: 'Distal' },
  { key: 'FB', label: 'Facial/Buccal' },
  { key: 'FB5', label: 'Class V-Facial/Buccal' },
  { key: 'L', label: 'Lingual' },
  { key: 'L5', label: 'Class V-Lingual' },
];

/** Store-form of one choice for a tooth ("IO" on tooth 30 → "O", on tooth 8 → "I"). */
export function surfaceLetter(choice: SurfaceChoice, tooth: string): string {
  const anterior = toothClass(tooth) === 'anterior';
  switch (choice) {
    case 'IO': return anterior ? 'I' : 'O';
    case 'FB': return anterior ? 'F' : 'B';
    case 'FB5': return anterior ? 'F5' : 'B5';
    default: return choice;
  }
}

const CANONICAL_ORDER = ['M', 'O', 'I', 'D', 'B', 'F', 'L', 'B5', 'F5', 'L5'];

/** Choices → stored surface string, in the canonical M·O/I·D·B/F·L order. */
export function encodeSurfaces(choices: readonly SurfaceChoice[], tooth: string): string {
  const letters = choices.map((c) => surfaceLetter(c, tooth));
  return CANONICAL_ORDER.filter((l) => letters.includes(l)).join('');
}

/** Stored surface string → choices (tolerates any letter order; unknown letters dropped). */
export function decodeSurfaces(surface: string | null | undefined): SurfaceChoice[] {
  const s = (surface ?? '').toUpperCase();
  const out = new Set<SurfaceChoice>();
  // Class V tokens first so their base letter is not double-counted.
  const rest = s
    .replace(/[BF]5/g, () => { out.add('FB5'); return ''; })
    .replace(/L5/g, () => { out.add('L5'); return ''; });
  for (const ch of rest) {
    if (ch === 'M') out.add('M');
    else if (ch === 'O' || ch === 'I') out.add('IO');
    else if (ch === 'D') out.add('D');
    else if (ch === 'B' || ch === 'F') out.add('FB');
    else if (ch === 'L') out.add('L');
  }
  return SURFACE_CHOICES.map((c) => c.key).filter((k) => out.has(k));
}

/** How many surfaces the stored string names (Class V counts as one). */
export function countSurfaces(surface: string | null | undefined): number {
  return decodeSurfaces(surface).length;
}

// ---- Requirements -----------------------------------------------------------

export interface ProcedureRequirements {
  tooth: boolean;
  surface: boolean;
  /** Surface count window, only meaningful when `surface` is true. */
  min_surfaces: number;
  max_surfaces: number;
  quadrant: boolean;
  /** Lab/material procedure — a material must be chosen. */
  material: boolean;
  /** Teeth the code may be charted on; empty = any. */
  valid_teeth: string[];
  tooth_area: 'anterior' | 'posterior' | null;
  default_material_id: number | null;
  /** Supporting records the code demands (PROC-7); readiness via supportingRecords.ts. */
  attachment: boolean;
  perio_chart: boolean;
  photo: boolean;
  xray: boolean;
  missing_tooth_info: boolean;
}

/** "One Surface" / "Two Surfaces" / "Three+" / "Four Or More" in a CDT description. */
export function inferSurfaceCount(description: string | null | undefined): { min: number; max: number } | null {
  const d = (description ?? '').toLowerCase();
  if (/\bone\s+surf/.test(d)) return { min: 1, max: 1 };
  if (/\btwo\s+surf/.test(d)) return { min: 2, max: 2 };
  if (/\bthree\s*(\+|or more|\/more)/.test(d) || /\bthree\+/.test(d)) return { min: 3, max: 5 };
  if (/\bthree\s+surf/.test(d)) return { min: 3, max: 3 };
  if (/\bfour\s*(\+|or more|\/more)?/.test(d)) return { min: 4, max: 5 };
  return null;
}

function structuredSurfaceRule(code: ProcedureCodeRead): { min?: number; max?: number } | null {
  const r = code.surface_rules;
  if (r && typeof r === 'object') {
    const o = r as { min?: unknown; max?: unknown };
    return {
      min: typeof o.min === 'number' ? o.min : undefined,
      max: typeof o.max === 'number' ? o.max : undefined,
    };
  }
  return null;
}

/** Resolve everything the code demands, with fallbacks for unseeded structured rules. */
export function procedureRequirements(code: ProcedureCodeRead): ProcedureRequirements {
  const sr = structuredSurfaceRule(code);
  const inferred = inferSurfaceCount(code.description);
  const min = sr?.min ?? code.min_surfaces ?? inferred?.min ?? 1;
  const max = Math.max(min, sr?.max ?? code.max_surfaces ?? inferred?.max ?? 5);
  const area = (code.tooth_area ?? '').trim().toLowerCase();
  const extras = resolveProcedureCodeExtras(code);
  return {
    tooth: !!code.requires_tooth || !!code.requires_surface,
    surface: !!code.requires_surface,
    min_surfaces: min,
    max_surfaces: max,
    quadrant: !!code.requires_quadrant,
    material: !!code.requires_lab,
    valid_teeth: (code.valid_teeth ?? []).map((t) => String(t).toUpperCase()),
    tooth_area: area === 'anterior' || area === 'posterior' ? area : null,
    default_material_id: code.default_material_id ?? null,
    attachment: extras.requires_attachment,
    perio_chart: extras.requires_perio_chart,
    photo: extras.requires_photo,
    xray: extras.requires_xray,
    missing_tooth_info: extras.requires_missing_tooth_info,
  };
}

/**
 * Labels of the supporting records this code requires (PROC-7), in Setup order —
 * for a "have these on file?" prompt or a claim-attachment checklist. Empty = none.
 */
export function supportingRecordsRequired(code: ProcedureCodeRead): string[] {
  const extras = resolveProcedureCodeExtras(code);
  return PROCEDURE_CODE_EXTRA_KEYS.filter((k) => extras[k]).map((k) => PROCEDURE_CODE_EXTRA_LABELS[k].label);
}

/** Does adding this code need the Add Procedure Details pop-up? */
export function needsProcedureDetails(code: ProcedureCodeRead): boolean {
  const r = procedureRequirements(code);
  return r.tooth || r.surface || r.quadrant || r.material;
}

/** Can this code be charted on this tooth? */
export function toothAllowed(req: ProcedureRequirements, tooth: string): { allowed: boolean; reason?: string } {
  const t = tooth.trim().toUpperCase();
  if (!t) return { allowed: true };
  if (req.valid_teeth.length && !req.valid_teeth.includes(t)) return { allowed: false, reason: `Not valid for tooth ${t}` };
  if (req.tooth_area) {
    const cls = toothClass(t);
    if (cls && cls !== req.tooth_area) return { allowed: false, reason: `${req.tooth_area} code; tooth ${t} is ${cls}` };
  }
  return { allowed: true };
}

export interface ProcedureDetails {
  tooth: string;
  quadrant: string;
  /** Stored surface string (e.g. "MOD"). */
  surface: string;
  material_id: number | null;
}

/** Every rule the code demands, as user-facing messages. Empty = valid. */
export function validateProcedureDetails(code: ProcedureCodeRead, d: ProcedureDetails): string[] {
  const req = procedureRequirements(code);
  const errors: string[] = [];
  if (req.tooth && !d.tooth.trim()) errors.push('Tooth # is required');
  if (d.tooth.trim()) {
    const ok = toothAllowed(req, d.tooth);
    if (!ok.allowed) errors.push(ok.reason!);
  }
  if (req.surface) {
    const n = countSurfaces(d.surface);
    if (n < req.min_surfaces || n > req.max_surfaces) {
      errors.push(
        req.min_surfaces === req.max_surfaces
          ? `Exactly ${req.min_surfaces} surface${req.min_surfaces === 1 ? '' : 's'} required`
          : `${req.min_surfaces}–${req.max_surfaces} surfaces required`,
      );
    }
  }
  if (req.quadrant && !d.quadrant.trim()) errors.push('Quadrant is required');
  if (req.material && d.material_id == null) errors.push('Material is required');
  return errors;
}

import { toothType, archOf, type Arch, type ToothType } from './toothLayout';
import { toothAsset, assetForType } from './toothAssets';

// Dentition modes (legacy "Change Dentition"). Tooth identifiers are STRINGS —
// permanent = Universal "1".."32"; primary = letters "A".."T" — matching the
// backend chart_conditions.tooth (string). Per-tooth render metadata is resolved
// centrally here so leaf components stay numbering-agnostic.

// Dentition bands from the DENTITION AGE REFERENCE table. The dropdown shows
// "<Type> (<Age Range>)" and the chart renders exactly that band's teeth.
export type DentitionMode =
  | 'new-primary'
  | 'primary-6-12'
  | 'primary-1-2'
  | 'primary-3-6'
  | 'mixed-7-10'
  | 'mixed-11-16'
  | 'permanent-17';

export interface ToothMeta {
  type: ToothType;
  arch: Arch;
  /** Mesial surface is on the tooth's right edge (toward the midline). */
  mesialOnRight: boolean;
  /** Posterior tooth → occlusal centre; anterior → incisal. */
  posterior: boolean;
  assetSrc: string;
  primary: boolean;
}

// Permanent (Universal) — operator view.
export const PERMANENT_UPPER = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];
export const PERMANENT_LOWER = ['32', '31', '30', '29', '28', '27', '26', '25', '24', '23', '22', '21', '20', '19', '18', '17'];

// Primary (lettered). Upper A–J (patient UR→UL), lower shown UR→UL as T..K.
export const PRIMARY_UPPER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const PRIMARY_LOWER = ['T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K'];

// Mixed dentition (transitional, ~7–10 yrs) per the reference age table — a blend
// of erupting permanents (numbers) and retained primaries (letters).
export const MIXED_UPPER = ['3', 'A', 'B', 'C', '7', '8', '9', '10', 'H', 'I', 'J', '14'];
export const MIXED_LOWER = ['30', 'T', 'S', '27', '26', '25', '24', '23', '22', 'L', 'K', '19'];

// Primary letter → anatomy. Index within its 10-tooth arch drives type.
const PRIMARY_TYPE: Record<string, ToothType> = {
  A: 'molar', B: 'molar', C: 'canine', D: 'incisor', E: 'incisor', F: 'incisor', G: 'incisor', H: 'canine', I: 'molar', J: 'molar',
  K: 'molar', L: 'molar', M: 'canine', N: 'incisor', O: 'incisor', P: 'incisor', Q: 'incisor', R: 'canine', S: 'molar', T: 'molar',
};
const PRIMARY_UPPER_SET = new Set(PRIMARY_UPPER);

export function isPrimaryId(id: string): boolean {
  return /^[A-T]$/.test(id);
}

export interface DentitionBand {
  id: DentitionMode;
  label: string; // "<Type> (<Age Range>)"
  upper: string[];
  lower: string[];
}

// Each band lists exactly the teeth present (operator left→right order), per the
// DENTITION AGE REFERENCE table. Alphabetic = primary, numeric = permanent.
export const DENTITION_BANDS: DentitionBand[] = [
  { id: 'new-primary', label: 'New Primary Dentition (0–6 months)', upper: [], lower: [] },
  { id: 'primary-6-12', label: 'Primary Dentition (6–12 months)', upper: ['D', 'E', 'F', 'G'], lower: ['Q', 'P', 'O', 'N'] },
  { id: 'primary-1-2', label: 'Primary Dentition (1–2 years)', upper: ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], lower: ['S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L'] },
  { id: 'primary-3-6', label: 'Primary Dentition (3–6 years)', upper: PRIMARY_UPPER, lower: PRIMARY_LOWER },
  { id: 'mixed-7-10', label: 'Mixed Dentition (7–10 years)', upper: MIXED_UPPER, lower: MIXED_LOWER },
  {
    id: 'mixed-11-16',
    label: 'Mixed / Permanent (11–16 years)',
    upper: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
    lower: ['31', '30', '29', '28', '27', '26', '25', '24', '23', '22', '21', '20', '19', '18'],
  },
  { id: 'permanent-17', label: 'Full Permanent (17+ years)', upper: PERMANENT_UPPER, lower: PERMANENT_LOWER },
];

const BAND_BY_ID = new Map(DENTITION_BANDS.map((b) => [b.id, b]));

export function upperTeeth(mode: DentitionMode): string[] {
  return BAND_BY_ID.get(mode)?.upper ?? PERMANENT_UPPER;
}
export function lowerTeeth(mode: DentitionMode): string[] {
  return BAND_BY_ID.get(mode)?.lower ?? PERMANENT_LOWER;
}

// Which side of the dental midline a tooth sits on (for the midline divider).
export function toothSide(id: string): 'right' | 'left' {
  if (isPrimaryId(id)) {
    // Upper: A–E right, F–J left. Lower: T,S,R,Q,P right, O,N,M,L,K left.
    return 'ABCDETSRQP'.includes(id) ? 'right' : 'left';
  }
  const n = Number(id);
  // Upper right 1–8, upper left 9–16; lower left 17–24, lower right 25–32.
  if (n <= 8 || n >= 25) return 'right';
  return 'left';
}

export function toothMeta(id: string): ToothMeta {
  if (isPrimaryId(id)) {
    const type = PRIMARY_TYPE[id] ?? 'incisor';
    const upper = PRIMARY_UPPER_SET.has(id);
    const arr = upper ? PRIMARY_UPPER : PRIMARY_LOWER;
    const idx = arr.indexOf(id); // 0..9 left→right on screen
    const lateral = type === 'incisor' && (id === 'D' || id === 'G' || id === 'N' || id === 'Q');
    return {
      type,
      arch: upper ? 'upper' : 'lower',
      mesialOnRight: idx < 5,
      posterior: type === 'molar',
      assetSrc: assetForType(type, lateral),
      primary: true,
    };
  }
  const n = Number(id);
  const t = toothType(n);
  const pos = n <= 16 ? n : 33 - n;
  return {
    type: t,
    arch: archOf(n),
    mesialOnRight: pos <= 8,
    posterior: t === 'molar' || t === 'premolar',
    assetSrc: toothAsset(n),
    primary: false,
  };
}

// Auto-default the dentition band from patient age (per the reference table).
export function defaultDentition(age: number | undefined): DentitionMode {
  if (age == null) return 'permanent-17';
  if (age <= 0) return 'new-primary';
  if (age <= 2) return 'primary-1-2';
  if (age <= 6) return 'primary-3-6';
  if (age <= 10) return 'mixed-7-10';
  if (age <= 16) return 'mixed-11-16';
  return 'permanent-17';
}

// Teeth with multiple roots (multi-root prompt): permanent molars + maxillary
// 1st premolars (Universal 5, 12); primary molars.
const MULTI_ROOT_PERMANENT = new Set([1, 2, 3, 5, 12, 14, 15, 16, 17, 18, 19, 30, 31, 32]);
export function isMultiRooted(id: string): boolean {
  if (isPrimaryId(id)) return PRIMARY_TYPE[id] === 'molar';
  return MULTI_ROOT_PERMANENT.has(Number(id));
}

import { toothType, archOf, type Arch, type ToothType } from './toothLayout';
import { toothAsset, assetForType } from './toothAssets';

// Dentition modes (legacy "Change Dentition"). Tooth identifiers are STRINGS —
// permanent = Universal "1".."32"; primary = letters "A".."T" — matching the
// backend chart_conditions.tooth (string). Per-tooth render metadata is resolved
// centrally here so leaf components stay numbering-agnostic.

export type DentitionMode = 'permanent' | 'primary' | 'mixed';

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

// Primary letter → anatomy. Index within its 10-tooth arch drives type.
const PRIMARY_TYPE: Record<string, ToothType> = {
  A: 'molar', B: 'molar', C: 'canine', D: 'incisor', E: 'incisor', F: 'incisor', G: 'incisor', H: 'canine', I: 'molar', J: 'molar',
  K: 'molar', L: 'molar', M: 'canine', N: 'incisor', O: 'incisor', P: 'incisor', Q: 'incisor', R: 'canine', S: 'molar', T: 'molar',
};
const PRIMARY_UPPER_SET = new Set(PRIMARY_UPPER);

export function isPrimaryId(id: string): boolean {
  return /^[A-T]$/.test(id);
}

export function upperTeeth(mode: DentitionMode): string[] {
  return mode === 'primary' ? PRIMARY_UPPER : PERMANENT_UPPER;
}
export function lowerTeeth(mode: DentitionMode): string[] {
  return mode === 'primary' ? PRIMARY_LOWER : PERMANENT_LOWER;
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

// Auto-default dentition from patient age (legacy defaults by age).
export function defaultDentition(age: number | undefined): DentitionMode {
  if (age == null) return 'permanent';
  if (age <= 5) return 'primary';
  if (age <= 12) return 'mixed';
  return 'permanent';
}

// Teeth with multiple roots (multi-root prompt): permanent molars + maxillary
// 1st premolars (Universal 5, 12); primary molars.
const MULTI_ROOT_PERMANENT = new Set([1, 2, 3, 5, 12, 14, 15, 16, 17, 18, 19, 30, 31, 32]);
export function isMultiRooted(id: string): boolean {
  if (isPrimaryId(id)) return PRIMARY_TYPE[id] === 'molar';
  return MULTI_ROOT_PERMANENT.has(Number(id));
}

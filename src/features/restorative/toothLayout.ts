// Universal Numbering System layout + tooth classification for the restorative chart.
// Backend stores tooth/surface as snake_case strings on chart-conditions / patient-procedures.

export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';
export type Arch = 'upper' | 'lower';

// Upper arch left-to-right (patient's perspective mirrored to the operator's view: 1..16)
export const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
// Lower arch left-to-right under the upper (32..17)
export const LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17] as const;

// Classify a universal tooth number into an anatomical crown shape.
export function toothType(n: number): ToothType {
  // Mirror everything to a 1..16 "position within arch" so upper/lower share the rule.
  const pos =
    n <= 16
      ? n // upper: 1..16
      : 33 - n; // lower: 32->1, 31->2, ... 17->16
  // 1-3 molars, 4-5 premolars, 6 canine, 7-10 incisors, 11 canine, 12-13 premolars, 14-16 molars
  if (pos <= 3 || pos >= 14) return 'molar';
  if (pos === 4 || pos === 5 || pos === 12 || pos === 13) return 'premolar';
  if (pos === 6 || pos === 11) return 'canine';
  return 'incisor';
}

export function archOf(n: number): Arch {
  return n <= 16 ? 'upper' : 'lower';
}

// Surfaces. Posterior teeth (molars/premolars) have an Occlusal center; anterior
// (incisors/canines) have an Incisal edge. The 5 regions of the surface selector:
//   center, top (mesial-ish proximal differs by arch), bottom, left, right.
// We map the 4 outer + center to the canonical M/D/B(F)/L + O/I surfaces.
export type SurfaceKey = 'M' | 'D' | 'B' | 'L' | 'O' | 'I' | 'F';

export interface SurfaceDef {
  key: SurfaceKey;
  label: string;
}

export function centerSurface(n: number): SurfaceDef {
  const t = toothType(n);
  return t === 'molar' || t === 'premolar'
    ? { key: 'O', label: 'Occlusal' }
    : { key: 'I', label: 'Incisal' };
}

// Outer ring surfaces in clockwise order starting at top.
// For the facial/buccal chart, top = facial/buccal, bottom = lingual,
// and the two sides are mesial / distal (which side is mesial flips across the midline).
export function ringSurfaces(n: number): { top: SurfaceDef; right: SurfaceDef; bottom: SurfaceDef; left: SurfaceDef } {
  const t = toothType(n);
  const facial: SurfaceDef =
    t === 'incisor' || t === 'canine'
      ? { key: 'F', label: 'Facial' }
      : { key: 'B', label: 'Buccal' };
  const lingual: SurfaceDef = { key: 'L', label: 'Lingual' };
  const mesial: SurfaceDef = { key: 'M', label: 'Mesial' };
  const distal: SurfaceDef = { key: 'D', label: 'Distal' };

  // Position within arch decides which side faces the midline (mesial).
  const pos = n <= 16 ? n : 33 - n;
  const mesialOnRight = pos <= 8; // right half of the arch -> mesial points toward center (right)

  return {
    top: facial,
    bottom: lingual,
    right: mesialOnRight ? mesial : distal,
    left: mesialOnRight ? distal : mesial,
  };
}

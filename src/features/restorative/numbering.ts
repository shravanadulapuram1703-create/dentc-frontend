// Tooth-numbering systems. Our backend stores `tooth` as a Universal (1–32)
// string; this is a DISPLAY-ONLY conversion layer (FDI / Palmer) — persistence
// is unchanged. Reimplemented natively (concept inspired by the MIT
// React-Odontogram-Modul; no code copied).

export type NumberingSystem = 'UNIVERSAL' | 'FDI' | 'PALMER';

// Universal (1..32) -> FDI two-digit (ISO 3950). Index by Universal number.
const UNIVERSAL_TO_FDI: Record<number, number> = {
  1: 18, 2: 17, 3: 16, 4: 15, 5: 14, 6: 13, 7: 12, 8: 11,
  9: 21, 10: 22, 11: 23, 12: 24, 13: 25, 14: 26, 15: 27, 16: 28,
  17: 38, 18: 37, 19: 36, 20: 35, 21: 34, 22: 33, 23: 32, 24: 31,
  25: 41, 26: 42, 27: 43, 28: 44, 29: 45, 30: 46, 31: 47, 32: 48,
};

// Universal -> Palmer quadrant + position (1..8 from the midline).
const UNIVERSAL_TO_PALMER: Record<number, { quadrant: 'UR' | 'UL' | 'LL' | 'LR'; pos: number }> = {
  1: { quadrant: 'UR', pos: 8 }, 2: { quadrant: 'UR', pos: 7 }, 3: { quadrant: 'UR', pos: 6 }, 4: { quadrant: 'UR', pos: 5 },
  5: { quadrant: 'UR', pos: 4 }, 6: { quadrant: 'UR', pos: 3 }, 7: { quadrant: 'UR', pos: 2 }, 8: { quadrant: 'UR', pos: 1 },
  9: { quadrant: 'UL', pos: 1 }, 10: { quadrant: 'UL', pos: 2 }, 11: { quadrant: 'UL', pos: 3 }, 12: { quadrant: 'UL', pos: 4 },
  13: { quadrant: 'UL', pos: 5 }, 14: { quadrant: 'UL', pos: 6 }, 15: { quadrant: 'UL', pos: 7 }, 16: { quadrant: 'UL', pos: 8 },
  17: { quadrant: 'LL', pos: 8 }, 18: { quadrant: 'LL', pos: 7 }, 19: { quadrant: 'LL', pos: 6 }, 20: { quadrant: 'LL', pos: 5 },
  21: { quadrant: 'LL', pos: 4 }, 22: { quadrant: 'LL', pos: 3 }, 23: { quadrant: 'LL', pos: 2 }, 24: { quadrant: 'LL', pos: 1 },
  25: { quadrant: 'LR', pos: 1 }, 26: { quadrant: 'LR', pos: 2 }, 27: { quadrant: 'LR', pos: 3 }, 28: { quadrant: 'LR', pos: 4 },
  29: { quadrant: 'LR', pos: 5 }, 30: { quadrant: 'LR', pos: 6 }, 31: { quadrant: 'LR', pos: 7 }, 32: { quadrant: 'LR', pos: 8 },
};

export function toFdi(universal: number): number | null {
  return UNIVERSAL_TO_FDI[universal] ?? null;
}

export function toPalmer(universal: number): string {
  const p = UNIVERSAL_TO_PALMER[universal];
  return p ? `${p.quadrant}${p.pos}` : String(universal);
}

/** Display label for a Universal tooth number under the chosen system. */
export function toothLabel(universal: number, system: NumberingSystem): string {
  switch (system) {
    case 'FDI':
      return String(toFdi(universal) ?? universal);
    case 'PALMER':
      return toPalmer(universal);
    case 'UNIVERSAL':
    default:
      return String(universal).padStart(2, '0');
  }
}

export const NUMBERING_LABELS: Record<NumberingSystem, string> = {
  UNIVERSAL: 'Universal',
  FDI: 'FDI',
  PALMER: 'Palmer',
};

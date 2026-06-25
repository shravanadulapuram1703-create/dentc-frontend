import type { ToothGlyph } from './chartModel';

// Pure (no-JSX) logic shared by the chart, the surface wheel, and the legend:
// which procedures paint an area-fill pattern, and the <pattern> ids to use.
// Colour is by SOURCE (blue/green/red); the pattern is by procedure type.

export type FillKind = 'hatch' | 'hound' | 'dots' | 'solid' | 'vert' | 'horiz' | 'diag' | 'checker';

export const norm = (code: string) => code.toUpperCase();
export const hex = (color: string) => color.replace('#', '');

// Every code that draws an explicit symbol mark on the tooth (mirrors the regexes
// in chartGlyphs CrownMarks/RootMarks/WholeMarks + the Watch arrow overlay). Kept
// conservative: a code we're unsure about is treated as UNDEFINED → solid fill,
// so it stays visible rather than invisible.
const SYMBOL_RE = /(DECAY|CARIES|CHIP|CRACK|FRACTURE|BROKEN|ABRASION|EROSION|BRUXISM|LESION|FLUOROSIS|DEMINERAL|HYPOCALC|HYPOPLASIA|GEMINATION|FUSED|FUSION|DISCOLOR|STAIN|CONCUSSION|TRAUMA|PINS|PARAPULPAL|PARTIALLY_ERUPT|ANKYLOSIS|ECTOPIC|ROTATED|PERICORONITIS|OPEN_MARGIN|ORTHO|BRACES|SPLINT|SPACER|INTRUSION|ERUPT|IMPACT|DRIFT|TIPPED|RCT|ROOT_CANAL|ENDO|GUTTA|INFECTION|PARL|ABSCESS|PERIAPICAL|FISTULA|APICO|RESORPTION|ROOT_TIP|PULP_STONE|EXTRACT|REMOVAL|AVULSION|CONGEN|LOOSE|RETAINED|MISSING|IMPLANT|WATCH)/;

/** True when a code has no defined pattern fill and no defined symbol → render solid. */
export function isUnknownCode(code: string): boolean {
  const c = norm(code);
  if (c === 'NOTE' || c === 'PRIMARY') return false; // metadata, not drawn
  return !segmentFill(c) && !SYMBOL_RE.test(c);
}

/** Which area-fill (if any) a code paints across its whole segment. */
export function segmentFill(code: string): FillKind | null {
  const c = norm(code);
  if (/BRIDGE/.test(c)) return 'hatch';            // bridge → cross-hatch
  if (/(CROWN|THREE_QUARTER)/.test(c)) return 'hound'; // crown (gold) → houndstooth
  if (/CLASS_V/.test(c)) return 'hound';           // Class V metal → houndstooth
  if (/(RESTORATION|FILLING|SEALANT)/.test(c)) return 'dots'; // filling → polka dots
  if (/DENTURE/.test(c)) return 'solid';           // denture → solid block
  return null; // everything else is a symbol-only mark (no full-segment fill)
}

/** Pattern fill url for a code+colour, or null if the code is symbol-only. */
export function segmentFillUrl(uid: string, code: string, color: string): string | null {
  const kind = segmentFill(code);
  if (!kind) return null;
  if (kind === 'solid') return color;
  return `url(#${uid}-${kind}-${hex(color)})`;
}

/** Distinct (kind,colour) pairs needed to render a set of glyphs → emit defs. */
export function fillDefsFor(glyphs: Iterable<ToothGlyph>): { kind: FillKind; color: string }[] {
  const seen = new Set<string>();
  const out: { kind: FillKind; color: string }[] = [];
  for (const g of glyphs) {
    const kind = segmentFill(g.code);
    if (!kind || kind === 'solid') continue;
    const key = `${kind}-${g.color}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, color: g.color });
  }
  return out;
}

/** Surface-wedge fill for a charted surface condition: pattern url, solid colour, or null. */
export function surfaceFillUrl(uid: string, code: string, color: string): string | null {
  const c = norm(code);
  const kind = segmentFill(c);
  if (kind && kind !== 'solid') return `url(#${uid}-${kind}-${hex(color)})`;
  return color; // DECAY / DENTURE / SEALANT and other surfaces fill solid
}

/** Which fill pattern defs a set of {code,color} surface marks need. */
export function surfaceFillDefs(marks: Iterable<{ code: string; color: string }>): { kind: FillKind; color: string }[] {
  const seen = new Set<string>();
  const out: { kind: FillKind; color: string }[] = [];
  for (const m of marks) {
    const kind = segmentFill(m.code);
    if (!kind || kind === 'solid') continue;
    const key = `${kind}-${m.color}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, color: m.color });
  }
  return out;
}

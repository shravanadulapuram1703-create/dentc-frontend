// Multi-tooth entry: pick one procedure code once and apply it to many teeth
// ("D7140 on 7–23"). This is a UI convenience ONLY — every screen still saves
// one separate record per tooth (patient-procedures / treatment-plan-items /
// appointment-procedures), so the ledger, claims and the chart see individual
// rows exactly as if each tooth had been entered by hand. Backend asks for an
// atomic bulk create live in docs/procedures/multi_tooth_entry_backend_devreport.md.

// Universal numbering in its natural running order (the order "7-23" counts in):
// permanent 1..32, primary A..T, supernumerary 51..82 and AS..TS.
const PERMANENT = Array.from({ length: 32 }, (_, i) => String(i + 1));
const PRIMARY = 'ABCDEFGHIJKLMNOPQRST'.split('');
const SUPER_PERMANENT = Array.from({ length: 32 }, (_, i) => String(i + 51));
const SUPER_PRIMARY = PRIMARY.map((t) => `${t}S`);

/** Each sequence a range may run inside; a range never crosses dentitions. */
const SEQUENCES: readonly (readonly string[])[] = [PERMANENT, PRIMARY, SUPER_PERMANENT, SUPER_PRIMARY];

const ORDER = new Map<string, number>(SEQUENCES.flatMap((seq, s) => seq.map((t, i) => [t, s * 100 + i] as const)));

/** Canonical form of a typed tooth id ("07" → "7", "a" → "A"); null when it is not a tooth. */
export function normalizeTooth(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const canon = /^\d+$/.test(t) ? String(Number(t)) : t;
  return ORDER.has(canon) ? canon : null;
}

/** Sort teeth in Universal running order (1..32, A..T, 51..82, AS..TS), de-duplicated. */
export function sortTeeth(teeth: readonly string[]): string[] {
  return [...new Set(teeth)].sort((a, b) => (ORDER.get(a) ?? 1e6) - (ORDER.get(b) ?? 1e6) || a.localeCompare(b));
}

/**
 * Every tooth from `from` to `to` inclusive, either direction ("23".."7" works).
 * Teeth from different dentitions (e.g. "3".."C") are not a range — just the two ends.
 */
export function toothRange(from: string, to: string): string[] {
  for (const seq of SEQUENCES) {
    const a = seq.indexOf(from);
    const b = seq.indexOf(to);
    if (a >= 0 && b >= 0) return seq.slice(Math.min(a, b), Math.max(a, b) + 1);
  }
  return sortTeeth([from, to]);
}

/**
 * Parse what a user types in a Tooth# box: "7-23", "2, 4, 6-8", "A-E 30".
 * Returns the teeth in running order plus any tokens that are not teeth.
 */
export function parseToothList(text: string): { teeth: string[]; invalid: string[] } {
  const teeth: string[] = [];
  const invalid: string[] = [];
  // Normalise "7 - 23" / "7–23" / "7 to 23" to "7-23" before splitting on separators.
  const cleaned = text.replace(/\s*(?:[-–—]|\bto\b|\.\.)\s*/gi, '-');
  for (const token of cleaned.split(/[\s,;]+/).filter(Boolean)) {
    const parts = token.split('-');
    if (parts.length === 1) {
      const t = normalizeTooth(parts[0]!);
      if (t) teeth.push(t);
      else invalid.push(token);
    } else if (parts.length === 2) {
      const a = normalizeTooth(parts[0]!);
      const b = normalizeTooth(parts[1]!);
      if (a && b) teeth.push(...toothRange(a, b));
      else invalid.push(token);
    } else {
      invalid.push(token);
    }
  }
  return { teeth: sortTeeth(teeth), invalid };
}

/** Compact display: ["7","8",…,"23"] → "7-23"; ["2","4","5","6"] → "2, 4-6". */
export function formatToothList(teeth: readonly string[]): string {
  const sorted = sortTeeth(teeth);
  const out: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && ORDER.has(sorted[j]!) && ORDER.get(sorted[j + 1]!) === ORDER.get(sorted[j]!)! + 1) j += 1;
    // Two neighbours read better as "7, 8" than "7-8"; three or more collapse.
    if (j - i >= 2) out.push(`${sorted[i]}-${sorted[j]}`);
    else for (let k = i; k <= j; k += 1) out.push(sorted[k]!);
    i = j + 1;
  }
  return out.join(', ');
}

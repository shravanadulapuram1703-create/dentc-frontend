// ============================================================================
// Charting setup — FE-static presentation catalogs + helpers (no components).
//
// The legacy Denticon "Charting" setup screens drive the chart renderer with two
// fixed catalogs that are *presentation*, not business data:
//   • a named-colour palette (stroke/fill dropdowns on Restorative Colors)
//   • a fill-pattern catalog (the Sample dropdown on Restorative Materials)
// Per the backend dev report (CHART-2b / CHART-3c) these stay FE-owned: the API
// only ever stores the chosen *string* (a CSS colour name / a pattern key).
// Render components live in chartingSwatches.tsx.
// ============================================================================

// Colour palette — values are HTML/CSS named colours, used verbatim as the
// stored string AND as the CSS colour for the swatch. Matches the legacy set
// (Blue, Firebrick, DarkGreen, HotPink, SpringGreen, …) plus common extras.
export const CHART_COLOR_PALETTE = [
  "Black",
  "Blue",
  "Brown",
  "DarkGreen",
  "Firebrick",
  "Gray",
  "Green",
  "HotPink",
  "LightGreen",
  "Maroon",
  "Navy",
  "Orange",
  "Pink",
  "Purple",
  "Red",
  "SpringGreen",
  "Teal",
  "White",
  "Yellow",
] as const;

// Fill-pattern catalog — keys mirror the legacy Sample dropdown. The API stores
// the key string in `chart_materials.pattern`; the preview is drawn on the FE.
export const CHART_PATTERN_CATALOG = [
  { key: "hash", label: "hash" },
  { key: "round", label: "round" },
  { key: "r5hash", label: "r5hash" },
  { key: "r6hash", label: "r6hash" },
  { key: "r2hash", label: "r2hash" },
  { key: "r4hash", label: "r4hash" },
  { key: "round1", label: "round1" },
  { key: "crosshatch", label: "crosshatch" },
  { key: "r3hash", label: "r3hash" },
  { key: "sealant", label: "sealant" },
  { key: "veneer", label: "veneer" },
] as const;

export type ChartPatternKey = (typeof CHART_PATTERN_CATALOG)[number]["key"];

// ----------------------------------------------------------------------------
// Perio Setup Templates — Auto Advance Direction.
//
// The legacy "Perio Setup Templates" screen has an 8-row "Auto Advance
// Direction" grid; each region is a two-way toggle between a forward and a
// reverse tooth-number sweep. The backend stores these in
// `perio_chart_templates.auto_advance` as a JSON object keyed by region (see
// backend dev report CHART-1) — value is the chosen direction string ("01-08").
// The region structure itself is FE-owned presentation.
// ----------------------------------------------------------------------------
export interface PerioRegion {
  key: string; // auto_advance JSON key, e.g. "ur_facial"
  label: string; // "UR Facial"
  forward: string; // option A, e.g. "01-08"
  reverse: string; // option B, e.g. "08-01"
}

export const PERIO_AUTO_ADVANCE_REGIONS: PerioRegion[] = [
  { key: "ur_facial", label: "UR Facial", forward: "01-08", reverse: "08-01" },
  { key: "ul_facial", label: "UL Facial", forward: "09-16", reverse: "16-09" },
  { key: "ul_lingual", label: "UL Lingual", forward: "16-09", reverse: "09-16" },
  { key: "ur_lingual", label: "UR Lingual", forward: "08-01", reverse: "01-08" },
  { key: "ll_facial", label: "LL Facial", forward: "17-24", reverse: "24-17" },
  { key: "lr_facial", label: "LR Facial", forward: "25-32", reverse: "32-25" },
  { key: "lr_lingual", label: "LR Lingual", forward: "32-25", reverse: "25-32" },
  { key: "ll_lingual", label: "LL Lingual", forward: "24-17", reverse: "17-24" },
];

// Default direction for every region (the forward sweep) — used when seeding a
// brand-new template's auto_advance object.
export const PERIO_DEFAULT_AUTO_ADVANCE: Record<string, string> = Object.fromEntries(
  PERIO_AUTO_ADVANCE_REGIONS.map((r) => [r.key, r.forward]),
);

// Numeric options for the Template Info level dropdowns (pocket depth, CAL, …).
export const PERIO_LEVEL_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12

// "01-08" -> "(01 - 08)" for display.
export function fmtDirection(value: string): string {
  return `(${value.replace("-", " - ")})`;
}

// Shared date formatter (matches ExplosionCodeSetup / ProcedureCodeSetup).
export function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

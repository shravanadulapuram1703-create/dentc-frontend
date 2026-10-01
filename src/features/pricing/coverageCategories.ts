// Legacy CDT-range → coverage-category map (moved from the retired coverageResolver).
//
// This is NOT charge pricing (the server owns that now); it is a UI helper the
// Insurance Plan coverage-setup grid (CoverageStep) uses to suggest which
// category a code falls under. Kept as a standalone table.

/** Legacy coverage categories, most specific ranges first. */
const CDT_CATEGORIES: { cat: string; label: string; ranges: [string, string][] }[] = [
  { cat: '01B', label: 'Diagnostic: Panoramic X-Rays', ranges: [['D0330', 'D0330']] },
  { cat: '01C', label: 'Diagnostic: X-Rays - PAs', ranges: [['D0220', 'D0230']] },
  { cat: '01D', label: 'Diagnostic: X-Rays - Bitewings', ranges: [['D0270', 'D0277']] },
  { cat: '01E', label: 'Diagnostic: X-Rays - Cone Beam', ranges: [['D0364', 'D0368'], ['D0380', 'D0386']] },
  { cat: '01A', label: 'Diagnostic: X-Rays', ranges: [['D0210', 'D0399']] },
  { cat: '02A', label: 'Preventive: Sealants', ranges: [['D1351', 'D1353']] },
  { cat: '02B', label: 'Preventive: Space Maint', ranges: [['D1510', 'D1575']] },
  { cat: '03A', label: 'Restorative: Crowns', ranges: [['D2710', 'D2799']] },
  { cat: '03B', label: 'Restorative: Build Up', ranges: [['D2950', 'D2954']] },
  { cat: '04A', label: 'Endodontics: Molar', ranges: [['D3330', 'D3330'], ['D3348', 'D3348'], ['D3353', 'D3353']] },
  { cat: '05A', label: 'Periodontics: Osseous Surgery', ranges: [['D4260', 'D4261']] },
  { cat: '05B', label: 'Periodontics: Arestin', ranges: [['D4381', 'D4381']] },
  { cat: '06A', label: 'Oral Surgery: Impactions', ranges: [['D7220', 'D7241']] },
  { cat: '09A', label: 'Implants: Crowns', ranges: [['D6055', 'D6094']] },
  { cat: '11A', label: 'Gen Adjunctive: Anesthesia', ranges: [['D9210', 'D9248']] },
  { cat: '11B', label: 'Gen Adjunctive: Biteguard/Nightguard', ranges: [['D9940', 'D9944']] },
  { cat: '01', label: 'Diagnostic', ranges: [['D0100', 'D0999']] },
  { cat: '02', label: 'Preventive', ranges: [['D1000', 'D1999']] },
  { cat: '07', label: 'Prosthodontics (fix/rem), Inlays, Onlays', ranges: [['D2510', 'D2664'], ['D5000', 'D5899'], ['D6200', 'D6999']] },
  { cat: '03', label: 'Restorative', ranges: [['D2000', 'D2999']] },
  { cat: '04', label: 'Endodontics', ranges: [['D3000', 'D3999']] },
  { cat: '05', label: 'Periodontics', ranges: [['D4000', 'D4999']] },
  { cat: '08', label: 'Maxillofacial Prosthetics', ranges: [['D5900', 'D5999']] },
  { cat: '09', label: 'Implants', ranges: [['D6000', 'D6199']] },
  { cat: '06', label: 'Oral Surgery', ranges: [['D7000', 'D7999']] },
  { cat: '10', label: 'Orthodontics', ranges: [['D8000', 'D8999']] },
  { cat: '11', label: 'Gen Adjunctive', ranges: [['D9000', 'D9999']] },
];

const ADA_CODE = /^D\d{4}/i;

/** Normalise an ADA code for range comparison: upper-case, first 5 chars. */
function adaKey(code: string): string | null {
  const m = ADA_CODE.exec(code.trim().toUpperCase());
  return m ? m[0] : null;
}

/** Legacy coverage category codes an ADA code belongs to, most specific first. */
export function coverageCategoriesFor(procedure_code: string): { cat: string; label: string }[] {
  const key = adaKey(procedure_code);
  if (!key) return [];
  return CDT_CATEGORIES.filter((c) => c.ranges.some(([lo, hi]) => key >= lo && key <= hi)).map(
    ({ cat, label }) => ({ cat, label }),
  );
}

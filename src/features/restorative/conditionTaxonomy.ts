import type { ToothArea } from './types';

// Full-parity condition taxonomy for the restorative chart. Each code persists
// to chart_conditions.condition_code; `area` maps to chart_conditions.area;
// material-aware codes prompt a chart_materials pick (-> material_id); grade-aware
// codes carry a grade (mobility m1/m2/m3) encoded via chartModel. Reimplemented
// natively from the MIT React-Odontogram-Modul feature set (no code copied).

export interface ConditionDef {
  code: string;
  label: string;
  area: ToothArea;
  drawable: boolean;
  color?: string;
  /** Prompts the material picker (crown/filling/bridge) -> material_id. */
  material_aware?: boolean;
  /** Carries a grade value (e.g. mobility m1/m2/m3). */
  grade_aware?: boolean;
  /** Default classification bucket if applied outside an explicit tab. */
  chart_as_default?: 'pre-existing' | 'completed' | 'tx-plan';
}

const RED = '#d23b3b';
const PINK = '#e879a6';
const BLUE = '#2f7ff0';
const GREEN = '#2f9e44';
const GOLD = '#cda434';
const GREY = '#7a7a7a';

// ---- Whole-tooth ----------------------------------------------------------
const WHOLE: ConditionDef[] = [
  { code: 'MISSING', label: 'Missing', area: 'whole', drawable: true, color: GREY },
  { code: 'MISSING_CLOSED', label: 'Missing (Space Closed)', area: 'whole', drawable: true, color: GREY },
  { code: 'IMPLANT', label: 'Implant', area: 'whole', drawable: true, color: BLUE, material_aware: true, chart_as_default: 'completed' },
  { code: 'PRIMARY', label: 'Primary (Deciduous)', area: 'whole', drawable: false },
  { code: 'BROKEN_TOOTH', label: 'Broken Tooth', area: 'whole', drawable: true, color: RED },
  { code: 'BRACES', label: 'Braces', area: 'whole', drawable: true, color: BLUE },
  { code: 'CALCULUS', label: 'Calculus', area: 'whole', drawable: false },
  { code: 'INFLAMMATION', label: 'Inflammation', area: 'whole', drawable: false },
  { code: 'PARODONTAL', label: 'Parodontal', area: 'whole', drawable: false },
  { code: 'MOBILITY', label: 'Mobility', area: 'whole', drawable: true, color: RED, grade_aware: true },
  { code: 'DRIFT_MESIAL', label: 'Drift Mesial', area: 'whole', drawable: true, color: BLUE },
  { code: 'DRIFT_DISTAL', label: 'Drift Distal', area: 'whole', drawable: true, color: BLUE },
  { code: 'IMPACTED_MESIAL', label: 'Impacted Mesial', area: 'whole', drawable: true, color: BLUE },
  { code: 'IMPACTED_DISTAL', label: 'Impacted Distal', area: 'whole', drawable: true, color: BLUE },
  { code: 'FUSED', label: 'Fused / Geminated', area: 'whole', drawable: false },
  { code: 'HYPERSENSITIVITY', label: 'Hypersensitivity', area: 'whole', drawable: false },
  { code: 'POOR_MARGIN', label: 'Poor Margin Integrity', area: 'whole', drawable: false },
  { code: 'RECESSION', label: 'Recession', area: 'whole', drawable: false },
  { code: 'SPACER', label: 'Spacer', area: 'whole', drawable: true, color: BLUE },
  { code: 'SPLINT', label: 'Splint', area: 'whole', drawable: true, color: BLUE },
  { code: 'BRIDGE_PILLAR', label: 'Bridge Pillar', area: 'whole', drawable: true, color: GOLD, material_aware: true },
  { code: 'BRIDGE_PONTIC', label: 'Bridge Pontic', area: 'whole', drawable: true, color: GOLD, material_aware: true },
  { code: 'EXTRACTION', label: 'Extraction', area: 'whole', drawable: true, color: RED },
  { code: 'SQUARE_MESIAL', label: 'Square Mesial Root', area: 'whole', drawable: true, color: BLUE },
  { code: 'SQUARE_DISTAL', label: 'Square Distal Root', area: 'whole', drawable: true, color: BLUE },
  { code: 'SQUARE_MIDDLE', label: 'Square Middle Root', area: 'whole', drawable: true, color: BLUE },
  { code: 'ANKYLOSIS', label: 'Ankylosis', area: 'whole', drawable: true, color: BLUE },
  { code: 'AVULSION', label: 'Avulsion', area: 'whole', drawable: true, color: RED },
  { code: 'CONCUSSION', label: 'Concussion', area: 'whole', drawable: true, color: GREY },
  { code: 'CONGENITALLY_MISSING', label: 'Congenitally Missing', area: 'whole', drawable: true, color: RED },
  { code: 'ECTOPIC_ERUPTION', label: 'Ectopic Eruption', area: 'whole', drawable: true, color: BLUE },
  { code: 'GEMINATION', label: 'Gemination', area: 'whole', drawable: true, color: BLUE },
  { code: 'INTRUSION', label: 'Intrusion', area: 'whole', drawable: true, color: RED },
  { code: 'LOOSE_TOOTH', label: 'Loose Tooth', area: 'whole', drawable: true, color: RED },
  { code: 'PARTIALLY_ERUPTED', label: 'Partially Erupted', area: 'whole', drawable: true, color: BLUE },
  { code: 'PERICORONITIS', label: 'Pericoronitis', area: 'whole', drawable: true, color: RED },
  { code: 'RETAINED_ROOT', label: 'Retained Root', area: 'whole', drawable: true, color: BLUE },
  { code: 'ROTATED_MESIAL', label: 'Rotated Mesial', area: 'whole', drawable: true, color: BLUE },
  { code: 'ROTATED_DISTAL', label: 'Rotated Distal', area: 'whole', drawable: true, color: BLUE },
  { code: 'TRAUMA', label: 'Trauma', area: 'whole', drawable: true, color: RED },
];

// ---- Crown ----------------------------------------------------------------
const CROWN: ConditionDef[] = [
  { code: 'CROWN', label: 'Crown', area: 'crown', drawable: true, color: BLUE, material_aware: true },
  { code: 'CROWN_NEEDED', label: 'Crown Needed', area: 'crown', drawable: true, color: BLUE, chart_as_default: 'tx-plan' },
  { code: 'CROWN_REPLACE', label: 'Crown — Replace', area: 'crown', drawable: true, color: BLUE, chart_as_default: 'tx-plan' },
  { code: 'THREE_QUARTER', label: 'Three-Quarter Crown', area: 'crown', drawable: true, color: BLUE, material_aware: true },
  { code: 'MISSING_CROWN', label: 'Missing Crown', area: 'crown', drawable: true, color: GREY },
  { code: 'ABRASION', label: 'Abrasion', area: 'crown', drawable: true, color: PINK },
  { code: 'CHIPPED', label: 'Chipped / Fractured', area: 'crown', drawable: true },
  { code: 'CRACKED', label: 'Cracked Surface', area: 'crown', drawable: true },
  { code: 'DECAY', label: 'Decay', area: 'crown', drawable: true },
  { code: 'INCIPIENT_DECAY', label: 'Incipient Decay', area: 'crown', drawable: true },
  { code: 'NONFUNCTIONAL_DECAY', label: 'Non-Functional Decay', area: 'crown', drawable: true },
  { code: 'RECURRENT_DECAY', label: 'Recurrent Decay', area: 'crown', drawable: true },
  { code: 'LESIONS', label: 'Lesions', area: 'crown', drawable: true, color: PINK },
  { code: 'SUB_ERUPTED', label: 'Sub-Erupted', area: 'crown', drawable: true, color: BLUE },
  { code: 'SUPER_ERUPTED', label: 'Super-Erupted', area: 'crown', drawable: true, color: BLUE },
  { code: 'TIPPED_FACIAL', label: 'Tipped Facial', area: 'crown', drawable: true, color: BLUE },
  { code: 'TIPPED_LINGUAL', label: 'Tipped Lingual', area: 'crown', drawable: true, color: BLUE },
  { code: 'TOOTHBRUSH_EROSION', label: 'Toothbrush Erosion', area: 'crown', drawable: true, color: PINK },
  { code: 'BRUXISM_WEAR', label: 'Bruxism Wear', area: 'crown', drawable: true, color: PINK },
  { code: 'BRUXISM_NECK_WEAR', label: 'Bruxism Neck Wear', area: 'crown', drawable: true, color: PINK },
  { code: 'THREE_QUARTER_CROWN', label: '3/4 Crown', area: 'crown', drawable: true, color: GOLD, material_aware: true },
  { code: 'CHIPPED_H', label: 'Chipped / Fractured (H)', area: 'crown', drawable: true },
  { code: 'DEMINERALIZATION', label: 'Demineralization / White Spots', area: 'crown', drawable: true, color: BLUE },
  { code: 'DISCOLORATION', label: 'Discoloration', area: 'crown', drawable: true, color: GREY },
  { code: 'FLUOROSIS', label: 'Fluorosis', area: 'crown', drawable: true, color: GOLD },
  { code: 'HYPOCALCIFICATION', label: 'Hypocalcification', area: 'crown', drawable: true, color: GOLD },
  { code: 'HYPOPLASIA', label: 'Hypoplasia', area: 'crown', drawable: true, color: BLUE },
  { code: 'PINS', label: 'Pins', area: 'crown', drawable: true, color: GREEN },
  { code: 'PRE_ERUPTIVE_CARIES', label: 'Pre-Eruptive Caries', area: 'crown', drawable: true, color: PINK },
  { code: 'STAIN', label: 'Stain', area: 'crown', drawable: true, color: GOLD },
  { code: 'OPEN_MARGIN_MESIAL', label: 'Open Margin Mesial', area: 'crown', drawable: true, color: BLUE },
  { code: 'OPEN_MARGIN_DISTAL', label: 'Open Margin Distal', area: 'crown', drawable: true, color: BLUE },
];

// ---- Root -----------------------------------------------------------------
const ROOT: ConditionDef[] = [
  { code: 'RCT', label: 'Root Canal (Endo Filling)', area: 'root', drawable: true, color: RED },
  { code: 'ENDO_MEDICAL_FILLING', label: 'Endo Medical Filling', area: 'root', drawable: true, color: RED },
  { code: 'ABSCESS', label: 'Abscess', area: 'root', drawable: true, color: RED },
  { code: 'APICOECTOMY', label: 'Apicoectomy', area: 'root', drawable: true, color: RED },
  { code: 'ROOT_TIP', label: 'Root Tip', area: 'root', drawable: true, color: RED },
  { code: 'ROOT_FRACTURE', label: 'Root Fracture', area: 'root', drawable: true, color: RED },
  { code: 'ROOT_RESORPTION', label: 'Root Resorption', area: 'root', drawable: true, color: RED },
  { code: 'PERIAPICAL_LESION', label: 'Periapical Lesion', area: 'root', drawable: true, color: PINK },
  { code: 'GUTTA_PERCHA', label: 'Gutta-Percha', area: 'root', drawable: true, color: RED },
  { code: 'PULP_INFLAM', label: 'Pulp Inflammation', area: 'root', drawable: false },
  { code: 'PARAPULPAL_PIN', label: 'Parapulpal Pin', area: 'root', drawable: true, color: GREEN },
  { code: 'INFECTION', label: 'Infection', area: 'root', drawable: true, color: RED },
  { code: 'SQUARE_MESIAL', label: 'Square Mesial', area: 'root', drawable: true, color: BLUE },
  { code: 'SQUARE_DISTAL', label: 'Square Distal', area: 'root', drawable: true, color: BLUE },
  { code: 'SQUARE_MIDDLE', label: 'Square Middle', area: 'root', drawable: true, color: BLUE },
  { code: 'FISTULA', label: 'Fistula', area: 'root', drawable: true, color: RED },
  { code: 'PARL', label: 'PARL (Periapical Radiolucency)', area: 'root', drawable: true, color: RED },
  { code: 'PULP_STONES', label: 'Pulp Stones', area: 'root', drawable: true, color: GREY },
  { code: 'RESORPTION_INTERNAL', label: 'Resorption Internal', area: 'root', drawable: true, color: RED },
  { code: 'RESORPTION_EXTERNAL', label: 'Resorption External', area: 'root', drawable: true, color: RED },
];

// ---- Surface --------------------------------------------------------------
const SURFACE: ConditionDef[] = [
  { code: 'FILLING', label: 'Filling / Restoration', area: 'surface', drawable: true, color: BLUE, material_aware: true, chart_as_default: 'completed' },
  { code: 'DECAY', label: 'Decay', area: 'surface', drawable: true },
  { code: 'INCIPIENT_DECAY', label: 'Incipient Decay', area: 'surface', drawable: true },
  { code: 'RECURRENT_DECAY', label: 'Recurrent Decay', area: 'surface', drawable: true },
  { code: 'CHIPPED', label: 'Chipped / Fractured', area: 'surface', drawable: true },
  { code: 'CRACKED', label: 'Cracked', area: 'surface', drawable: true },
  { code: 'LESIONS', label: 'Lesions', area: 'surface', drawable: true, color: PINK },
  { code: 'ABRASION', label: 'Abrasion', area: 'surface', drawable: true, color: PINK },
  { code: 'TOOTHBRUSH_ABRASION', label: 'Toothbrush Abrasion', area: 'surface', drawable: true, color: PINK },
  { code: 'SEALANT', label: 'Sealant', area: 'surface', drawable: true, color: GREEN },
  { code: 'OPEN_CONTACT_MESIAL', label: 'Open Contact Mesial', area: 'surface', drawable: true, color: BLUE },
  { code: 'OPEN_CONTACT_DISTAL', label: 'Open Contact Distal', area: 'surface', drawable: true, color: BLUE },
];

// Cervical / neck (CEJ) conditions.
const JUNCTION: ConditionDef[] = [
  { code: 'RECESSION', label: 'Recession', area: 'junction', drawable: true, color: PINK },
  { code: 'ABFRACTION', label: 'Abfraction', area: 'junction', drawable: true, color: PINK },
  { code: 'CERVICAL_DECAY', label: 'Cervical Decay', area: 'junction', drawable: true },
  { code: 'CALCULUS', label: 'Calculus', area: 'junction', drawable: false },
  { code: 'CLASS_V', label: 'Class V', area: 'junction', drawable: true, color: PINK },
];

const TAXONOMY: Record<ToothArea, ConditionDef[]> = {
  whole: WHOLE,
  crown: CROWN,
  root: ROOT,
  junction: JUNCTION,
  surface: SURFACE,
};

export function conditionsForArea(area: ToothArea): ConditionDef[] {
  return TAXONOMY[area];
}

const BY_CODE = new Map<string, ConditionDef>();
for (const list of Object.values(TAXONOMY)) {
  for (const def of list) if (!BY_CODE.has(def.code)) BY_CODE.set(def.code, def);
}
// Legacy quick-palette codes kept for overlay metadata.
for (const def of [
  { code: 'DEFECTIVE', label: 'Defective', area: 'crown', drawable: true, color: RED },
  { code: 'DENTURE', label: 'Denture', area: 'whole', drawable: true, color: BLUE },
  { code: 'BRIDGE', label: 'Bridge', area: 'whole', drawable: true, color: GOLD, material_aware: true },
  { code: 'WATCH', label: 'Watch', area: 'whole', drawable: true, color: RED },
  { code: 'ERUPTED', label: 'Erupted', area: 'whole', drawable: true, color: BLUE },
  { code: 'IMPACTED', label: 'Impacted', area: 'whole', drawable: true, color: BLUE },
  { code: 'RESTORATION', label: 'Restoration', area: 'surface', drawable: true, color: BLUE, material_aware: true, chart_as_default: 'completed' },
  { code: 'DEFECTIVE', label: 'Defective', area: 'surface', drawable: true, color: RED },
  { code: 'NOTE', label: 'Note', area: 'whole', drawable: false },
] as ConditionDef[]) {
  if (!BY_CODE.has(def.code)) BY_CODE.set(def.code, def);
}

export function lookupCondition(code: string | null | undefined): ConditionDef | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

export function isMaterialAware(code: string | null | undefined): boolean {
  return !!lookupCondition(code)?.material_aware;
}
export function isGradeAware(code: string | null | undefined): boolean {
  return !!lookupCondition(code)?.grade_aware;
}

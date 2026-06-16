// Procedure Code Setup — form model + builders for the master-detail screen.
//
// Binds DIRECTLY to the backend snake_case shape (ProcedureCodeRead /
// ProcedureCodeCreate / ProcedureCodeUpdate from the generated Orval client).
// No camelCase aliases, no mapping layer. The resource is keyed by `code`
// (ProcedureCodeRead has no numeric id — the {item_id} path param is the code).

import type {
  ProcedureCodeRead,
  ProcedureCodeCreate,
  ProcedureCodeUpdate,
} from "@/api/generated/model";

export interface ProcedureCodeForm {
  // General
  code: string;
  legacy_code: string;
  description: string;
  category: string;
  default_fee: string;
  billing_order: string;
  // Scheduling / recall
  default_duration_minutes: number | null;
  recall_interval: number | null;
  recall_unit: string;
  // Status / flags
  is_active: boolean;
  is_ortho: boolean;
  requires_lab: boolean;
  // Charting (PROC-1)
  requires_tooth: boolean;
  requires_surface: boolean;
  requires_quadrant: boolean;
  chart_category: string;
  tooth_area: string;
  draw_as: string;
  min_surfaces: number | null;
  max_surfaces: number | null;
  default_material_id: number | null;
  valid_teeth: string[];
  // Billing / tax (PROC-4)
  taxable: boolean;
  sales_tax_code: string;
  visit_code: string;
  ledger_code: string;
  ar_code: string;
  is_post_op: boolean;
  exempt_from_dental_max: boolean;
  // Defaults (PROC-4)
  lock_default_provider: boolean;
  default_provider_id: string;
  default_notes_macro_id: number | null;
  show_ada_code_in_notes: boolean;
  // NHS (PROC-4)
  nhs_treatment_category: string;
  nhs_clinical_data_set: string;
}

export function emptyProcedureCodeForm(): ProcedureCodeForm {
  return {
    code: "",
    legacy_code: "",
    description: "",
    category: "",
    default_fee: "0",
    billing_order: "",
    default_duration_minutes: null,
    recall_interval: null,
    recall_unit: "",
    is_active: true,
    is_ortho: false,
    requires_lab: false,
    requires_tooth: false,
    requires_surface: false,
    requires_quadrant: false,
    chart_category: "",
    tooth_area: "",
    draw_as: "",
    min_surfaces: null,
    max_surfaces: null,
    default_material_id: null,
    valid_teeth: [],
    taxable: false,
    sales_tax_code: "",
    visit_code: "",
    ledger_code: "",
    ar_code: "",
    is_post_op: false,
    exempt_from_dental_max: false,
    lock_default_provider: false,
    default_provider_id: "",
    default_notes_macro_id: null,
    show_ada_code_in_notes: false,
    nhs_treatment_category: "",
    nhs_clinical_data_set: "",
  };
}

export function procedureCodeToForm(p: ProcedureCodeRead): ProcedureCodeForm {
  return {
    code: p.code,
    legacy_code: p.legacy_code ?? "",
    description: p.description,
    category: p.category,
    default_fee: p.default_fee ?? "0",
    billing_order: p.billing_order ?? "",
    default_duration_minutes: p.default_duration_minutes ?? null,
    recall_interval: p.recall_interval ?? null,
    recall_unit: p.recall_unit ?? "",
    is_active: Boolean(p.is_active),
    is_ortho: Boolean(p.is_ortho),
    requires_lab: Boolean(p.requires_lab),
    requires_tooth: Boolean(p.requires_tooth),
    requires_surface: Boolean(p.requires_surface),
    requires_quadrant: Boolean(p.requires_quadrant),
    chart_category: p.chart_category ?? "",
    tooth_area: p.tooth_area ?? "",
    draw_as: p.draw_as ?? "",
    min_surfaces: p.min_surfaces ?? null,
    max_surfaces: p.max_surfaces ?? null,
    default_material_id: p.default_material_id ?? null,
    valid_teeth: p.valid_teeth ?? [],
    taxable: Boolean(p.taxable),
    sales_tax_code: p.sales_tax_code ?? "",
    visit_code: p.visit_code ?? "",
    ledger_code: p.ledger_code ?? "",
    ar_code: p.ar_code ?? "",
    is_post_op: Boolean(p.is_post_op),
    exempt_from_dental_max: Boolean(p.exempt_from_dental_max),
    lock_default_provider: Boolean(p.lock_default_provider),
    default_provider_id: p.default_provider_id ?? "",
    default_notes_macro_id: p.default_notes_macro_id ?? null,
    show_ada_code_in_notes: Boolean(p.show_ada_code_in_notes),
    nhs_treatment_category: p.nhs_treatment_category ?? "",
    nhs_clinical_data_set: p.nhs_clinical_data_set ?? "",
  };
}

/** Empty string → null so we don't persist blanks into nullable text columns. */
const orNull = (s: string): string | null => {
  const t = s.trim();
  return t === "" ? null : t;
};

/** Fields shared by create + update (everything except the immutable `code`). */
function commonBody(form: ProcedureCodeForm) {
  return {
    legacy_code: orNull(form.legacy_code),
    description: form.description.trim(),
    category: form.category.trim(),
    default_fee: orNull(form.default_fee) ?? "0",
    billing_order: orNull(form.billing_order),
    default_duration_minutes: form.default_duration_minutes,
    recall_interval: form.recall_interval,
    recall_unit: orNull(form.recall_unit),
    is_active: form.is_active,
    is_ortho: form.is_ortho,
    requires_lab: form.requires_lab,
    requires_tooth: form.requires_tooth,
    requires_surface: form.requires_surface,
    requires_quadrant: form.requires_quadrant,
    chart_category: orNull(form.chart_category),
    tooth_area: orNull(form.tooth_area),
    draw_as: orNull(form.draw_as),
    min_surfaces: form.min_surfaces,
    max_surfaces: form.max_surfaces,
    default_material_id: form.default_material_id,
    valid_teeth: form.valid_teeth.length ? form.valid_teeth : null,
    taxable: form.taxable,
    sales_tax_code: orNull(form.sales_tax_code),
    visit_code: orNull(form.visit_code),
    ledger_code: orNull(form.ledger_code),
    ar_code: orNull(form.ar_code),
    is_post_op: form.is_post_op,
    exempt_from_dental_max: form.exempt_from_dental_max,
    lock_default_provider: form.lock_default_provider,
    default_provider_id: orNull(form.default_provider_id),
    default_notes_macro_id: form.default_notes_macro_id,
    show_ada_code_in_notes: form.show_ada_code_in_notes,
    nhs_treatment_category: orNull(form.nhs_treatment_category),
    nhs_clinical_data_set: orNull(form.nhs_clinical_data_set),
  };
}

export function buildProcedureCodeCreate(form: ProcedureCodeForm): ProcedureCodeCreate {
  return { code: form.code.trim(), ...commonBody(form) };
}

/** Update payload omits `code` — the primary key is immutable (it's the path param). */
export function buildProcedureCodeUpdate(form: ProcedureCodeForm): ProcedureCodeUpdate {
  return commonBody(form);
}

/** Format a numeric-string fee for display (e.g. "75" → "$75.00"). */
export function formatFee(value?: string | number | null): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Universal tooth-numbering sets for the Valid Teeth grid (permanent 1–32, primary A–T). */
export const PERMANENT_TEETH: string[] = Array.from({ length: 32 }, (_, i) => String(i + 1));
export const PRIMARY_TEETH: string[] = Array.from({ length: 20 }, (_, i) =>
  String.fromCharCode(65 + i),
);

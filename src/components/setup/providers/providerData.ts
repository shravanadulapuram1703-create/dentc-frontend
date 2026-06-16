// Provider Setup — form model.
//
// Per project convention (CLAUDE.md), the form binds DIRECTLY to the backend's
// snake_case field names — no camelCase aliases, no snake↔camel mapper. The keys
// here mirror `ProviderRead`/`ProviderUpdate` exactly so the body passes through
// to the generated client unchanged.

import type { ProviderRead, ProviderCreate, ProviderUpdate } from "@/api/generated/model";

/** Editable provider fields, keyed identically to the backend contract. */
export interface ProviderForm {
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  office_id: number | null; // primary/home office (ProviderRead.office_id, required)
  role: string;
  specialty: string;
  short_id: string;
  npi: string;
  license: string;
  tax_id: string;
  dea_id: string;
  is_active: boolean;
  // Provider settings (legacy "Provider Settings" / "Advanced Settings").
  scheduler_color: string;
  is_ortho_provider: boolean;
  visible_in_appointnow: boolean;
  default_provider_time: number | null;
  is_billing_provider: boolean;
  print_separate_claim_form: boolean;
  dosespot_user_id: string;
  updox_direct_address: string;
  denticon_user_id: string;
  ortho_questionnaire_template: string;
  custom_1: string;
  custom_2: string;
}

export function emptyProviderForm(): ProviderForm {
  return {
    name: "",
    first_name: "",
    last_name: "",
    title: "",
    office_id: null,
    role: "",
    specialty: "",
    short_id: "",
    npi: "",
    license: "",
    tax_id: "",
    dea_id: "",
    is_active: true,
    scheduler_color: "",
    is_ortho_provider: false,
    visible_in_appointnow: false,
    default_provider_time: null,
    is_billing_provider: false,
    print_separate_claim_form: false,
    dosespot_user_id: "",
    updox_direct_address: "",
    denticon_user_id: "",
    ortho_questionnaire_template: "",
    custom_1: "",
    custom_2: "",
  };
}

export function providerToForm(p: ProviderRead): ProviderForm {
  return {
    name: p.name ?? "",
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    title: p.title ?? "",
    office_id: p.office_id ?? null,
    role: p.role ?? "",
    specialty: p.specialty ?? "",
    short_id: p.short_id ?? "",
    npi: p.npi ?? "",
    license: p.license ?? "",
    tax_id: p.tax_id ?? "",
    dea_id: p.dea_id ?? "",
    is_active: p.is_active ?? true,
    scheduler_color: p.scheduler_color ?? "",
    is_ortho_provider: p.is_ortho_provider ?? false,
    visible_in_appointnow: p.visible_in_appointnow ?? false,
    default_provider_time: p.default_provider_time ?? null,
    is_billing_provider: p.is_billing_provider ?? false,
    print_separate_claim_form: p.print_separate_claim_form ?? false,
    dosespot_user_id: p.dosespot_user_id ?? "",
    updox_direct_address: p.updox_direct_address ?? "",
    denticon_user_id: p.denticon_user_id ?? "",
    ortho_questionnaire_template: p.ortho_questionnaire_template ?? "",
    custom_1: p.custom_1 ?? "",
    custom_2: p.custom_2 ?? "",
  };
}

/** Shared fields for PATCH (update) and (with id+office) POST (create). */
function commonBody(f: ProviderForm) {
  return {
    name: f.name.trim(),
    first_name: f.first_name.trim() || null,
    last_name: f.last_name.trim() || null,
    title: f.title.trim() || null,
    role: f.role.trim() || null,
    specialty: f.specialty.trim() || null,
    short_id: f.short_id.trim() || null,
    npi: f.npi.trim() || null,
    license: f.license.trim() || null,
    tax_id: f.tax_id.trim() || null,
    dea_id: f.dea_id.trim() || null,
    is_active: f.is_active,
    scheduler_color: f.scheduler_color.trim() || null,
    is_ortho_provider: f.is_ortho_provider,
    visible_in_appointnow: f.visible_in_appointnow,
    default_provider_time: f.default_provider_time,
    is_billing_provider: f.is_billing_provider,
    print_separate_claim_form: f.print_separate_claim_form,
    dosespot_user_id: f.dosespot_user_id.trim() || null,
    updox_direct_address: f.updox_direct_address.trim() || null,
    denticon_user_id: f.denticon_user_id.trim() || null,
    ortho_questionnaire_template: f.ortho_questionnaire_template.trim() || null,
    custom_1: f.custom_1.trim() || null,
    custom_2: f.custom_2.trim() || null,
  };
}
// Note: `user_id` is intentionally NOT written here — the provider↔user link is
// managed solely by the User tab via setProviderUser, so saving Info never clobbers it.

/** `ProviderUpdate` body (PATCH /providers/{id}). office_id is editable. */
export function buildProviderUpdate(f: ProviderForm): ProviderUpdate {
  return {
    office_id: f.office_id ?? null,
    ...commonBody(f),
  };
}

/**
 * `ProviderCreate` body (POST /providers). `id` is a client-supplied string on
 * this contract (gap — see provider_setup_backend_devreport.md); we derive a
 * stable slug from short_id|name + office until the backend assigns ids.
 */
export function buildProviderCreate(f: ProviderForm): ProviderCreate {
  const slug = (f.short_id.trim() || f.name.trim().replace(/\s+/g, "-").toLowerCase()) || "provider";
  return {
    id: `prov-${slug}-${f.office_id ?? "x"}`,
    office_id: f.office_id as number, // guarded by the caller (required field)
    ...commonBody(f),
  };
}

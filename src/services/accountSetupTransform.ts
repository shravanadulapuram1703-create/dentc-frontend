/**
 * Maps the real backend models (snake_case — `TenantRead` + `AccountSettingsRead`,
 * `account-info` tag) ↔ the Account Setup UI form (camelCase).
 *
 * The screen merges `fetchAccount` (tenant) + `fetchAdvancedSettings`
 * (account-settings) into one row before calling `mapAccountApiToForm`.
 *
 * A few current UI fields don't line up 1:1 with the new backend shape; these are
 * mapped best-effort and documented in ACCOUNT_INFO_BACKEND_MAPPING_v2.md:
 *   - Required-field toggles (bool) ↔ *_required_mode (enum) — derived.
 *   - xvwebEnabled / cloud9Enabled (bool) ↔ xvweb_url / cloud9_url (string) — read-only derive; not written.
 *   - patientAddressRequired / responsiblePartyRequired — no backend column (not persisted).
 */

export type LookupOption = { value: string; label: string; hex?: string; description?: string };

export function parseLookupOptions(payload: unknown): LookupOption[] {
  if (payload == null) return [];
  const raw =
    typeof payload === "object" && payload !== null && "options" in payload
      ? (payload as { options?: unknown }).options
      : Array.isArray(payload)
        ? payload
        : (payload as { data?: { options?: unknown } })?.data?.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o) => o && typeof o === "object" && (o as { is_active?: boolean }).is_active !== false)
    .map((o) => {
      const x = o as { value: string; label: string; hex?: string; description?: string };
      return { value: String(x.value), label: String(x.label ?? x.value), hex: x.hex, description: x.description };
    });
}

const modeToBool = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  return s === "required" || s === "true" || s === "yes";
};
const boolToMode = (b: unknown) => (b ? "Required" : "Not Required");

/** Merged TenantRead + AccountSettingsRead → UI form (camelCase). */
export function mapAccountApiToForm(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    // "Denticon Account #" — the external/legacy account code (read-only).
    accountNumber: String(row.legacy_id ?? row.code ?? ""),
    accountName: String(row.name ?? ""),
    accountShortId: String(row.code ?? ""),
    contactFirstName: String(row.contact_first_name ?? ""),
    contactLastName: String(row.contact_last_name ?? ""),
    corporateAddress: String(row.corporate_address_1 ?? ""),
    corporateCity: String(row.corporate_city ?? ""),
    corporateState: String(row.corporate_state ?? ""),
    corporateZip: String(row.corporate_zip ?? ""),
    statementAddress: String(row.statement_address_1 ?? ""),
    statementCity: String(row.statement_city ?? ""),
    statementState: String(row.statement_state ?? ""),
    statementZip: String(row.statement_zip ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    phone2: String(row.phone_2 ?? ""),
    cultureCode: String(row.culture_code ?? "en-US"),
    logoUrl: String(row.logo_url ?? ""),
    custom1: String(row.custom_1 ?? ""),
    custom2: String(row.custom_2 ?? ""),
    pgid: String(row.pgid ?? ""),
    oid: String(row.oid ?? ""),
    createdAt: formatDisplayTimestamp(row.created_at),
    createdBy: row.created_by != null ? String(row.created_by) : "",
    updatedAt: formatDisplayTimestamp(row.updated_at),
    updatedBy: row.updated_by != null ? String(row.updated_by) : "",
    ...mapAdvancedSnakeToCamel(row),
  };
}

/** Basic-tab payload → tenant identity (name/code) + account-settings basic fields. */
export function mapBasicFormToPutPayload(form: Record<string, unknown>) {
  return {
    // tenant identity (routed to PATCH /tenants/{id} by the service)
    name: form.accountName,
    code: form.accountShortId,
    // account-settings (routed to PATCH …/account-settings by the service)
    contact_first_name: form.contactFirstName,
    contact_last_name: form.contactLastName,
    corporate_address_1: form.corporateAddress,
    corporate_city: form.corporateCity,
    corporate_state: form.corporateState || null,
    corporate_zip: form.corporateZip,
    statement_address_1: form.statementAddress,
    statement_city: form.statementCity,
    statement_state: form.statementState || null,
    statement_zip: form.statementZip,
    email: form.email,
    phone: form.phone || null,
    phone_2: form.phone2 || null,
    culture_code: form.cultureCode || null,
    logo_url: form.logoUrl || null,
    custom_1: form.custom1 || null,
    custom_2: form.custom2 || null,
  };
}

function mapAdvancedSnakeToCamel(row: Record<string, unknown>) {
  return {
    procedureColor: String(row.procedure_color ?? "DarkGray"),
    insurancePaymentColor: String(row.insurance_payment_color ?? "Teal"),
    claimLinesColor: String(row.claim_lines_color ?? "Purple"),
    patientPaymentColor: String(row.patient_payment_color ?? "Green"),
    adjustmentColor: String(row.adjustment_color ?? "Amber"),
    statementLinesColor: String(row.statement_lines_color ?? "Blue"),
    notesLinesColor: String(row.notes_lines_color ?? "LightGray"),
    enableFullScreen: Boolean(row.enable_full_screen),
    maxTreatmentPlanDiscount: Number(row.max_treatment_plan_discount ?? 0),
    onlyShowOfficeItems: Boolean(row.only_show_office_items),
    statementCloseOutIndividual: Boolean(row.statement_close_out_individual),
    autoPostPeriodicCharges: Boolean(row.auto_post_periodic_charges),
    showFlashAlertsInsurance: Boolean(row.show_flash_alerts_insurance),
    // Backend stores a string ("YES"/"NO"); the UI control is a boolean toggle.
    pronounFieldVisible: String(row.pronoun_field_visible ?? "").toUpperCase() === "YES",
    chartingOption: String(row.charting_option ?? "modal"),
    defaultChartingTab: String(row.default_charting_tab ?? "treatment"),
    passwordExpirationDays: Number(row.password_expiration_days ?? 90),
    schedulerShowNonWorkingDays: Boolean(row.scheduler_show_non_working_days),
    defaultFeeIncreaseCode: row.default_fee_increase_code != null ? String(row.default_fee_increase_code) : "",
    defaultWriteOffCode: row.default_write_off_code != null ? String(row.default_write_off_code) : "",
    // Required-field toggles: backend uses enum modes (+ email_required bool).
    patientDobRequired: modeToBool(row.dob_required_mode),
    patientSsnRequired: modeToBool(row.ssn_required_mode),
    patientEmailRequired: Boolean(row.email_required),
    patientPhoneRequired: modeToBool(row.phone_required_mode),
    // No backend column — display only (not persisted).
    patientAddressRequired: false,
    responsiblePartyRequired: false,
    ediVendor: row.edi_vendor != null ? String(row.edi_vendor) : "",
    // bool ↔ url shape mismatch — derive presence for display (not written back).
    transworldEnabled: Boolean(row.transworld_all_offices),
    xvwebEnabled: Boolean(row.xvweb_url),
    cloud9Enabled: Boolean(row.cloud9_url),
    paymentPortalPostingOffice:
      row.payment_portal_posting_office != null ? String(row.payment_portal_posting_office) : "",
    postPaymentToResponsibleParty: Boolean(row.payment_portal_post_to_rp),
    aiAssistOrgId: row.ai_assist_org_id != null ? String(row.ai_assist_org_id) : "",
    aiAssistClientId: row.ai_assist_client_id != null ? String(row.ai_assist_client_id) : "",
    aiAssistClientSecret: "", // never returned; write-only
  };
}

export function mapAdvancedFormToPutPayload(form: Record<string, unknown>) {
  const secret = form.aiAssistClientSecret;
  const base: Record<string, unknown> = {
    procedure_color: form.procedureColor,
    insurance_payment_color: form.insurancePaymentColor,
    claim_lines_color: form.claimLinesColor,
    patient_payment_color: form.patientPaymentColor,
    adjustment_color: form.adjustmentColor,
    statement_lines_color: form.statementLinesColor,
    notes_lines_color: form.notesLinesColor,
    enable_full_screen: form.enableFullScreen,
    // Backend types this as a string (decimal serialized) — send as string, not number.
    max_treatment_plan_discount:
      form.maxTreatmentPlanDiscount != null ? String(form.maxTreatmentPlanDiscount) : null,
    only_show_office_items: form.onlyShowOfficeItems,
    statement_close_out_individual: form.statementCloseOutIndividual,
    auto_post_periodic_charges: form.autoPostPeriodicCharges,
    show_flash_alerts_insurance: form.showFlashAlertsInsurance,
    // Backend expects a string, not a boolean.
    pronoun_field_visible: form.pronounFieldVisible ? "YES" : "NO",
    charting_option: form.chartingOption,
    default_charting_tab: form.defaultChartingTab,
    password_expiration_days: form.passwordExpirationDays,
    scheduler_show_non_working_days: form.schedulerShowNonWorkingDays,
    default_fee_increase_code: form.defaultFeeIncreaseCode || null,
    default_write_off_code: form.defaultWriteOffCode || null,
    // Required-field toggles → enum modes (loses the "Any" option — see v2).
    dob_required_mode: boolToMode(form.patientDobRequired),
    ssn_required_mode: boolToMode(form.patientSsnRequired),
    phone_required_mode: boolToMode(form.patientPhoneRequired),
    email_required: form.patientEmailRequired,
    edi_vendor: form.ediVendor || null,
    transworld_all_offices: form.transworldEnabled,
    payment_portal_posting_office: form.paymentPortalPostingOffice || null,
    payment_portal_post_to_rp: form.postPaymentToResponsibleParty,
    ai_assist_org_id: form.aiAssistOrgId || null,
    ai_assist_client_id: form.aiAssistClientId || null,
  };
  // xvweb_url / cloud9_url intentionally NOT written from boolean toggles (shape
  // mismatch — see v2); patientAddressRequired / responsiblePartyRequired have no
  // backend column.
  if (typeof secret === "string" && secret.trim().length > 0) {
    base.ai_assist_client_secret = secret;
  }
  return base;
}

function formatDisplayTimestamp(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().replace("T", " ").substring(0, 19);
      }
    } catch {
      /* ignore */
    }
  }
  return s;
}

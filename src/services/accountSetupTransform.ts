/**
 * Maps API (snake_case, ACCOUNT_SETUP_DATA_DEFINITION.md) ↔ UI form (camelCase).
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

/** GET /api/accounts/:id — merged basic + optional advanced fields */
export function mapAccountApiToForm(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    accountNumber: String(row.account_number ?? ""),
    accountName: String(row.account_name ?? ""),
    accountShortId: String(row.account_short_id ?? ""),
    contactFirstName: String(row.contact_first_name ?? ""),
    contactLastName: String(row.contact_last_name ?? ""),
    corporateAddress: String(row.corporate_address ?? ""),
    corporateCity: String(row.corporate_city ?? ""),
    corporateState: String(row.corporate_state ?? ""),
    corporateZip: String(row.corporate_zip ?? ""),
    statementAddress: String(row.statement_address ?? ""),
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
    updatedAt: formatDisplayTimestamp(row.updated_at),
    updatedBy: String(row.updated_by ?? ""),
    ...mapAdvancedSnakeToCamel(row),
  };
}

export function mapBasicFormToPutPayload(form: Record<string, unknown>) {
  const out: Record<string, unknown> = {
    account_name: form.accountName,
    account_short_id: form.accountShortId,
    contact_first_name: form.contactFirstName,
    contact_last_name: form.contactLastName,
    corporate_address: form.corporateAddress,
    corporate_city: form.corporateCity,
    corporate_state: form.corporateState || null,
    corporate_zip: form.corporateZip,
    statement_address: form.statementAddress,
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
  return out;
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
    pronounFieldVisible: Boolean(row.pronoun_field_visible),
    chartingOption: String(row.charting_option ?? "modal"),
    defaultChartingTab: String(row.default_charting_tab ?? "treatment"),
    passwordExpirationDays: Number(row.password_expiration_days ?? 90),
    schedulerShowNonWorkingDays: Boolean(row.scheduler_show_non_working_days),
    defaultFeeIncreaseCode: row.default_fee_increase_code != null ? String(row.default_fee_increase_code) : "",
    defaultWriteOffCode: row.default_write_off_code != null ? String(row.default_write_off_code) : "",
    patientDobRequired: Boolean(row.patient_dob_required),
    patientSsnRequired: Boolean(row.patient_ssn_required),
    patientEmailRequired: Boolean(row.patient_email_required),
    patientPhoneRequired: Boolean(row.patient_phone_required),
    patientAddressRequired: Boolean(row.patient_address_required),
    responsiblePartyRequired: Boolean(row.responsible_party_required),
    ediVendor: row.edi_vendor != null ? String(row.edi_vendor) : "",
    transworldEnabled: Boolean(row.transworld_enabled),
    xvwebEnabled: Boolean(row.xvweb_enabled),
    cloud9Enabled: Boolean(row.cloud9_enabled),
    paymentPortalPostingOffice: row.payment_portal_posting_office != null ? String(row.payment_portal_posting_office) : "",
    postPaymentToResponsibleParty: Boolean(row.post_payment_to_responsible_party),
    aiAssistOrgId: row.ai_assist_org_id != null ? String(row.ai_assist_org_id) : "",
    aiAssistClientId: row.ai_assist_client_id != null ? String(row.ai_assist_client_id) : "",
    aiAssistClientSecret: "",
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
    max_treatment_plan_discount: form.maxTreatmentPlanDiscount,
    only_show_office_items: form.onlyShowOfficeItems,
    statement_close_out_individual: form.statementCloseOutIndividual,
    auto_post_periodic_charges: form.autoPostPeriodicCharges,
    show_flash_alerts_insurance: form.showFlashAlertsInsurance,
    pronoun_field_visible: form.pronounFieldVisible,
    charting_option: form.chartingOption,
    default_charting_tab: form.defaultChartingTab,
    password_expiration_days: form.passwordExpirationDays,
    scheduler_show_non_working_days: form.schedulerShowNonWorkingDays,
    default_fee_increase_code: form.defaultFeeIncreaseCode || null,
    default_write_off_code: form.defaultWriteOffCode || null,
    patient_dob_required: form.patientDobRequired,
    patient_ssn_required: form.patientSsnRequired,
    patient_email_required: form.patientEmailRequired,
    patient_phone_required: form.patientPhoneRequired,
    patient_address_required: form.patientAddressRequired,
    responsible_party_required: form.responsiblePartyRequired,
    edi_vendor: form.ediVendor || null,
    transworld_enabled: form.transworldEnabled,
    xvweb_enabled: form.xvwebEnabled,
    cloud9_enabled: form.cloud9Enabled,
    payment_portal_posting_office: form.paymentPortalPostingOffice || null,
    post_payment_to_responsible_party: form.postPaymentToResponsibleParty,
    ai_assist_org_id: form.aiAssistOrgId || null,
    ai_assist_client_id: form.aiAssistClientId || null,
  };
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

export function extractResponseData<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in (res as object)) {
    const d = (res as { data: unknown }).data;
    if (d && typeof d === "object" && "data" in (d as object)) {
      return (d as { data: T }).data;
    }
    return d as T;
  }
  return res as T;
}

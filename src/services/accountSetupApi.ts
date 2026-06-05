/**
 * Account Setup data access — thin typed layer over the generated Orval client.
 *
 * All Account Information endpoints are now real (`account-info` + `organization`
 * tags). This module adapts the generated functions to the stable signatures the
 * Account Setup screen + tabs already consume, so the UI is untouched.
 *
 * Legacy `/api/accounts/*` and `/api/lookup/*` paths have been fully removed.
 * Field-name mapping (snake ↔ camel) lives in accountSetupTransform.ts.
 */
import {
  getAccountSettings,
  updateAccountSettings,
  uploadAccountLogo,
  deleteAccountLogo as genDeleteAccountLogo,
  getAccountCommunications,
  updateAccountCommunications,
  verifyAccountTelecom,
  listPhoneAssignments,
  setPhoneAssignments,
  listAccountHolidays,
  createAccountHoliday,
  updateAccountHoliday,
  deleteAccountHoliday,
  bulkDeleteAccountHolidays,
  importFederalHolidays as genImportFederalHolidays,
  createHolidayRange,
  getActiveConsent,
  createAccountConsent,
} from "@/api/generated/endpoints/account-info/account-info";
import {
  getTenant,
  updateTenant,
  listOffices,
} from "@/api/generated/endpoints/organization/organization";
import api from "./api";
import { type LookupOption, parseLookupOptions } from "./accountSetupTransform";

/**
 * The app's `currentOrganization` is the display id `ORG-<tenantPk>` (see
 * AuthContext.buildAuthState). The backend `/tenants/{id}` path needs the numeric
 * tenant PK, so strip the `ORG-` prefix. Accepts a bare numeric string too.
 */
const numericAccountId = (accountId: string): string => String(accountId ?? "").replace(/^ORG-/i, "");
const tid = (accountId: string): number => Number(numericAccountId(accountId));

// ----------------------------------------------------------------------------
// BASIC (tenant) + ADVANCED (account-settings)
// ----------------------------------------------------------------------------

/** Tenant identity (name/code/is_active/legacy_id). Merged with advanced settings by the screen. */
export async function fetchAccount(accountId: string): Promise<Record<string, unknown>> {
  const t = await getTenant(tid(accountId));
  return (t ?? {}) as unknown as Record<string, unknown>;
}

/** Account-settings blob (everything beyond tenant identity). */
export async function fetchAdvancedSettings(accountId: string): Promise<Record<string, unknown>> {
  try {
    const s = await getAccountSettings(tid(accountId));
    return (s ?? {}) as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Basic-tab save. `body` (snake_case) carries tenant identity (name/code) plus
 * account-settings fields; we route each to the correct endpoint.
 */
export async function updateAccount(accountId: string, body: Record<string, unknown>) {
  const id = tid(accountId);
  const { name, code, is_active, ...settings } = body as {
    name?: unknown;
    code?: unknown;
    is_active?: unknown;
    [k: string]: unknown;
  };

  const tenantPatch: Record<string, unknown> = {};
  if (name !== undefined) tenantPatch.name = name;
  if (code !== undefined) tenantPatch.code = code;
  if (is_active !== undefined) tenantPatch.is_active = is_active;
  if (Object.keys(tenantPatch).length > 0) {
    await updateTenant(id, tenantPatch as never);
  }

  if (Object.keys(settings).length > 0) {
    await updateAccountSettings(id, settings as never);
  }
  return { ok: true };
}

/** Advanced-tab save → account-settings PATCH. */
export async function updateAdvancedSettings(accountId: string, body: Record<string, unknown>) {
  return updateAccountSettings(tid(accountId), body as never);
}

export async function deleteAccountLogo(accountId: string) {
  await genDeleteAccountLogo(tid(accountId));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const meta = parts[0] ?? "";
  const b64 = parts[1] ?? "";
  const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Logo upload — backend expects multipart `file`; convert the data-URL preview to a Blob. */
export async function uploadAccountLogoDataUrl(accountId: string, dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], "logo.png", { type: blob.type });
  return uploadAccountLogo(tid(accountId), { file });
}

// ----------------------------------------------------------------------------
// LOOKUPS
// ----------------------------------------------------------------------------
// Office-backed lookups are real (/api/v1/offices). The remaining
// definition-backed lookups (states, cultures, colors, charting options, EDI
// vendors, business types, etc.) have no backend lookup endpoint / seeded
// `definitions` group_codes yet — see ACCOUNT_INFO_BACKEND_MAPPING_v2.md gap L1.
// They return [] (graceful empty) rather than hitting non-existent routes.

const officeOptions = async (): Promise<LookupOption[]> => {
  try {
    const res = await listOffices({ size: 200 });
    return (res.items ?? []).map((o) => ({ value: String(o.id), label: o.name }));
  } catch {
    return [];
  }
};

const empty = async (): Promise<LookupOption[]> => [];

// US states + cultures are intentionally client-side: they are stable, common
// reference data and this product is US-only (per product decision). All other
// lookups still come from / await the backend (see v2 gap L1).
const US_STATES: LookupOption[] = ([
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
] as [string, string][]).map(([value, label]) => ({ value, label }));

const CULTURES: LookupOption[] = [
  { value: "en-US", label: "English - United States" },
  { value: "es-US", label: "Spanish - United States" },
  { value: "fr-CA", label: "French - Canada" },
];

// General ledger-color palette (client-side). `value` is the color name that the
// backend stores (e.g. "Black"); `hex` drives the UI swatch.
const LEDGER_COLORS: LookupOption[] = [
  ["Black", "#000000"], ["DarkGray", "#374151"], ["Gray", "#6B7280"], ["LightGray", "#9CA3AF"],
  ["Blue", "#2563EB"], ["Navy", "#1E3A8A"], ["DodgerBlue", "#1E90FF"], ["Teal", "#0D9488"],
  ["Green", "#16A34A"], ["DarkGreen", "#166534"], ["Olive", "#808000"], ["Amber", "#D97706"],
  ["Gold", "#F59E0B"], ["Orange", "#EA580C"], ["OrangeRed", "#FF4500"], ["Red", "#DC2626"],
  ["Crimson", "#DC143C"], ["Maroon", "#7F1D1D"], ["Brown", "#92400E"], ["Coral", "#FF7F50"],
  ["Purple", "#7C3AED"], ["Indigo", "#4F46E5"], ["Magenta", "#C026D3"], ["DeepPink", "#EC4899"],
].map(([value, hex]) => ({ value, label: value, hex })) as LookupOption[];

const CHARTING_OPTIONS: LookupOption[] = [
  { value: "submenu", label: "Sub Menu (default)" },
  { value: "tiled", label: "Tiled Interface" },
];

const CHARTING_TABS: LookupOption[] = [
  { value: "pre-existing", label: "Pre-existing" },
  { value: "completed", label: "Completed" },
  { value: "txplans", label: "TxPlans" },
];

// Holiday Status / Type (client-side, stable common values). Values match what
// the Holidays tab persists and compares against (e.g. type === "Federal").
const HOLIDAY_STATUSES: LookupOption[] = [
  { value: "CLOSED", label: "Closed" },
  { value: "OPEN", label: "Open" },
  { value: "HALF_DAY", label: "Half Day" },
];

const HOLIDAY_TYPES: LookupOption[] = [
  { value: "Federal", label: "Federal" },
  { value: "Custom", label: "Custom" },
];

// General country list (client-side); United States is the default selection.
const COUNTRIES: LookupOption[] = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "MX", label: "Mexico" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "IN", label: "India" },
];

export const accountSetupLookups = {
  states: async () => US_STATES,
  cultures: async () => CULTURES,
  ledgerColors: async () => LEDGER_COLORS,
  chartingOptions: async () => CHARTING_OPTIONS,
  chartingTabs: async () => CHARTING_TABS,
  ediVendors: empty,
  postingOffices: (_accountId: string) => officeOptions(),
  businessTypes: empty,
  stockExchanges: empty,
  companyStatuses: empty,
  holidayStatuses: async () => HOLIDAY_STATUSES,
  holidayTypes: async () => HOLIDAY_TYPES,
  countries: async () => COUNTRIES,
  businessIndustries: empty,
};

// Re-export so existing imports of parseLookupOptions keep working.
export { parseLookupOptions };

// ----------------------------------------------------------------------------
// HOLIDAYS
// ----------------------------------------------------------------------------

export type HolidayApiRow = {
  id: string;
  account_id?: string;
  holiday_date: string;
  holiday_name: string;
  status: string;
  holiday_type: string;
  is_recurring: boolean;
};

export async function fetchHolidays(accountId: string): Promise<HolidayApiRow[]> {
  const rows = await listAccountHolidays(tid(accountId));
  return (rows ?? []).map((h) => ({
    id: String(h.id),
    holiday_date: h.holiday_date,
    holiday_name: h.holiday_name,
    status: String(h.status ?? ""),
    holiday_type: String(h.holiday_type ?? ""),
    is_recurring: Boolean(h.is_recurring),
  }));
}

export async function createHoliday(
  accountId: string,
  body: { holiday_date: string; holiday_name: string; status: string; holiday_type: string; is_recurring: boolean }
) {
  return createAccountHoliday(tid(accountId), body as never);
}

export async function updateHoliday(
  accountId: string,
  holidayId: string,
  body: Partial<{
    holiday_date: string;
    holiday_name: string;
    status: string;
    holiday_type: string;
    is_recurring: boolean;
  }>
) {
  return updateAccountHoliday(tid(accountId), Number(holidayId), body as never);
}

export async function deleteHoliday(accountId: string, holidayId: string) {
  await deleteAccountHoliday(tid(accountId), Number(holidayId));
}

export async function bulkDeleteHolidays(accountId: string, ids: string[]) {
  await bulkDeleteAccountHolidays(tid(accountId), { ids: ids.map((i) => Number(i)) } as never);
}

export async function importFederalHolidays(accountId: string, year: number) {
  return genImportFederalHolidays(tid(accountId), { year } as never);
}

export async function addHolidayRange(accountId: string, body: { fromDate: string; toDate: string; name: string }) {
  return createHolidayRange(tid(accountId), {
    from_date: body.fromDate,
    to_date: body.toDate,
    name: body.name,
  } as never);
}

// ----------------------------------------------------------------------------
// COMMUNICATIONS
// ----------------------------------------------------------------------------

export type CommunicationsApiRow = Record<string, unknown>;

export async function fetchCommunications(accountId: string): Promise<CommunicationsApiRow> {
  try {
    const row = await getAccountCommunications(tid(accountId));
    return (row ?? {}) as unknown as CommunicationsApiRow;
  } catch {
    return {};
  }
}

export async function updateCommunications(accountId: string, body: Record<string, unknown>) {
  return updateAccountCommunications(tid(accountId), body as never);
}

export async function verifyTelecom(accountId: string) {
  return verifyAccountTelecom(tid(accountId));
}

export type PhoneAssignmentApiRow = {
  id: string;
  account_id?: string;
  office_id: string;
  assignment_type: string;
  phone_number?: string | null;
  is_model_office?: boolean;
};

export async function fetchPhoneAssignments(accountId: string): Promise<PhoneAssignmentApiRow[]> {
  const rows = await listPhoneAssignments(tid(accountId));
  return (rows ?? []).map((a) => ({
    id: String(a.id),
    office_id: String(a.office_id),
    assignment_type: a.assignment_type,
    phone_number: a.phone_number ?? null,
    is_model_office: Boolean(a.is_model_office),
  }));
}

export async function updatePhoneAssignments(accountId: string, body: unknown) {
  // Accept either a bare array or an already-shaped { assignments } payload.
  const assignments = Array.isArray(body)
    ? body
    : (body as { assignments?: unknown[] })?.assignments ?? [];
  return setPhoneAssignments(tid(accountId), { assignments } as never);
}

// ----------------------------------------------------------------------------
// ONLINE REGISTRATION (consents)
// ----------------------------------------------------------------------------

export type ConsentApiRow = {
  id: string;
  account_id?: string;
  version_number: number;
  header: string;
  body_html: string;
  is_active: boolean;
  effective_date?: string;
  created_at?: string;
  created_by?: string;
  archived_at?: string | null;
};

export async function fetchActiveConsent(accountId: string): Promise<ConsentApiRow | null> {
  try {
    const row = await getActiveConsent(tid(accountId));
    if (!row || typeof row !== "object" || (row as { id?: unknown }).id == null) return null;
    const r = row as unknown as Record<string, unknown>;
    return {
      id: String(r.id),
      version_number: Number(r.version_number ?? 1),
      header: String(r.header ?? ""),
      body_html: String(r.body_html ?? ""),
      is_active: Boolean(r.is_active),
      effective_date: r.effective_date ? String(r.effective_date) : undefined,
      created_at: r.created_at ? String(r.created_at) : undefined,
      created_by: r.created_by != null ? String(r.created_by) : undefined,
      archived_at: r.archived_at != null ? String(r.archived_at) : null,
    };
  } catch {
    return null;
  }
}

export async function createConsentVersion(
  accountId: string,
  body: { header: string; body_html: string }
): Promise<ConsentApiRow> {
  const r = (await createAccountConsent(tid(accountId), body as never)) as unknown as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    version_number: Number(r.version_number ?? 1),
    header: String(r.header ?? body.header),
    body_html: String(r.body_html ?? body.body_html),
    is_active: Boolean(r.is_active ?? true),
    effective_date: r.effective_date ? String(r.effective_date) : undefined,
    created_at: r.created_at ? String(r.created_at) : undefined,
    created_by: r.created_by != null ? String(r.created_by) : undefined,
    archived_at: r.archived_at != null ? String(r.archived_at) : null,
  };
}

/**
 * Consent preview URL for window.open. Backend exposes a JSON preview
 * (GET …/consents/{id}/preview); there is no PDF export endpoint yet
 * (see ACCOUNT_INFO_BACKEND_MAPPING_v2.md gap L4).
 */
export function getConsentPreviewUrl(accountId: string, consentId: string) {
  const base = api.defaults.baseURL?.replace(/\/$/, "") ?? "";
  const path = `/api/v1/tenants/${encodeURIComponent(numericAccountId(accountId))}/consents/${encodeURIComponent(consentId)}/preview`;
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
  const q = token ? `?access_token=${encodeURIComponent(token)}` : "";
  return `${base}${path}${q}`;
}

/** No backend PDF endpoint exists yet — falls back to the JSON preview (gap L4). */
export function getConsentPdfUrl(accountId: string, consentId: string) {
  return getConsentPreviewUrl(accountId, consentId);
}

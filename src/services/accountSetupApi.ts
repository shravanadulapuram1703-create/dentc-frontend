import api from "./api";
import { extractResponseData, parseLookupOptions, type LookupOption } from "./accountSetupTransform";

/** Paths follow ACCOUNT_SETUP_DATA_DEFINITION.md (API Endpoints). */
const P = {
  account: (id: string) => `/api/accounts/${encodeURIComponent(id)}`,
  advanced: (id: string) => `/api/accounts/${encodeURIComponent(id)}/advanced-settings`,
  logo: (id: string) => `/api/accounts/${encodeURIComponent(id)}/logo`,
  holidays: (accountId: string) => `/api/accounts/${encodeURIComponent(accountId)}/holidays`,
  holiday: (accountId: string, holidayId: string) =>
    `/api/accounts/${encodeURIComponent(accountId)}/holidays/${encodeURIComponent(holidayId)}`,
  holidaysFederal: (accountId: string) => `/api/accounts/${encodeURIComponent(accountId)}/holidays/federal`,
  holidaysRange: (accountId: string) => `/api/accounts/${encodeURIComponent(accountId)}/holidays/range`,
  communications: (accountId: string) => `/api/accounts/${encodeURIComponent(accountId)}/communications`,
  verifyTelecom: (accountId: string) =>
    `/api/accounts/${encodeURIComponent(accountId)}/communications/verify-telecom`,
  phoneAssignments: (accountId: string) => `/api/accounts/${encodeURIComponent(accountId)}/phone-assignments`,
  consents: (accountId: string) => `/api/accounts/${encodeURIComponent(accountId)}/consents`,
  consentsActive: (accountId: string) => `/api/accounts/${encodeURIComponent(accountId)}/consents/active`,
  consent: (accountId: string, consentId: string) =>
    `/api/accounts/${encodeURIComponent(accountId)}/consents/${encodeURIComponent(consentId)}`,
  consentPdf: (accountId: string, consentId: string) =>
    `/api/accounts/${encodeURIComponent(accountId)}/consents/${encodeURIComponent(consentId)}/pdf`,
  consentPreview: (accountId: string, consentId: string) =>
    `/api/accounts/${encodeURIComponent(accountId)}/consents/${encodeURIComponent(consentId)}/preview`,
  lookupStates: "/api/lookup/states",
  lookupCultures: "/api/lookup/cultures",
  lookupColors: "/api/lookup/colors",
  lookupChartingOptions: "/api/lookup/charting-options",
  lookupChartingTabs: "/api/lookup/charting-tabs",
  lookupEdiVendors: "/api/lookup/edi-vendors",
  lookupOffices: (accountId: string) => `/api/lookup/offices?accountId=${encodeURIComponent(accountId)}`,
  lookupBusinessTypes: "/api/lookup/business-types",
  lookupStockExchanges: "/api/lookup/stock-exchanges",
  lookupCompanyStatuses: "/api/lookup/company-statuses",
  /** Not listed in MD table; aligns with holiday_status metadata naming. */
  lookupHolidayStatuses: "/api/lookup/holiday-statuses",
  lookupHolidayTypes: "/api/lookup/holiday-types",
  /** MD lists country as string; backend may expose optional lookup. */
  lookupCountries: "/api/lookup/countries",
  /** MD lists business_industry as string; optional lookup for select UI. */
  lookupBusinessIndustries: "/api/lookup/business-industries",
};

async function getJson<T>(url: string): Promise<T> {
  const { data } = await api.get<unknown>(url);
  return extractResponseData<T>(data) ?? (data as T);
}

async function parseLookup(url: string): Promise<LookupOption[]> {
  try {
    const raw = await getJson<unknown>(url);
    return parseLookupOptions(raw);
  } catch {
    return [];
  }
}

export async function fetchAccount(accountId: string): Promise<Record<string, unknown>> {
  const row = await getJson<Record<string, unknown>>(P.account(accountId));
  return row && typeof row === "object" ? row : {};
}

export async function updateAccount(accountId: string, body: Record<string, unknown>) {
  const { data } = await api.put<unknown>(P.account(accountId), body);
  return extractResponseData<Record<string, unknown>>(data) ?? data;
}

export async function fetchAdvancedSettings(accountId: string): Promise<Record<string, unknown>> {
  try {
    const row = await getJson<Record<string, unknown>>(P.advanced(accountId));
    return row && typeof row === "object" ? row : {};
  } catch {
    return {};
  }
}

export async function updateAdvancedSettings(accountId: string, body: Record<string, unknown>) {
  const { data } = await api.put<unknown>(P.advanced(accountId), body);
  return extractResponseData<Record<string, unknown>>(data) ?? data;
}

export async function deleteAccountLogo(accountId: string) {
  await api.delete(P.logo(accountId));
}

/** Sends logo as JSON if backend expects base64; falls back ignored on 415. */
export async function uploadAccountLogoDataUrl(accountId: string, dataUrl: string) {
  try {
    const { data } = await api.post<unknown>(P.logo(accountId), { logo_url: dataUrl });
    return extractResponseData<{ logo_url?: string }>(data) ?? data;
  } catch {
    const { data } = await api.post<unknown>(P.logo(accountId), { image: dataUrl });
    return extractResponseData<{ logo_url?: string }>(data) ?? data;
  }
}

export const accountSetupLookups = {
  states: () => parseLookup(P.lookupStates),
  cultures: () => parseLookup(P.lookupCultures),
  ledgerColors: () => parseLookup(P.lookupColors),
  chartingOptions: () => parseLookup(P.lookupChartingOptions),
  chartingTabs: () => parseLookup(P.lookupChartingTabs),
  ediVendors: () => parseLookup(P.lookupEdiVendors),
  postingOffices: (accountId: string) => parseLookup(P.lookupOffices(accountId)),
  businessTypes: () => parseLookup(P.lookupBusinessTypes),
  stockExchanges: () => parseLookup(P.lookupStockExchanges),
  companyStatuses: () => parseLookup(P.lookupCompanyStatuses),
  holidayStatuses: () => parseLookup(P.lookupHolidayStatuses),
  holidayTypes: () => parseLookup(P.lookupHolidayTypes),
  countries: () => parseLookup(P.lookupCountries),
  businessIndustries: () => parseLookup(P.lookupBusinessIndustries),
};

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
  const raw = await getJson<unknown>(P.holidays(accountId));
  if (Array.isArray(raw)) return raw as HolidayApiRow[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: HolidayApiRow[] }).items;
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: HolidayApiRow[] }).data;
  }
  return [];
}

export async function createHoliday(
  accountId: string,
  body: { holiday_date: string; holiday_name: string; status: string; holiday_type: string; is_recurring: boolean }
) {
  const { data } = await api.post<unknown>(P.holidays(accountId), body);
  return extractResponseData<HolidayApiRow>(data) ?? (data as HolidayApiRow);
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
  const { data } = await api.put<unknown>(P.holiday(accountId, holidayId), body);
  return extractResponseData<HolidayApiRow>(data) ?? (data as HolidayApiRow);
}

export async function deleteHoliday(accountId: string, holidayId: string) {
  await api.delete(P.holiday(accountId, holidayId));
}

export async function bulkDeleteHolidays(accountId: string, ids: string[]) {
  await api.delete(P.holidays(accountId), { data: { ids } });
}

export async function importFederalHolidays(accountId: string, year: number) {
  const { data } = await api.post<unknown>(P.holidaysFederal(accountId), { year });
  return extractResponseData<unknown>(data) ?? data;
}

export async function addHolidayRange(accountId: string, body: { fromDate: string; toDate: string; name: string }) {
  const { data } = await api.post<unknown>(P.holidaysRange(accountId), body);
  return extractResponseData<unknown>(data) ?? data;
}

export type CommunicationsApiRow = Record<string, unknown>;

export async function fetchCommunications(accountId: string): Promise<CommunicationsApiRow> {
  const row = await getJson<CommunicationsApiRow>(P.communications(accountId));
  return row && typeof row === "object" ? row : {};
}

export async function updateCommunications(accountId: string, body: Record<string, unknown>) {
  const { data } = await api.put<unknown>(P.communications(accountId), body);
  return extractResponseData<CommunicationsApiRow>(data) ?? data;
}

export async function verifyTelecom(accountId: string) {
  const { data } = await api.post<unknown>(P.verifyTelecom(accountId), {});
  return data;
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
  const raw = await getJson<unknown>(P.phoneAssignments(accountId));
  if (Array.isArray(raw)) return raw as PhoneAssignmentApiRow[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { assignments?: unknown }).assignments)) {
    return (raw as { assignments: PhoneAssignmentApiRow[] }).assignments;
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: PhoneAssignmentApiRow[] }).data;
  }
  return [];
}

export async function updatePhoneAssignments(accountId: string, body: unknown) {
  const { data } = await api.put<unknown>(P.phoneAssignments(accountId), body);
  return extractResponseData<unknown>(data) ?? data;
}

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
    const row = await getJson<ConsentApiRow>(P.consentsActive(accountId));
    return row && typeof row === "object" && row.id ? row : null;
  } catch {
    return null;
  }
}

export async function createConsentVersion(accountId: string, body: { header: string; body_html: string }) {
  const { data } = await api.post<unknown>(P.consents(accountId), body);
  return extractResponseData<ConsentApiRow>(data) ?? (data as ConsentApiRow);
}

export function getConsentPreviewUrl(accountId: string, consentId: string) {
  const base = api.defaults.baseURL?.replace(/\/$/, "") ?? "";
  const path = P.consentPreview(accountId, consentId);
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
  const q = token ? `?access_token=${encodeURIComponent(token)}` : "";
  return `${base}${path}${q}`;
}

export function getConsentPdfUrl(accountId: string, consentId: string) {
  const base = api.defaults.baseURL?.replace(/\/$/, "") ?? "";
  const path = P.consentPdf(accountId, consentId);
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
  const q = token ? `?access_token=${encodeURIComponent(token)}` : "";
  return `${base}${path}${q}`;
}

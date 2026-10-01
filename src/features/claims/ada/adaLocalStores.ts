// Browser-side stores for ADA claim-form data the backend has no column for.
//
// Every value here is a stop-gap (see docs/claims/ada_claim_form_2024_backend_devreport.md):
//   • office claim billing   — entity (Type 2) NPI, taxonomy         ADA-BE-8
//   • provider taxonomy code — Item 56a                                ADA-BE-14
//   • print offsets          — overlay calibration per office          UI-14
//   • print log              — who printed which claim form when       ADA-BE-1 / UI-15
//
// Keys are named so `clearAuthStorageKeepRemembered` preserves them across
// logout / 401 (the same treatment the fill-out record gets — CLM-FO-1).

const OFFICE_BILLING_PREFIX = "dentc:office_claim_billing:v1:";
const PROVIDER_TAXONOMY_PREFIX = "dentc:provider_taxonomy:v1:";
const PRINT_OFFSET_PREFIX = "dentc:ada_print_offset:v1:";
const PRINT_LOG_PREFIX = "dentc:claim_print_log:v1:";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — the caller treats this as best-effort */
  }
}

// ---- Office: entity NPI / taxonomy (ADA Items 48–52) -----------------------

export interface OfficeClaimBilling {
  /** Type 2 (organisation) NPI for Item 49. */
  npi: string;
  /** Organisation taxonomy (837D billing-provider PRV) — optional. */
  taxonomy_code: string;
}

export function loadOfficeClaimBilling(office_id: number | string | null | undefined): OfficeClaimBilling {
  const v = office_id != null ? readJson<Partial<OfficeClaimBilling>>(`${OFFICE_BILLING_PREFIX}${office_id}`) : null;
  return { npi: v?.npi ?? "", taxonomy_code: v?.taxonomy_code ?? "" };
}

export function saveOfficeClaimBilling(office_id: number | string, value: OfficeClaimBilling): void {
  writeJson(`${OFFICE_BILLING_PREFIX}${office_id}`, value);
}

// ---- Provider: taxonomy code (ADA Item 56a) ---------------------------------

export function loadProviderTaxonomy(provider_id: string | null | undefined): string {
  return provider_id ? readJson<{ taxonomy_code?: string }>(`${PROVIDER_TAXONOMY_PREFIX}${provider_id}`)?.taxonomy_code ?? "" : "";
}

export function saveProviderTaxonomy(provider_id: string, taxonomy_code: string): void {
  writeJson(`${PROVIDER_TAXONOMY_PREFIX}${provider_id}`, { taxonomy_code });
}

// ---- Print offsets (overlay calibration) -----------------------------------

export interface AdaPrintOffset {
  offset_x: number;
  offset_y: number;
}

export function loadPrintOffset(office_id: number | string | null | undefined): AdaPrintOffset {
  const v = readJson<Partial<AdaPrintOffset>>(`${PRINT_OFFSET_PREFIX}${office_id ?? "default"}`);
  return { offset_x: Number(v?.offset_x) || 0, offset_y: Number(v?.offset_y) || 0 };
}

export function savePrintOffset(office_id: number | string | null | undefined, value: AdaPrintOffset): void {
  writeJson(`${PRINT_OFFSET_PREFIX}${office_id ?? "default"}`, value);
}

// ---- Print log ------------------------------------------------------------

export interface ClaimPrintLogEntry {
  printed_at: string;
  printed_by: string;
  mode: "form" | "overlay" | "calibration";
  forms: number;
  form_version: string;
  /** Number of "must fix" items the pre-flight showed at print time. */
  errors: number;
}

export function loadClaimPrintLog(claim_id: string): ClaimPrintLogEntry[] {
  return readJson<ClaimPrintLogEntry[]>(`${PRINT_LOG_PREFIX}${claim_id}`) ?? [];
}

export function appendClaimPrintLog(claim_id: string, entry: ClaimPrintLogEntry): ClaimPrintLogEntry[] {
  const log = [...loadClaimPrintLog(claim_id), entry].slice(-50);
  writeJson(`${PRINT_LOG_PREFIX}${claim_id}`, log);
  return log;
}

/** Every key this module owns — preserved across logout like the fill-out keys. */
export function adaLocalStoreKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(OFFICE_BILLING_PREFIX) ||
          key.startsWith(PROVIDER_TAXONOMY_PREFIX) ||
          key.startsWith(PRINT_OFFSET_PREFIX) ||
          key.startsWith(PRINT_LOG_PREFIX))
      )
        keys.push(key);
    }
  } catch {
    return [];
  }
  return keys;
}

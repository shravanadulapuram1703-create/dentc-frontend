/**
 * Office Statement settings — office-scoped data access.
 *
 * Backed by the deployed DentC Backend office statement-settings endpoints
 * (openapi.json v1.0.0). This module wraps the generated Orval client so the
 * Office → Statement tab talks to the real routes via the shared custom axios
 * instance (no raw axios here):
 *   GET    /api/v1/offices/{officeId}/statement-settings   → OfficeStatementSettingsRead
 *   PATCH  /api/v1/offices/{officeId}/statement-settings   → OfficeStatementSettingsRead
 *   POST   /api/v1/offices/{officeId}/statement-logo        (multipart `file`) → LogoResult
 *   DELETE /api/v1/offices/{officeId}/statement-logo
 */
import {
  getOfficeStatementSettings,
  updateOfficeStatementSettings,
  uploadOfficeStatementLogo as uploadOfficeStatementLogoGenerated,
  deleteOfficeStatementLogo as deleteOfficeStatementLogoGenerated,
} from "@/api/generated/endpoints/office-setup/office-setup";
import type {
  OfficeStatementSettingsRead,
  OfficeStatementSettingsUpdate,
} from "@/api/generated/model";

/**
 * UI-friendly view of the statement settings record. Keeps the real backend
 * field names (matching OfficeStatementSettingsRead/Update) but normalises the
 * nullable string fields to plain strings so the form inputs stay controlled.
 */
export type OfficeStatementSettings = {
  office_id?: number;

  // Monthly statement messages (printed on patient statements).
  message_general: string;
  message_current: string;
  message_30: string;
  message_60: string;
  message_90: string;
  message_120: string;

  // Settings.
  correspondence_name: string;
  /**
   * Plain string in the API (no enum). The UI assumes the stored values are
   * "OFFICE" | "CUSTOM" | "NONE" — confirm the canonical strings with backend.
   */
  logo_option: LogoOption;
  logo_url: string | null;
  /**
   * Plain string in the API (no enum). The UI assumes the stored values are
   * "OFFICE" | "CUSTOM" — confirm the canonical strings with backend.
   */
  address_source: AddressSource;
  statement_address_1: string;
  statement_address_2: string;
  statement_city: string;
  statement_state: string;
  statement_zip: string;
  statement_phone: string;

  updated_at?: string | null;
};

/**
 * `logo_option` is a plain string in the API. These are a UI assumption for the
 * select options — confirm the exact stored string values with backend.
 */
export type LogoOption = "OFFICE" | "CUSTOM" | "NONE";
/**
 * `address_source` is a plain string in the API. These are a UI assumption for
 * the select options — confirm the exact stored string values with backend.
 */
export type AddressSource = "OFFICE" | "CUSTOM";

/** A fresh, empty record (used as the default before the backend responds). */
export function emptyOfficeStatementSettings(): OfficeStatementSettings {
  return {
    message_general: "",
    message_current: "",
    message_30: "",
    message_60: "",
    message_90: "",
    message_120: "",
    correspondence_name: "",
    logo_option: "OFFICE",
    logo_url: null,
    address_source: "OFFICE",
    statement_address_1: "",
    statement_address_2: "",
    statement_city: "",
    statement_state: "",
    statement_zip: "",
    statement_phone: "",
  };
}

const str = (v: string | null | undefined): string => v ?? "";

/** Map the generated Read model into the form-friendly shape. */
function fromRead(data: OfficeStatementSettingsRead): OfficeStatementSettings {
  return {
    office_id: data.office_id,
    message_general: str(data.message_general),
    message_current: str(data.message_current),
    message_30: str(data.message_30),
    message_60: str(data.message_60),
    message_90: str(data.message_90),
    message_120: str(data.message_120),
    correspondence_name: str(data.correspondence_name),
    logo_option: (data.logo_option || "OFFICE") as LogoOption,
    logo_url: data.logo_url ?? null,
    address_source: (data.address_source || "OFFICE") as AddressSource,
    statement_address_1: str(data.statement_address_1),
    statement_address_2: str(data.statement_address_2),
    statement_city: str(data.statement_city),
    statement_state: str(data.statement_state),
    statement_zip: str(data.statement_zip),
    statement_phone: str(data.statement_phone),
    updated_at: data.updated_at,
  };
}

/** Map the form-friendly shape into the generated Update body. */
function toUpdate(s: Partial<OfficeStatementSettings>): OfficeStatementSettingsUpdate {
  return {
    message_general: s.message_general,
    message_current: s.message_current,
    message_30: s.message_30,
    message_60: s.message_60,
    message_90: s.message_90,
    message_120: s.message_120,
    correspondence_name: s.correspondence_name,
    logo_option: s.logo_option,
    logo_url: s.logo_url,
    address_source: s.address_source,
    statement_address_1: s.statement_address_1,
    statement_address_2: s.statement_address_2,
    statement_city: s.statement_city,
    statement_state: s.statement_state,
    statement_zip: s.statement_zip,
    statement_phone: s.statement_phone,
  };
}

export async function fetchOfficeStatementSettings(officeId: number): Promise<OfficeStatementSettings> {
  const data = await getOfficeStatementSettings(officeId);
  return fromRead(data);
}

export async function saveOfficeStatementSettings(
  officeId: number,
  body: Partial<OfficeStatementSettings>
): Promise<OfficeStatementSettings> {
  const data = await updateOfficeStatementSettings(officeId, toUpdate(body));
  return fromRead(data);
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

/**
 * Upload a statement logo. The generated client expects a multipart body of
 * shape `{ file: Blob }`, so convert the data-URL coming from the file picker
 * into a Blob. Returns the stored logo URL.
 */
export async function uploadOfficeStatementLogo(
  officeId: number,
  dataUrl: string
): Promise<{ logo_url: string }> {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], "logo.png", { type: blob.type });
  const result = await uploadOfficeStatementLogoGenerated(officeId, { file });
  return { logo_url: result.logo_url ?? "" };
}

export async function deleteOfficeStatementLogo(officeId: number): Promise<void> {
  await deleteOfficeStatementLogoGenerated(officeId);
}

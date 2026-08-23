import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useDefinitions } from "@/hooks/useDefinitions";
import type {
  PatientDocumentRead,
  PatientNoteCreate,
  PatientNoteRead,
  PatientNoteUpdate,
} from "@/api/generated/model";

/**
 * Patient Notes -> document upload / download (NOTE-DOC-1..5).
 *
 * The committed `openapi.json` predates the backend's document release, so the
 * generated client has neither the `context` upload field, the `/limits` route,
 * nor `document_id` / the embedded `document` block on a note. Everything the
 * generator is missing lives here, typed as an intersection over the generated
 * models so it collapses into the real thing after `npm run api:sync`.
 */

/** `context=note` is what files the upload under `documents/notes/` (NOTE-DOC-2). */
export const NOTE_DOCUMENT_CONTEXT = "note";

/** The embedded document block the backend returns on a note read (NOTE-DOC-1). */
export type NoteDocument = PatientDocumentRead;

/** `PatientNoteRead` plus the fields the stale generated model doesn't know about. */
export type PatientNoteWithDocument = PatientNoteRead & {
  document_id?: number | null;
  document?: Partial<NoteDocument> | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
};

export type PatientNoteCreateWithDocument = PatientNoteCreate & {
  document_id?: number | null;
};

export type PatientNoteUpdateWithDocument = PatientNoteUpdate & {
  document_id?: number | null;
};

// --- upload limits (NOTE-DOC-5) ---------------------------------------------

export interface DocumentLimits {
  max_bytes: number;
  max_megabytes: number;
  allowed_content_types: string[];
  allowed_extensions: string[];
  allowed_contexts: string[];
}

/**
 * Used until `/patient-documents/limits` answers. These mirror the published
 * server-side rules; they are a starting point for the picker, never the
 * authority - the server validates every upload regardless.
 */
export const DEFAULT_DOCUMENT_LIMITS: DocumentLimits = {
  max_bytes: 10 * 1024 * 1024,
  max_megabytes: 10,
  allowed_content_types: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/tiff",
    "image/bmp",
    "image/webp",
  ],
  allowed_extensions: [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".tif", ".tiff", ".bmp", ".webp"],
  allowed_contexts: [NOTE_DOCUMENT_CONTEXT],
};

async function fetchDocumentLimits(): Promise<DocumentLimits> {
  try {
    const { data } = await api.get<Partial<DocumentLimits>>("/api/v1/patient-documents/limits");
    return { ...DEFAULT_DOCUMENT_LIMITS, ...data };
  } catch {
    // Older deploys don't publish the route - fall back rather than block the
    // picker. The server still enforces the real limits on POST.
    return DEFAULT_DOCUMENT_LIMITS;
  }
}

export function useDocumentLimits(): DocumentLimits {
  const query = useQuery({
    queryKey: ["/api/v1/patient-documents/limits"],
    queryFn: fetchDocumentLimits,
    staleTime: 60 * 60 * 1000,
  });
  return query.data ?? DEFAULT_DOCUMENT_LIMITS;
}

/** File extension, lower-cased, including the dot ("" when there isn't one). */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Client-side pre-check so an obviously bad file is rejected before the upload.
 * Returns an error message, or null when the file looks acceptable.
 *
 * A declared type of `application/octet-stream` (or none) defers to the
 * extension - browsers and TWAIN scanners routinely send octet-stream for a
 * perfectly good PDF, and the server makes the same allowance.
 */
export function validateDocumentFile(file: File, limits: DocumentLimits): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > limits.max_bytes) {
    return `File exceeds the ${limits.max_megabytes} MB limit (${(
      file.size /
      1024 /
      1024
    ).toFixed(1)} MB selected).`;
  }
  const ext = extensionOf(file.name);
  if (ext && !limits.allowed_extensions.includes(ext)) {
    return `${ext} files aren't accepted. Allowed: ${limits.allowed_extensions.join(", ")}.`;
  }
  const declared = (file.type || "").toLowerCase();
  const defersToExtension = !declared || declared === "application/octet-stream";
  if (!defersToExtension && !limits.allowed_content_types.includes(declared)) {
    return `Files of type ${declared} aren't accepted.`;
  }
  return null;
}

// --- upload -----------------------------------------------------------------

export interface UploadDocumentArgs {
  file: File;
  patient_id: number;
  office_id?: number | null;
  /** A `document_type` code - `key1` from the `document_type` definitions group. */
  document_type?: string | null;
  description?: string | null;
  /** Defaults to `note`; that is what routes the file to `documents/notes/`. */
  context?: string;
}

/**
 * `POST /patient-documents` (multipart). Hand-rolled rather than using the
 * generated `uploadPatientDocument` because the generated body has no
 * `context` field, and dropping it buries a note's file in `documents/general/`.
 */
export async function uploadNoteDocument({
  file,
  patient_id,
  office_id,
  document_type,
  description,
  context = NOTE_DOCUMENT_CONTEXT,
}: UploadDocumentArgs): Promise<NoteDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("patient_id", String(patient_id));
  if (office_id != null) form.append("office_id", String(office_id));
  if (document_type) form.append("document_type", document_type);
  if (description) form.append("description", description);
  if (context) form.append("context", context);

  const { data } = await api.post<NoteDocument>("/api/v1/patient-documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Readable message from an upload/save failure. The document routes answer with
 * `{"error": {"code", "message"}}` (NOTE-DOC-5); the rest of the API uses
 * FastAPI's `detail`.
 */
export function documentErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data as
    | { error?: { message?: string }; detail?: unknown }
    | undefined;
  if (typeof data?.error?.message === "string") return data.error.message;
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return fallback;
}

// --- document_type vocabulary (NOTE-DOC-4) ----------------------------------

export interface DocumentTypeOption {
  code: string;
  label: string;
}

/**
 * The seeded `document_type` group, used when `/definitions` hasn't been seeded
 * on this environment (`python -m scripts.seed_account_definitions`). Codes are
 * the backend's; `CF` is also recognised as a consent type.
 */
export const DOCUMENT_TYPE_FALLBACK: DocumentTypeOption[] = [
  { code: "CF", label: "Consent Form" },
  { code: "IC", label: "Insurance Card" },
  { code: "ID", label: "Photo ID" },
  { code: "XR", label: "X-Ray / Image" },
  { code: "RX", label: "Prescription" },
  { code: "RF", label: "Referral Letter" },
  { code: "LB", label: "Lab Report" },
  { code: "MH", label: "Medical History" },
  { code: "TP", label: "Treatment Plan" },
  { code: "FA", label: "Financial Agreement" },
  { code: "EOB", label: "Explanation of Benefits" },
  { code: "CR", label: "Correspondence" },
  { code: "PH", label: "Patient Photo" },
  { code: "OT", label: "Other" },
];

/** Document sub-type picker options, from `/definitions?group_code=document_type`. */
export function useDocumentTypeOptions(): DocumentTypeOption[] {
  const { definitions } = useDefinitions("document_type");
  const fromApi = definitions
    .filter((d) => d.key1)
    .map((d) => ({ code: d.key1 as string, label: d.description || (d.key1 as string) }));
  return fromApi.length > 0 ? fromApi : DOCUMENT_TYPE_FALLBACK;
}

/** Label for a stored `document_type` value, tolerating legacy free-text rows. */
export function documentTypeLabel(
  code: string | null | undefined,
  options: DocumentTypeOption[],
): string {
  if (!code) return "-";
  return options.find((o) => o.code === code)?.label ?? code;
}

// --- display helpers --------------------------------------------------------

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** True when the browser can render this document inline in an `<img>`. */
export function isImageDocument(doc: {
  content_type?: string | null;
  file_name?: string | null;
}): boolean {
  if (doc.content_type?.toLowerCase().startsWith("image/")) return true;
  const ext = extensionOf(doc.file_name ?? "");
  return [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext);
}

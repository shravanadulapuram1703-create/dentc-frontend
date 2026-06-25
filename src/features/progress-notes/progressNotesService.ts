// Progress Notes — thin service over the generated Orval client (no raw axios).
//
// Core resource: /api/v1/progress-notes (tag: clinical) — full CRUD + a /sign
// action that stamps the authenticated user + timestamp. Signatures live in
// /patient-signatures (is_user_sig flags a provider/user signature vs a patient
// one); attachments live in /patient-documents. All bodies are snake_case and
// pass through unchanged, per project convention. `size` maxes at 200, so list
// helpers page through the full set.

import {
  listProgressNotes,
  getProgressNote,
  createProgressNote,
  updateProgressNote,
  signProgressNote,
} from '@/api/generated/endpoints/clinical/clinical';
import {
  listPatientSignatures,
  createPatientSignature,
  listPatientDocuments,
  uploadPatientDocument,
} from '@/api/generated/endpoints/patients/patients';
import type {
  ProgressNoteRead,
  ProgressNoteCreate,
  ProgressNoteUpdate,
  PatientSignatureRead,
  PatientDocumentRead,
} from '@/api/generated/model';

const PAGE_SIZE = 200;

// ---- Progress notes -------------------------------------------------------

/** Every non-deleted progress note for a patient (newest note_date first). */
export async function listNotesForPatient(patientId: number): Promise<ProgressNoteRead[]> {
  const first = await listProgressNotes({ patient_id: patientId, page: 1, size: PAGE_SIZE });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listProgressNotes({ patient_id: patientId, page: i + 2, size: PAGE_SIZE }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items
    .filter((n) => !n.is_deleted)
    .sort((a, b) => dosKey(b).localeCompare(dosKey(a)));
}

function dosKey(n: ProgressNoteRead): string {
  return (n.note_date ?? n.created_at ?? '').slice(0, 10);
}

export function getNote(id: number) {
  return getProgressNote(id);
}

export function createNote(body: ProgressNoteCreate): Promise<ProgressNoteRead> {
  return createProgressNote(body);
}

export function updateNote(id: number, body: ProgressNoteUpdate): Promise<ProgressNoteRead> {
  return updateProgressNote(id, body);
}

/** Stamp the note as signed by the authenticated user (server fills user+time). */
export function signNote(id: number): Promise<unknown> {
  return signProgressNote(id);
}

/** Soft "delete" — notes are struck off, never removed (legacy rule). */
export function strikeOffNote(id: number): Promise<ProgressNoteRead> {
  return updateProgressNote(id, { is_struck_off: true });
}

export function restoreNote(id: number): Promise<ProgressNoteRead> {
  return updateProgressNote(id, { is_struck_off: false });
}

// ---- Derived state --------------------------------------------------------

export function isSigned(n: Pick<ProgressNoteRead, 'signed_by' | 'signed_at'>): boolean {
  return n.signed_by != null || n.signed_at != null;
}

/**
 * Legacy locking: a note becomes read-only once it is signed, OR after midnight
 * of the day it was created (created_at is before today). Locked notes can still
 * be signed.
 */
export function isLocked(n: ProgressNoteRead): boolean {
  if (isSigned(n)) return true;
  if (!n.created_at) return false;
  const created = new Date(n.created_at);
  if (Number.isNaN(created.getTime())) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return created.getTime() < startOfToday.getTime();
}

// ---- Tooth string <-> array ----------------------------------------------

export function parseTeeth(tooth?: string | null): string[] {
  return tooth ? tooth.split(/[\s,]+/).filter(Boolean) : [];
}

export function joinTeeth(teeth: string[]): string | null {
  return teeth.length ? teeth.join(', ') : null;
}

// ---- Date helpers ---------------------------------------------------------

/** ISO/date string → MM/DD/YYYY for display (— when missing/invalid). */
export function fmtDos(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

/** Any date string → yyyy-MM-dd for <input type="date">. */
export function toInputDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function todayInputDate(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function fmtCreatedAt(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

// ---- Current user (best-effort, decoded from the JWT) ---------------------

interface JwtUser {
  id?: number;
  login: string;
}

/** Decode id/login from the stored access_token (no network call). */
export function currentUser(): JwtUser {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return { login: 'ME' };
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return { login: 'ME' };
    const json = JSON.parse(
      decodeURIComponent(
        atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      ),
    ) as Record<string, unknown>;
    const idRaw = json.user_id ?? json.uid ?? json.sub;
    const id = idRaw != null && !Number.isNaN(Number(idRaw)) ? Number(idRaw) : undefined;
    const login =
      (json.username as string) ||
      (json.preferred_username as string) ||
      (json.login as string) ||
      (json.name as string) ||
      (typeof json.sub === 'string' ? json.sub : 'ME');
    return { id, login: String(login).toUpperCase() };
  } catch {
    return { login: 'ME' };
  }
}

// ---- Signatures -----------------------------------------------------------

/** Most recent stored provider/user signature for this patient (data URL). */
export async function loadMySignature(patientId: number): Promise<string | null> {
  const res = await listPatientSignatures({
    patient_id: patientId,
    page: 1,
    size: PAGE_SIZE,
    sort: 'created_at',
    order: 'desc',
  });
  const mine: PatientSignatureRead | undefined = (res.items ?? []).find(
    (s) => s.is_user_sig && s.signature_data,
  );
  return mine?.signature_data ?? null;
}

/** Persist a drawn/loaded provider signature image (data URL) for the patient. */
export function saveUserSignature(patientId: number, dataUrl: string): Promise<PatientSignatureRead> {
  return createPatientSignature({
    patient_id: patientId,
    signature_data: dataUrl,
    signature_len: dataUrl.length,
    device_source: 'web-pad',
    is_user_sig: true,
  });
}

// ---- Attachments ----------------------------------------------------------

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif';
const ATTACHMENT_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

export function validateAttachment(file: File): string | null {
  if (file.size > ATTACHMENT_MAX_BYTES) return 'File size must be less than 10 MB.';
  if (!ATTACHMENT_MIME.includes(file.type))
    return 'Only PDF, JPG, JPEG, PNG and GIF files are allowed.';
  return null;
}

export function uploadAttachment(
  file: File,
  patientId: number,
  officeId: number | null,
): Promise<PatientDocumentRead> {
  return uploadPatientDocument({
    file,
    patient_id: patientId,
    office_id: officeId ?? undefined,
    document_type: 'progress_note',
    description: file.name,
  });
}

export async function listPatientAttachments(patientId: number): Promise<PatientDocumentRead[]> {
  const docs = await listPatientDocuments({ patient_id: patientId });
  return (docs ?? []).filter((d) => !d.is_deleted && d.document_type === 'progress_note');
}

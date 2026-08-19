// Letters — domain model (legacy Denticon "Letters (New)" dialog).
//
// A letter is a `LetterTemplateRead` row from /api/v1/letter-templates. The
// legacy dialog splits them into "Letter Groups" via the single-character
// `letter_type` code the migration carried over. There is no /definitions group
// that labels those codes (gap LTR-2), so the map below is the frontend's
// source of truth; unknown codes fall through to an "Other Letters" bucket
// instead of disappearing from the picker.
//
// Live tenant-1 distribution at time of writing (153 templates):
//   C 79 · I 23 · F 17 · E 13 · S 8 · A 7 · M 4 · D 2

import type { LetterTemplateRead } from '@/api/generated/model';

/** Ordered group catalog. `code` is the backend `letter_type` value. */
export const LETTER_GROUPS = [
  { code: 'C', label: 'Patient Consent' },
  { code: 'M', label: 'Marketing Letters' },
  { code: 'A', label: 'Appointment Letters' },
  { code: 'F', label: 'Financial / Collection Letters' },
  { code: 'I', label: 'Insurance & Treatment Letters' },
  { code: 'D', label: 'Referral Letters' },
  { code: 'S', label: 'Statements & Disclosures' },
  { code: 'E', label: 'Email Templates' },
] as const;

export type LetterGroupCode = (typeof LETTER_GROUPS)[number]['code'] | 'OTHER';

const GROUP_LABEL = new Map<string, string>(
  LETTER_GROUPS.map((g) => [g.code, g.label]),
);

/** Groups whose letters are consent forms — these get a Signature Type and a
 *  patient-consent record on save. */
export const CONSENT_GROUP: LetterGroupCode = 'C';

export function group_code_of(t: LetterTemplateRead): LetterGroupCode {
  const raw = (t.letter_type ?? '').trim().toUpperCase();
  return (GROUP_LABEL.has(raw) ? raw : 'OTHER') as LetterGroupCode;
}

export function group_label(code: LetterGroupCode): string {
  return GROUP_LABEL.get(code) ?? 'Other Letters';
}

/**
 * Signature Type — the legacy consent dialog's third dropdown. It selects who
 * countersigns the printed consent; the patient signature line is always
 * printed. `provider_role` filters the provider picker used to resolve
 * `#DOC_LAST_NAME#`.
 */
export const SIGNATURE_TYPES = [
  { value: 'dentist', label: 'Dentist', line: 'Dentist' },
  { value: 'hygienist', label: 'Hygienist', line: 'Hygienist' },
  { value: 'assistant', label: 'Assistant', line: 'Dental Assistant' },
  { value: 'office', label: 'Office Manager', line: 'Office Manager' },
  { value: 'none', label: 'Patient Only', line: '' },
] as const;

export type SignatureType = (typeof SIGNATURE_TYPES)[number]['value'];

export function signature_line(t: SignatureType): string {
  return SIGNATURE_TYPES.find((s) => s.value === t)?.line ?? '';
}

/** Document type recorded on /patient-documents for a generated letter. */
export const DOC_TYPE_CONSENT = 'consent-form';
export const DOC_TYPE_LETTER = 'patient-letter';

/**
 * Cloud-storage prefix the practice keeps consent forms under
 * (`gs://reco-documents/consent-forms/…`). The frontend cannot address the
 * bucket directly — every binary goes through POST /api/v1/patient-documents —
 * so this is the folder hint sent alongside the upload and the value the
 * backend is expected to key its storage path off. See gap LTR-1.
 */
export const CONSENT_BUCKET = 'reco-documents';
export const CONSENT_PREFIX = 'consent-forms';

/** Filename used for both the browser download and the stored object. */
export function letter_file_name(
  template_name: string,
  patient_id: number,
  iso_date: string,
): string {
  const slug = template_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'letter'}-${patient_id}-${iso_date}.pdf`;
}

/** Sort templates the way the legacy "Select Letter" dropdown did: by name. */
export function sort_templates(rows: LetterTemplateRead[]): LetterTemplateRead[] {
  return rows
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export interface LetterSelection {
  group: LetterGroupCode;
  template_id: number | null;
  envelope_printing: boolean;
  signature_type: SignatureType;
}

export const BLANK_SELECTION: LetterSelection = {
  group: CONSENT_GROUP,
  template_id: null,
  envelope_printing: false,
  signature_type: 'dentist',
};

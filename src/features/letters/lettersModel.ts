// Letters — domain model (legacy Denticon "Letters (New)" dialog).
//
// A letter is a `LetterTemplateRead` row from /api/v1/letter-templates. The
// legacy dialog splits them into "Letter Groups" via the single-character
// `letter_type` code the migration carried over.
//
// Since LTR-2 those codes are labelled by the seeded `LETTERTYPE` definitions
// group, which is the source of truth; the table below is only the fallback for
// an unseeded tenant, and unknown codes still land in an "Other Letters" bucket
// rather than disappearing from the picker.

import type { DefinitionRead, LetterTemplateRead } from '@/api/generated/model';

/** Fallback catalog — used only when the LETTERTYPE group is unseeded. */
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

export type LetterGroupCode = string;

/** code -> label, plus the order the picker should list them in. */
export interface LetterGroupCatalog {
  label: (code: LetterGroupCode) => string;
  order: (code: LetterGroupCode) => number;
  /** True when the labels came from /definitions rather than the fallback. */
  seeded: boolean;
}

const FALLBACK_LABEL = new Map<string, string>(
  LETTER_GROUPS.map((g) => [g.code, g.label]),
);
const FALLBACK_ORDER = new Map<string, number>(
  LETTER_GROUPS.map((g, i) => [g.code, i]),
);

/** Build the catalog from the LETTERTYPE definitions rows (LTR-2). */
export function build_group_catalog(defs: DefinitionRead[] | undefined): LetterGroupCatalog {
  const rows = (defs ?? []).filter((d) => d.key1);
  if (rows.length === 0) {
    return {
      label: (c) => FALLBACK_LABEL.get(c) ?? 'Other Letters',
      order: (c) => FALLBACK_ORDER.get(c) ?? 99,
      seeded: false,
    };
  }
  const by_code = new Map<string, DefinitionRead>(
    rows.map((d) => [String(d.key1).trim().toUpperCase(), d]),
  );
  return {
    label: (c) => by_code.get(c)?.description || FALLBACK_LABEL.get(c) || 'Other Letters',
    order: (c) => by_code.get(c)?.sort_order ?? FALLBACK_ORDER.get(c) ?? 99,
    seeded: true,
  };
}

/** Bucket for a `letter_type` the tenant has no definition row for. */
export const OTHER_GROUP = 'OTHER';

/** Groups whose letters are consent forms — these get a Signature Type and a
 *  patient-consent record on save. */
export const CONSENT_GROUP = 'C';

export function group_code_of(t: LetterTemplateRead): LetterGroupCode {
  return (t.letter_type ?? '').trim().toUpperCase() || OTHER_GROUP;
}

/**
 * Signature Type — the legacy consent dialog's third dropdown. It selects who
 * countersigns the printed consent; the patient signature line is always
 * printed. The selected provider also fills `#DOC_LAST_NAME#`.
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

/**
 * Consent status vocabulary, published by
 * `GET /api/v1/patient-consents/statuses` (LTR-10). Mirrored here for labels
 * and for the badge colours; the endpoint stays authoritative for what is
 * accepted.
 */
export const CONSENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  printed: 'Printed',
  signed: 'Signed',
  declined: 'Declined',
  voided: 'Voided',
};

export const SIGNATURE_METHOD_LABEL: Record<string, string> = {
  drawn: 'Signed on screen',
  scanned: 'Scanned copy',
  verbal: 'Verbal consent',
};

/** A consent that has not been signed/declined/voided can still be signed. */
export function is_signable(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'pending' || s === 'printed';
}

/** Document type recorded on /patient-documents for a generated letter. */
export const DOC_TYPE_CONSENT = 'consent-form';
export const DOC_TYPE_LETTER = 'patient-letter';

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

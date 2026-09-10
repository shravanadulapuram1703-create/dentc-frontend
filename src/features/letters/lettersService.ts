// Letters — backend wiring.
//
// Everything goes through the generated Orval client and passes snake_case
// bodies straight through (CLAUDE.md). After the backend answered LTR-1…12 the
// module talks to:
//
//   /api/v1/letter-templates                        the catalog (153 seeded rows)
//   /api/v1/offices/{id}/letter-templates/effective the office's list, "unassigned = all"
//   /api/v1/letters/merge-fields                    the authoritative 56-token catalog
//   /api/v1/patients/{id}/letter-context            every token resolved, in one call
//   /api/v1/patient-consents                        the consent audit record (+ /sign)
//   /api/v1/patient-documents                       the binary store (GCS-backed)
//
// The client no longer resolves merge values from raw patient/office rows — see
// `mergeFields.ts` for what is left on this side and why.

import {
  listLetterTemplates,
  getLetterTemplate,
  listLetterMergeFields,
  getPatientLetterContext,
  listConsentForms,
} from '@/api/generated/endpoints/communications/communications';
import { listOfficeEffectiveLetterTemplates } from '@/api/generated/endpoints/office-assignment/office-assignment';
import {
  listPatientConsents,
  createPatientConsent,
  signPatientConsent,
  listPatientConsentStatuses,
  listPatientDocuments,
  uploadPatientDocument,
} from '@/api/generated/endpoints/patients/patients';
import { listTreatmentPlans } from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import { listDefinitions } from '@/api/generated/endpoints/metadata/metadata';
import type {
  ConsentSignRequest,
  LetterContextResponse,
  LetterTemplateRead,
  MergeFieldRead,
  PatientConsentRead,
  PatientDocumentRead,
} from '@/api/generated/model';
import { DOC_TYPE_CONSENT, DOC_TYPE_LETTER, sort_templates } from './lettersModel';

/** Backend caps list endpoints at 200 per page. */
const PAGE_SIZE = 200;

export const lettersKeys = {
  templates: ['/api/v1/letter-templates', 'all'] as const,
  officeTemplates: (office_id: number | null) =>
    ['/api/v1/offices/letter-templates/effective', office_id] as const,
  groupDefs: ['/api/v1/definitions', 'LETTERTYPE'] as const,
  mergeFields: ['/api/v1/letters/merge-fields'] as const,
  consentStatuses: ['/api/v1/patient-consents/statuses'] as const,
  consentForms: ['/api/v1/consent-forms'] as const,
  history: (patient_id: number) => ['letters', 'history', patient_id] as const,
  treatmentPlans: (patient_id: number) => ['letters', 'tx-plans', patient_id] as const,
};

// ---------------------------------------------------------------------------
// Template catalog
// ---------------------------------------------------------------------------

/** Every active letter template in the tenant, paged in full and name-sorted. */
export async function loadLetterTemplates(): Promise<LetterTemplateRead[]> {
  const rows: LetterTemplateRead[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const res = await listLetterTemplates({ page, size: PAGE_SIZE, is_active: true });
    rows.push(...(res.items ?? []));
    const total = res.meta?.total ?? rows.length;
    if (rows.length >= total || (res.items?.length ?? 0) < PAGE_SIZE) break;
  }
  return sort_templates(rows);
}

/**
 * Templates offered for `office_id`.
 *
 * LTR-7 pinned the semantic as **unassigned = all** and put it behind
 * `/letter-templates/effective`, so the frontend no longer has to guess: the
 * endpoint returns the full active catalog for an uncurated office and exactly
 * the curated set otherwise. `scoped` says which of the two happened, purely so
 * the dialog can explain itself.
 */
export async function loadOfficeLetterTemplates(
  office_id: number | null,
): Promise<{ rows: LetterTemplateRead[]; scoped: boolean }> {
  if (office_id == null) {
    return { rows: await loadLetterTemplates(), scoped: false };
  }
  try {
    const effective = await listOfficeEffectiveLetterTemplates(office_id);
    const rows = sort_templates((effective ?? []) as LetterTemplateRead[]);
    if (rows.length === 0) return { rows: await loadLetterTemplates(), scoped: false };
    // A curated office returns fewer rows than the tenant catalog; that is the
    // only observable difference, and it only drives a hint in the UI.
    const all = await loadLetterTemplates();
    return { rows, scoped: rows.length < all.length };
  } catch {
    return { rows: await loadLetterTemplates(), scoped: false };
  }
}

export async function loadTemplate(id: number): Promise<LetterTemplateRead> {
  return getLetterTemplate(id);
}

/** LETTERTYPE rows that label the single-character `letter_type` codes (LTR-2). */
export async function loadGroupDefinitions() {
  const res = await listDefinitions({ group_code: 'LETTERTYPE', size: PAGE_SIZE });
  return res.items ?? [];
}

// ---------------------------------------------------------------------------
// Merge catalog + context
// ---------------------------------------------------------------------------

export interface MergeCatalog {
  fields: MergeFieldRead[];
  /** Upper-cased token names, for "is this actually a merge field?". */
  names: Set<string>;
  needs_balance: Set<string>;
  needs_treatment_plan: Set<string>;
}

/** The authoritative 56-token catalog (LTR-5). */
export async function loadMergeCatalog(): Promise<MergeCatalog> {
  const res = await listLetterMergeFields();
  const fields = res.fields ?? [];
  return {
    fields,
    names: new Set(fields.map((f) => f.token.toUpperCase())),
    needs_balance: new Set(
      fields.filter((f) => f.requires_balance).map((f) => f.token.toUpperCase()),
    ),
    needs_treatment_plan: new Set(
      fields.filter((f) => f.requires_treatment_plan).map((f) => f.token.toUpperCase()),
    ),
  };
}

export interface LetterContextInput {
  patient_id: number;
  office_id: number | null;
  treatment_plan_id: string | null;
  /** The account-balance aggregate is the slow one — only for #RP_TOTAL_BAL#. */
  include_balance: boolean;
}

/**
 * The whole merge context in one call (LTR-6, replacing 2–6 round trips).
 * `include_balance` defaults to false server-side; we pass it only when the
 * chosen template actually interpolates the balance.
 */
export async function loadLetterContext(
  input: LetterContextInput,
): Promise<LetterContextResponse> {
  return getPatientLetterContext(input.patient_id, {
    office_id: input.office_id ?? undefined,
    treatment_plan_id: input.treatment_plan_id ?? undefined,
    include_balance: input.include_balance,
  });
}

/** Treatment plans offered when a template needs #TX_PLAN_TH_NUMBER# (LTR-4). */
export async function loadTreatmentPlans(patient_id: number) {
  const res = await listTreatmentPlans({
    patient_id,
    size: 50,
    sort: 'id',
    order: 'desc',
  });
  return res.items ?? [];
}

/** Blank consent masters sitting in the storage bucket (LTR-1 #4). */
export async function loadConsentFormMasters() {
  return listConsentForms();
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export interface SaveLetterInput {
  patient_id: number;
  office_id: number | null;
  template: LetterTemplateRead;
  is_consent: boolean;
  file: File;
  /** Merged, sanitised HTML retained on the consent record for the audit trail. */
  rendered_html: string;
}

export interface SaveLetterResult {
  document: PatientDocumentRead;
  consent: PatientConsentRead | null;
}

/**
 * Persist a generated letter.
 *
 * The PDF goes to /patient-documents. Since LTR-1 that endpoint is object-store
 * backed: `document_type=consent-form` routes the object to
 * `gs://{bucket}/consent-forms/{tenant}/{patient}/{uuid}.pdf` and `file_url`
 * comes back as a fully-qualified HTTPS URL (signed, or the
 * `/patient-documents/{id}/content` proxy). The frontend only has to name the
 * document type correctly — the bucket path is the backend's business.
 *
 * Consent forms additionally get a /patient-consents row so the chart shows
 * what was presented, when, and — once signed — by whom.
 */
export async function saveLetter(input: SaveLetterInput): Promise<SaveLetterResult> {
  const document = await uploadPatientDocument({
    file: input.file,
    patient_id: input.patient_id,
    office_id: input.office_id ?? undefined,
    document_type: input.is_consent ? DOC_TYPE_CONSENT : DOC_TYPE_LETTER,
    description: input.template.name,
  });

  let consent: PatientConsentRead | null = null;
  if (input.is_consent) {
    consent = await createPatientConsent({
      patient_id: input.patient_id,
      template_id: input.template.id,
      title: input.template.name,
      rendered_html: input.rendered_html,
      // "printed" is a documented status (LTR-10): presented on paper, awaiting
      // a signature. It becomes "signed" through the sign endpoint below.
      status: 'printed',
      document_id: document.id,
    });
  }
  return { document, consent };
}

/** The published consent status / signature-method vocabulary (LTR-10). */
export async function loadConsentStatuses() {
  return listPatientConsentStatuses();
}

/**
 * Capture a signature against a consent row (LTR-10).
 *
 * Exactly one of `signature_data` / `document_id` is required for
 * `status: "signed"`; `declined` and `voided` need neither. Re-signing an
 * already-signed consent is a 409 — the first signature is the record.
 */
export async function signConsent(consent_id: number, body: ConsentSignRequest) {
  return signPatientConsent(consent_id, body);
}

export interface LetterHistoryRow {
  key: string;
  kind: 'consent' | 'letter';
  title: string;
  created_at: string;
  status: string;
  signature_method: string | null;
  signer_name: string | null;
  signed_at: string | null;
  declined_reason: string | null;
  document_id: number | null;
  file_name: string | null;
  file_url: string | null;
  storage_backend: string | null;
  consent_id: number | null;
}

/**
 * Everything this patient has had generated: consent records joined to their
 * stored PDF, plus any other letter saved to patient documents.
 *
 * LTR-12 gave the document list a `document_type` filter and the standard
 * paginated envelope, so the two document types are fetched directly instead of
 * pulling the patient's whole document set and filtering in the browser.
 */
export async function loadLetterHistory(patient_id: number): Promise<LetterHistoryRow[]> {
  const documents_of = (document_type: string) =>
    listPatientDocuments({
      patient_id,
      document_type,
      size: PAGE_SIZE,
      sort: 'id',
      order: 'desc',
    })
      .then((r) => r.items ?? [])
      .catch(() => [] as PatientDocumentRead[]);

  const [consents, consent_docs, letter_docs] = await Promise.all([
    listPatientConsents({
      patient_id,
      size: PAGE_SIZE,
      sort: 'id',
      order: 'desc',
    }).catch(() => null),
    documents_of(DOC_TYPE_CONSENT),
    documents_of(DOC_TYPE_LETTER),
  ]);

  const docs = [...consent_docs, ...letter_docs].filter((d) => !d.is_deleted);
  const by_id = new Map(docs.map((d) => [d.id, d]));
  const rows: LetterHistoryRow[] = [];
  const claimed = new Set<number>();

  for (const c of consents?.items ?? []) {
    if (c.is_deleted) continue;
    const doc = c.document_id != null ? by_id.get(c.document_id) : undefined;
    if (doc) claimed.add(doc.id);
    rows.push({
      key: `consent-${c.id}`,
      kind: 'consent',
      title: c.title || 'Consent form',
      created_at: c.created_at,
      status: c.status || 'printed',
      signature_method: c.signature_method ?? null,
      signer_name: c.signer_name ?? null,
      signed_at: c.signed_at ?? null,
      declined_reason: c.declined_reason ?? null,
      document_id: c.document_id ?? null,
      file_name: doc?.file_name ?? null,
      file_url: doc?.file_url ?? null,
      storage_backend: doc?.storage_backend ?? null,
      consent_id: c.id,
    });
  }

  for (const d of docs) {
    if (claimed.has(d.id)) continue;
    rows.push({
      key: `doc-${d.id}`,
      kind: d.document_type === DOC_TYPE_CONSENT ? 'consent' : 'letter',
      title: d.description || d.file_name,
      created_at: d.created_at,
      status: 'printed',
      signature_method: null,
      signer_name: null,
      signed_at: null,
      declined_reason: null,
      document_id: d.id,
      file_name: d.file_name,
      file_url: d.file_url,
      storage_backend: d.storage_backend ?? null,
      consent_id: null,
    });
  }

  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

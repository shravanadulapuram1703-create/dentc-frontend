// Letters — backend wiring.
//
// Everything here goes through the generated Orval client and passes snake_case
// bodies straight through (CLAUDE.md). Three resources are involved:
//
//   /api/v1/letter-templates              the letter catalog (153 seeded rows)
//   /api/v1/offices/{id}/letter-templates the per-office assigned subset
//   /api/v1/patient-consents              the signed-consent audit record
//   /api/v1/patient-documents             the only binary store — the PDF lands here
//
// The merge context is composed from the canonical patient/office/provider
// resources; there is no aggregate "letter context" endpoint (gap LTR-6), and
// no server-side render endpoint (gap LTR-5).

import {
  listLetterTemplates,
  getLetterTemplate,
} from '@/api/generated/endpoints/communications/communications';
import { listOfficeLetterTemplates } from '@/api/generated/endpoints/office-assignment/office-assignment';
import {
  getPatient,
  getResponsibleParty,
  listPatients,
  listReferrals,
  listPatientConsents,
  createPatientConsent,
  listPatientDocuments,
  uploadPatientDocument,
} from '@/api/generated/endpoints/patients/patients';
import { getOffice } from '@/api/generated/endpoints/organization/organization';
import { getPatientBalance } from '@/api/generated/endpoints/billing/billing';
import { listAppointments } from '@/api/generated/endpoints/appointments/appointments';
import type {
  LetterTemplateRead,
  PatientConsentRead,
  PatientDocumentRead,
  PatientRead,
  ProviderRead,
  ResponsiblePartyRead,
} from '@/api/generated/model';
import { fmt_date, money, today_iso } from '@/features/patient-overview/format';
import type { MergeContext } from './mergeFields';
import {
  DOC_TYPE_CONSENT,
  DOC_TYPE_LETTER,
  CONSENT_PREFIX,
  sort_templates,
} from './lettersModel';

/** Backend caps list endpoints at 200 per page. */
const PAGE_SIZE = 200;

export const lettersKeys = {
  templates: ['/api/v1/letter-templates', 'all'] as const,
  officeTemplates: (office_id: number | null) =>
    ['/api/v1/offices/letter-templates', office_id] as const,
  history: (patient_id: number) => ['letters', 'history', patient_id] as const,
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
 * The office↔template assignment table is unseeded on every office we have
 * (gap LTR-7), so an empty assignment falls back to the full catalog. An
 * unseeded join table must never leave the picker with nothing to choose —
 * same rule the shared provider directory enforces.
 */
export async function loadOfficeLetterTemplates(
  office_id: number | null,
): Promise<{ rows: LetterTemplateRead[]; scoped: boolean }> {
  const all = await loadLetterTemplates();
  if (office_id == null) return { rows: all, scoped: false };
  try {
    const assigned = await listOfficeLetterTemplates(office_id);
    const ids = new Set((assigned ?? []).map((a) => a.id));
    if (ids.size === 0) return { rows: all, scoped: false };
    const scoped = all.filter((t) => ids.has(t.id));
    return scoped.length ? { rows: scoped, scoped: true } : { rows: all, scoped: false };
  } catch {
    return { rows: all, scoped: false };
  }
}

/** Full body for one template (the list response already carries body_html,
 *  but a template edited elsewhere is re-read before printing). */
export async function loadTemplate(id: number): Promise<LetterTemplateRead> {
  return getLetterTemplate(id);
}

// ---------------------------------------------------------------------------
// Merge context
// ---------------------------------------------------------------------------

const s = (v: unknown): string => (v == null ? '' : String(v).trim());

function full_name(p: { first_name?: string | null; last_name?: string | null }): string {
  return [s(p.first_name), s(p.last_name)].filter(Boolean).join(' ');
}

function street(a: { address_line1?: string | null; address_line2?: string | null }): string {
  return [s(a.address_line1), s(a.address_line2)].filter(Boolean).join(', ');
}

export interface MergeContextInput {
  patient_id: number;
  office_id: number | null;
  /** Provider chosen for the signature line (consent forms). */
  signer?: ProviderRead | { name?: string | null; last_name?: string | null } | null;
  /** Resolves a provider id to a display name (shared provider directory). */
  provider_label: (id: string | null | undefined) => string;
  /** Only the tokens the chosen template actually uses — lets us skip the
   *  expensive balance lookup unless a collection letter needs it. */
  needed_tokens: Set<string>;
}

export interface LetterContext {
  ctx: MergeContext;
  patient: PatientRead | null;
  office_name: string;
  /** Address lines for the envelope when the template has no dvfrom/dvto. */
  envelope_from: string[];
  envelope_to: string[];
}

/**
 * Compose everything a template can interpolate.
 *
 * Every lookup is best-effort: a letter must still print when the patient has
 * no responsible party, no referral and no upcoming appointment. Failures
 * degrade the affected tokens to blank rather than failing the print.
 */
export async function buildLetterContext(input: MergeContextInput): Promise<LetterContext> {
  const { patient_id, office_id, provider_label, needed_tokens } = input;

  const settle = async <T,>(p: Promise<T>): Promise<T | null> => {
    try {
      return await p;
    } catch {
      return null;
    }
  };

  const patient = await settle(getPatient(patient_id));
  const eff_office_id = office_id ?? patient?.home_office_id ?? null;

  const wants = (t: string) => needed_tokens.has(t);
  const wants_prefix = (p: string) => [...needed_tokens].some((t) => t.startsWith(p));

  const [office, referrals, appointments] = await Promise.all([
    eff_office_id != null ? settle(getOffice(eff_office_id)) : Promise.resolve(null),
    wants_prefix('PAT_REF_')
      ? settle(listReferrals({ patient_id, size: 50 }))
      : Promise.resolve(null),
    wants('APPT_PRDR') || wants('APPT_DATE') || wants('APPT_DATETIME')
      ? settle(listAppointments({ patient_id, size: 50, sort: 'date', order: 'desc' }))
      : Promise.resolve(null),
  ]);

  // Responsible party. `responsible_party_id` is a STRING carrying legacy ids,
  // so the direct GET 404s for migrated accounts — fall back to the patient
  // search that indexes the same column.
  let rp: ResponsiblePartyRead | null = null;
  const rp_id = s(patient?.responsible_party_id);
  if (rp_id && wants_prefix('RP_')) {
    const numeric = Number(rp_id);
    if (Number.isFinite(numeric) && numeric > 0) {
      rp = await settle(getResponsibleParty(numeric));
    }
    if (!rp) {
      const members = await settle(listPatients({ responsible_party_id: rp_id, size: 1 }));
      const head = members?.items?.[0];
      if (head) {
        rp = {
          first_name: head.first_name,
          last_name: head.last_name,
          middle_initial: head.middle_initial,
          address_line1: head.address_line1,
          address_line2: head.address_line2,
          city: head.city,
          state: head.state,
          zip: head.zip,
          email: head.email,
        } as ResponsiblePartyRead;
      }
    }
  }

  // Collection letters are the only templates that need the account balance,
  // and that endpoint is ~20s cold — never fetch it speculatively.
  let total_balance = '';
  if (wants('RP_TOTAL_BAL')) {
    const bal = await settle(getPatientBalance(patient_id));
    const amount = (bal as { balance?: number; total_balance?: number } | null)?.balance;
    if (amount != null) total_balance = money(amount);
  }

  const next_appt = (appointments?.items ?? [])
    .slice()
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))[0];

  const referred_by = (referrals?.items ?? []).find(
    (r) => s(r.referral_type) === '0' || s(r.referral_type).toLowerCase() === 'by',
  );
  const referred_to = (referrals?.items ?? []).find(
    (r) => s(r.referral_type) === '1' || s(r.referral_type).toLowerCase() === 'to',
  );

  const office_block = {
    name: s(office?.name),
    // No corporate/DBA name column exists — the office name is the closest
    // truthful value (gap LTR-3).
    corporate_name: s(office?.name),
    address: office ? street(office) : '',
    city: s(office?.city),
    state: s(office?.state),
    zip: s(office?.zip),
    phone1: s(office?.phone),
    email: s(office?.email),
  };

  const pref_provider_name = provider_label(patient?.preferred_provider_id);

  const signer_full =
    s((input.signer as { name?: string | null } | null)?.name) ||
    full_name((input.signer ?? {}) as { first_name?: string; last_name?: string });

  const ctx: MergeContext = {
    patient: {
      id: String(patient?.id ?? patient_id),
      first_name: s(patient?.preferred_name) || s(patient?.first_name),
      last_name: s(patient?.last_name),
      middle_initial: s(patient?.middle_initial),
      birthdate: patient?.dob ? fmt_date(patient.dob, '') : '',
      address: patient ? street(patient) : '',
      city: s(patient?.city),
      state: s(patient?.state),
      zip: s(patient?.zip),
      home_phone: s(patient?.phone),
      work_phone: s(patient?.work_phone),
      cell_phone: s(patient?.cell_phone),
      email: s(patient?.email),
      last_visit: patient?.last_visit ? fmt_date(patient.last_visit, '') : '',
    },
    responsible_party: {
      first_name: s(rp?.first_name),
      last_name: s(rp?.last_name),
      middle_initial: s(rp?.middle_initial),
      address: rp ? street(rp) : '',
      city: s(rp?.city),
      state: s(rp?.state),
      zip: s(rp?.zip),
      email: s(rp?.email),
      total_balance,
    },
    office: office_block,
    // ProviderRead has no address/phone columns, so the letterhead block falls
    // back to the office the letter is printed from (gap LTR-3).
    preferred_provider: {
      name: pref_provider_name,
      address: office_block.address,
      city: office_block.city,
      state: office_block.state,
      zip: office_block.zip,
      phone: office_block.phone1,
    },
    appointment: {
      provider_name: next_appt
        ? provider_label(next_appt.provider_id) || pref_provider_name
        : pref_provider_name,
      date: next_appt?.date ? fmt_date(next_appt.date, '') : '',
      datetime: next_appt?.date
        ? `${fmt_date(next_appt.date, '')} ${s(next_appt.start_time).slice(0, 5)}`.trim()
        : '',
    },
    referral: {
      referred_by: referred_by ? full_name(referred_by) : s(patient?.referred_by),
      referred_by_address: s(referred_by?.address),
      referred_by_city: s(referred_by?.city),
      referred_by_state: s(referred_by?.state),
      referred_by_zip: s(referred_by?.zip),
      referred_to: referred_to ? full_name(referred_to) : s(patient?.referred_to),
      referred_to_date: patient?.referral_to_date
        ? fmt_date(patient.referral_to_date, '')
        : '',
    },
    signer: {
      last_name: signer_full.split(/[\s,]+/).filter(Boolean).slice(-1)[0] ?? '',
      full_name: signer_full,
    },
    // Local date, never toISOString(): a letter printed on the evening of the
    // 18th in a US timezone must not date itself the 19th.
    today_date: fmt_date(today_iso(), ''),
    appointnow_url: `${window.location.origin}/book/${s(office?.office_code)}`,
  };

  const envelope_from = [
    office_block.name,
    office_block.address,
    [office_block.city, office_block.state].filter(Boolean).join(', ') +
      (office_block.zip ? ` ${office_block.zip}` : ''),
  ].filter((l) => l.trim().length > 0);

  const patient_line = [ctx.patient.first_name, ctx.patient.middle_initial, ctx.patient.last_name]
    .filter(Boolean)
    .join(' ');
  const envelope_to = [
    patient_line,
    ctx.patient.address,
    [ctx.patient.city, ctx.patient.state].filter(Boolean).join(', ') +
      (ctx.patient.zip ? ` ${ctx.patient.zip}` : ''),
  ].filter((l) => l.trim().length > 0);

  return { ctx, patient, office_name: office_block.name, envelope_from, envelope_to };
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
 * The PDF goes to /patient-documents — the only binary store the API exposes.
 * `document_type` carries the storage folder the practice keeps consent forms
 * under (`consent-forms`, i.e. gs://reco-documents/consent-forms/…); the
 * backend owns the bucket path and the frontend cannot address it directly
 * (gap LTR-1). Consent forms additionally get a /patient-consents row so the
 * chart shows what was signed, when, and by whom.
 */
export async function saveLetter(input: SaveLetterInput): Promise<SaveLetterResult> {
  const document = await uploadPatientDocument({
    file: input.file,
    patient_id: input.patient_id,
    office_id: input.office_id ?? undefined,
    document_type: input.is_consent ? DOC_TYPE_CONSENT : DOC_TYPE_LETTER,
    description: input.is_consent
      ? `${CONSENT_PREFIX}/${input.template.name}`
      : input.template.name,
  });

  let consent: PatientConsentRead | null = null;
  if (input.is_consent) {
    consent = await createPatientConsent({
      patient_id: input.patient_id,
      template_id: input.template.id,
      title: input.template.name,
      rendered_html: input.rendered_html,
      // Printed for wet signature — it becomes "signed" when the scanned copy
      // comes back. There is no e-signature capture on this screen yet.
      status: 'printed',
      document_id: document.id,
    });
  }
  return { document, consent };
}

export interface LetterHistoryRow {
  key: string;
  kind: 'consent' | 'letter';
  title: string;
  created_at: string;
  status: string;
  document_id: number | null;
  file_name: string | null;
  file_url: string | null;
  consent_id: number | null;
}

/** Everything this patient has had generated: consent records + letter PDFs. */
export async function loadLetterHistory(patient_id: number): Promise<LetterHistoryRow[]> {
  const [consents, documents] = await Promise.all([
    listPatientConsents({ patient_id, size: PAGE_SIZE, sort: 'id', order: 'desc' }).catch(
      () => null,
    ),
    // Unpaged by design: /patient-documents takes only patient_id.
    listPatientDocuments({ patient_id }).catch(() => null),
  ]);

  const docs = (documents ?? []).filter((d) => !d.is_deleted);
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
      status: c.signed_at ? 'Signed' : c.status || 'printed',
      document_id: c.document_id ?? null,
      file_name: doc?.file_name ?? null,
      file_url: doc?.file_url ?? null,
      consent_id: c.id,
    });
  }

  for (const d of docs) {
    if (claimed.has(d.id)) continue;
    if (d.document_type !== DOC_TYPE_LETTER && d.document_type !== DOC_TYPE_CONSENT) continue;
    rows.push({
      key: `doc-${d.id}`,
      kind: d.document_type === DOC_TYPE_CONSENT ? 'consent' : 'letter',
      title: d.description || d.file_name,
      created_at: d.created_at,
      status: 'Printed',
      document_id: d.id,
      file_name: d.file_name,
      file_url: d.file_url,
      consent_id: null,
    });
  }

  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

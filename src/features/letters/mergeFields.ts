// Letters — merge-field engine.
//
// Legacy templates embed merge fields as `#TOKEN#` (a handful of the newer
// e-mail templates use `{{TOKEN}}`; both forms are supported). Across the 153
// seeded templates there are 56 distinct tokens — the full catalog is below, so
// an unresolved token is a deliberate, logged gap rather than a surprise.
//
// Rendering rule: a token that resolves to an empty value collapses to an empty
// string, NOT to the literal token, so a letter never prints "#RP_EMAIL#" at a
// patient. Tokens that have no backend source at all are listed in
// UNRESOLVABLE_TOKENS and reported to the caller so the preview can warn.

/** Everything a template can interpolate. All values already formatted. */
export interface MergeContext {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    middle_initial: string;
    birthdate: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    home_phone: string;
    work_phone: string;
    cell_phone: string;
    email: string;
    last_visit: string;
  };
  responsible_party: {
    first_name: string;
    last_name: string;
    middle_initial: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    total_balance: string;
  };
  office: {
    name: string;
    corporate_name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone1: string;
    email: string;
  };
  /** Patient's preferred provider + the address block printed above it. */
  preferred_provider: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  /** Provider on the appointment the letter is about (or the preferred one). */
  appointment: {
    provider_name: string;
    date: string;
    datetime: string;
  };
  referral: {
    referred_by: string;
    referred_by_address: string;
    referred_by_city: string;
    referred_by_state: string;
    referred_by_zip: string;
    referred_to: string;
    referred_to_date: string;
  };
  /** Signing clinician chosen via the dialog's Signature Type. */
  signer: { last_name: string; full_name: string };
  today_date: string;
  /** Public booking link used by the AppointNow e-mail templates. */
  appointnow_url: string;
}

type Resolver = (c: MergeContext) => string;

/**
 * The complete token catalog. Keys are the bare token name (no delimiters);
 * `#PAT_PREF_PROV_Address#` is matched case-insensitively because the seeded
 * templates mix casing on that one token.
 */
const TOKENS: Record<string, Resolver> = {
  // --- Patient -------------------------------------------------------------
  PAT_ID: (c) => c.patient.id,
  PAT_FIRST_NAME: (c) => c.patient.first_name,
  PAT_NAME_FIRST: (c) => c.patient.first_name, // legacy alias, 1 template
  PAT_LAST_NAME: (c) => c.patient.last_name,
  PAT_MID_INITIAL: (c) => c.patient.middle_initial,
  PAT_BIRTHDATE: (c) => c.patient.birthdate,
  PAT_ADDRESS: (c) => c.patient.address,
  PAT_CITY: (c) => c.patient.city,
  PAT_STATE: (c) => c.patient.state,
  PAT_ZIP: (c) => c.patient.zip,
  PAT_HOMEPHONE: (c) => c.patient.home_phone,
  PAT_WORKPHONE: (c) => c.patient.work_phone,
  PAT_CELLPHONE: (c) => c.patient.cell_phone,
  PAT_EMAIL: (c) => c.patient.email,
  LASTVISIT_DATE: (c) => c.patient.last_visit,

  // --- Responsible party ---------------------------------------------------
  RP_FIRST_NAME: (c) => c.responsible_party.first_name,
  RP_LAST_NAME: (c) => c.responsible_party.last_name,
  RP_MID_INITIAL: (c) => c.responsible_party.middle_initial,
  RP_ADDRESS: (c) => c.responsible_party.address,
  RP_CITY: (c) => c.responsible_party.city,
  RP_STATE: (c) => c.responsible_party.state,
  RP_ZIP: (c) => c.responsible_party.zip,
  RP_EMAIL: (c) => c.responsible_party.email,
  RP_TOTAL_BAL: (c) => c.responsible_party.total_balance,

  // --- Office --------------------------------------------------------------
  OFFICE_NAME: (c) => c.office.name,
  OFFICE_CNAME: (c) => c.office.corporate_name,
  OFFICE_ADDRESS: (c) => c.office.address,
  OFFICE_CITY: (c) => c.office.city,
  OFFICE_STATE: (c) => c.office.state,
  OFFICE_ZIP: (c) => c.office.zip,
  OFFICE_PHONE1: (c) => c.office.phone1,
  OFFICE_EMAIL: (c) => c.office.email,

  // --- "Marketing" block. Legacy stored a separate marketing/practice address
  //     per office; DentC has no such resource, so these fall back to the
  //     office block (gap LTR-3).
  MARKET_NAME: (c) => c.office.name,
  MARKET_ADDRESS: (c) => c.office.address,
  MARKET_CITY: (c) => c.office.city,
  MARKET_STATE: (c) => c.office.state,
  MARKET_ZIP: (c) => c.office.zip,
  MARKET_PHONE: (c) => c.office.phone1,

  // --- Preferred provider (letterhead "from" block) ------------------------
  PAT_PREF_PROV: (c) => c.preferred_provider.name,
  PAT_PREF_PROV_ADDRESS: (c) => c.preferred_provider.address,
  PAT_PREF_PROV_CITY: (c) => c.preferred_provider.city,
  PAT_PREF_PROV_STATE: (c) => c.preferred_provider.state,
  PAT_PREF_PROV_ZIP: (c) => c.preferred_provider.zip,
  PAT_PREF_PROV_PHONE: (c) => c.preferred_provider.phone,

  // --- Appointment ---------------------------------------------------------
  APPT_PRDR: (c) => c.appointment.provider_name,
  APPT_DATE: (c) => c.appointment.date,
  APPT_DATETIME: (c) => c.appointment.datetime,

  // --- Referral ------------------------------------------------------------
  PAT_REF_BY: (c) => c.referral.referred_by,
  PAT_REF_BY_ADDRESS: (c) => c.referral.referred_by_address,
  PAT_REF_BY_CITY: (c) => c.referral.referred_by_city,
  PAT_REF_BY_STATE: (c) => c.referral.referred_by_state,
  PAT_REF_BY_ZIP: (c) => c.referral.referred_by_zip,
  PAT_REF_TO: (c) => c.referral.referred_to,
  PAT_REF_TO_DATE: (c) => c.referral.referred_to_date,

  // --- Misc ----------------------------------------------------------------
  TODAY_DATE: (c) => c.today_date,
  DOC_LAST_NAME: (c) => c.signer.last_name,
  URL_APPOINTNOW: (c) => c.appointnow_url,
};

/**
 * Tokens present in seeded templates that no backend resource can currently
 * fill. They render as blank and are surfaced in the preview's warning strip.
 *   TX_PLAN_TH_NUMBER — the letter dialog has no treatment-plan/tooth context
 *                       to bind to (gap LTR-4).
 */
export const UNRESOLVABLE_TOKENS = new Set(['TX_PLAN_TH_NUMBER']);

const TOKEN_RE = /#([A-Za-z0-9_]{2,40})#|\{\{\s*([A-Za-z0-9_]{2,40})\s*\}\}/g;

export interface MergeResult {
  html: string;
  /** Tokens found in the template that produced no value, for the warning strip. */
  unresolved: string[];
}

/**
 * Substitute every merge field in `body_html`.
 *
 * Values are HTML-escaped before insertion — template bodies are HTML, and
 * patient-entered data (an address containing `&` or `<`) must not be able to
 * inject markup into a printed consent form.
 */
export function merge_letter(body_html: string, ctx: MergeContext): MergeResult {
  const unresolved = new Set<string>();
  const html = (body_html ?? '').replace(TOKEN_RE, (whole, hash, curly) => {
    const name = String(hash ?? curly ?? '');
    const key = name.toUpperCase();
    const resolver = TOKENS[key];
    if (!resolver) {
      unresolved.add(name);
      return '';
    }
    const value = (resolver(ctx) ?? '').trim();
    if (!value) unresolved.add(name);
    return escape_html(value);
  });
  return { html, unresolved: [...unresolved].sort() };
}

/** List the merge fields a template uses, for the "Merge fields" preview hint. */
export function tokens_in(body_html: string): string[] {
  const found = new Set<string>();
  for (const m of (body_html ?? '').matchAll(TOKEN_RE)) {
    found.add(String(m[1] ?? m[2]));
  }
  return [...found].sort();
}

export function escape_html(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

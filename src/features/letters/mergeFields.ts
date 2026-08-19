// Letters — merge-field substitution.
//
// Since LTR-5/LTR-6 the backend owns **what every token means**: the 56-token
// catalog comes from `GET /api/v1/letters/merge-fields` and the resolved values
// come from `GET /api/v1/patients/{id}/letter-context`. This module no longer
// resolves anything from raw patient/office rows — it only
//
//   1. finds the placeholders in a template body,
//   2. substitutes the server's values, and
//   3. fills the short, explicit list of *residuals* below.
//
// Why substitute here instead of using `POST /letters/render`'s `rendered_html`
// directly: the render endpoint replaces an unresolved token with an empty
// string, so by the time the HTML comes back the placeholder is gone and
// `#DOC_LAST_NAME#` — which depends on the Signing Provider the user picks in
// the dialog, something the server cannot know — can no longer be filled. Doing
// the substitution client-side keeps that one UI-owned token working while
// every *value* still comes from the backend. See LTR-15: once
// `/letters/render` accepts caller overrides this module can shrink to nothing.

import type { LetterContextResponse } from '@/api/generated/model';

/** `#TOKEN#`, plus the `{{TOKEN}}` form a few e-mail templates use. */
const TOKEN_RE = /#([A-Za-z0-9_]{2,40})#|\{\{\s*([A-Za-z0-9_]{2,40})\s*\}\}/g;

export interface MergeResult {
  html: string;
  /** Catalog tokens the template used that resolved to nothing (print blank). */
  unresolved: string[];
  /** Placeholders that are not in the backend catalog at all — the drift alarm. */
  unknown: string[];
}

/**
 * Residual values the backend cannot or does not currently supply.
 *
 * Each entry is a defect or a structural limit, and each disappears on its own:
 * a residual is only applied when the server left the token empty, so the day
 * the backend fills it this map stops mattering.
 */
export interface ResidualInput {
  context: LetterContextResponse | null;
  /** Signing Provider chosen in the dialog — the source for #DOC_LAST_NAME#. */
  signer_name: string;
  /** Shared provider directory, for ids the context returns unresolved. */
  provider_label: (id: string | null | undefined) => string;
  /** Today in the browser's local date, formatted MM/DD/YYYY. */
  local_today: string;
}

/**
 * Candidate names for the "which clock produced `today`" field the backend
 * returns once LTR-14 is deployed. Its mere presence is the version marker: a
 * build that reports the timezone is the build that computes `today` in the
 * printing office's zone, which is strictly more correct than the workstation's
 * (a remote biller's laptop is not in the practice's timezone). Several spellings
 * are accepted so the probe cannot be broken by a naming choice.
 */
const TZ_KEYS = ['timezone', 'office_timezone', 'tz', 'today_timezone'] as const;

/**
 * True when the server dates letters in the office's timezone (LTR-14 shipped).
 * Until then the backend dates them from UTC — a consent printed at 22:05 on the
 * 18th in a US practice comes back dated the 19th — and the workstation's local
 * date is the closer truth, so `#TODAY_DATE#` is overridden.
 *
 * This makes the override retire itself on deploy: no second frontend change is
 * needed, and there is never a window where both sides fight over the date.
 */
function server_dates_in_office_tz(context: LetterContextResponse | null): boolean {
  if (!context) return false;
  const bag = context as unknown as Record<string, unknown>;
  return TZ_KEYS.some((k) => typeof bag[k] === 'string' && (bag[k] as string).trim() !== '');
}

function residual_values(input: ResidualInput): Record<string, string> {
  const { context, signer_name, provider_label, local_today } = input;
  const out: Record<string, string> = {
    // The dialog's Signing Provider. The server has no notion of who is about
    // to countersign, so this token is unresolved by construction. (LTR-15 adds
    // `overrides` to /letters/render, which will move this server-side too.)
    DOC_LAST_NAME: signer_name.split(/[\s,]+/).filter(Boolean).slice(-1)[0] ?? '',
  };
  if (!server_dates_in_office_tz(context)) out.TODAY_DATE = local_today;

  // LTR-13: the context returns `last_appointment` but leaves #APPT_PRDR# /
  // #APPT_DATE# blank when there is no *upcoming* appointment — so a consent
  // form prints "request that Dr.  and their assistants perform …". Fall back
  // to the last visit's provider, which is what the legacy letter meant.
  const appt = context?.next_appointment ?? context?.last_appointment ?? null;
  if (appt) {
    const name =
      context?.next_appointment_provider?.name?.trim() ||
      provider_label(appt.provider_id) ||
      '';
    out.APPT_PRDR = name;
    out.APPT_DATE = fmt_us_date(appt.date);
    out.APPT_DATETIME = `${fmt_us_date(appt.date)} ${(appt.start_time ?? '').slice(0, 5)}`.trim();
  }
  return out;
}

/** YYYY-MM-DD -> MM/DD/YYYY, formatted from parts so it cannot shift a day. */
function fmt_us_date(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

/**
 * Merge a template body.
 *
 * `server_values` is `letter_context.merge_fields` — every catalog token already
 * resolved for this patient. `catalog` is the set of known token names, used to
 * tell "resolved to nothing" apart from "not a merge field at all".
 *
 * Values are HTML-escaped before insertion: template bodies are HTML, and
 * patient-entered data (an address containing `&` or `<`) must not be able to
 * inject markup into a printed consent form.
 */
export function merge_letter(
  body_html: string,
  server_values: Record<string, string | null | undefined>,
  catalog: Set<string>,
  residual: ResidualInput,
): MergeResult {
  const extras = residual_values(residual);
  const unresolved = new Set<string>();
  const unknown = new Set<string>();

  const html = (body_html ?? '').replace(TOKEN_RE, (_whole, hash, curly) => {
    const name = String(hash ?? curly ?? '');
    const key = name.toUpperCase();

    if (!catalog.has(key)) {
      unknown.add(name);
      return '';
    }

    // The server is authoritative for every value it resolves; a residual only
    // fills what came back empty, so each one retires itself the day the
    // backend fills that token. TODAY_DATE is the single exception and it is
    // gated on the version probe above, not asserted unconditionally.
    const from_server = (server_values[key] ?? '').trim();
    const override = extras[key];
    const value = override !== undefined && (key === 'TODAY_DATE' || !from_server)
      ? override
      : from_server;

    if (!value) unresolved.add(name);
    return escape_html(value);
  });

  return {
    html,
    unresolved: [...unresolved].sort(),
    unknown: [...unknown].sort(),
  };
}

/** List the merge fields a template uses — drives the letter-context params. */
export function tokens_in(body_html: string): string[] {
  const found = new Set<string>();
  for (const m of (body_html ?? '').matchAll(TOKEN_RE)) {
    found.add(String(m[1] ?? m[2]).toUpperCase());
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

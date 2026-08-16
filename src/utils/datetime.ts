/**
 * Date/time formatting helpers.
 *
 * Backend timestamps come back as ISO UTC strings. Audit/login displays must be
 * shown in US time with an explicit zone label (KAN-19) rather than the viewer's
 * local timezone, so the practice always reads a consistent US clock.
 */

/** US timezone used for all audit/login displays. */
export const US_DISPLAY_TIME_ZONE = "America/New_York";

/**
 * Format an ISO (UTC) timestamp in US Eastern time with a zone label,
 * e.g. "Jun 21, 2026, 06:55 PM EDT". Returns `fallback` for empty input and
 * echoes the original string if it can't be parsed.
 */
export function formatUsDateTime(
  iso?: string | null,
  fallback = "—"
): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: US_DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

// ── Date-of-birth entry (KAN-37) ────────────────────────────────────────────
//
// `<input type="date">` is not a hard stop on its own: the browser still lets a
// user type a future date, and Chrome accepts a 5-/6-digit year, which produced
// values like "202567-01-01" and a raw "Request failed with status code 422"
// from the backend. Every DOB entry point validates through here instead, so the
// form stops the user with its own message before anything is sent.

/** Earliest birth date the practice accepts. */
export const MIN_DOB_ISO = "1900-01-01";

/** `YYYY-MM-DD` for today in the viewer's local timezone. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Validate a `YYYY-MM-DD` birth date. Returns an error message to show inline,
 * or `null` when the value is acceptable.
 *
 * Comparisons are done on the ISO strings rather than `Date` objects: an ISO
 * date sorts lexicographically, which sidesteps the UTC-vs-local off-by-one that
 * `new Date("2000-01-15")` introduces for US viewers.
 */
export function validateDob(
  value: string,
  { required = true }: { required?: boolean } = {}
): string | null {
  const dob = value.trim();
  if (!dob) return required ? "Birth date is required" : null;

  // Also rejects the 5-/6-digit years Chrome allows in a date input.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return "Enter a valid birth date (MM/DD/YYYY)";
  }

  const [year, month, day] = dob.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return "Enter a valid birth date (MM/DD/YYYY)";
  }

  if (dob > todayIsoDate()) return "Birth date cannot be in the future";
  if (dob < MIN_DOB_ISO) return "Birth date must be on or after 01/01/1900";

  return null;
}

/**
 * Whole years between `dob` (`YYYY-MM-DD`) and today, or `""` when the date is
 * missing or not usable. Parsed from parts so the age doesn't shift by a day
 * around the birthday for viewers behind UTC.
 */
export function ageFromDob(dob: string): string {
  if (validateDob(dob)) return "";

  const [year, month, day] = dob.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--;

  return age >= 0 ? age.toString() : "";
}

// Phone-number helpers for the patient SMS module.
//
// Twilio requires E.164 (`+14125551234`). Legacy DentC rows store bare
// 10-digit US numbers (`4125551234`) and occasionally already-normalized
// `+1…` values, so every send normalizes first and every render formats.

/** Digits only. */
export function digitsOf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Normalize to E.164, assuming US/Canada (+1) when the number is 10 digits.
 * Returns `null` when the input cannot be a dialable number.
 */
export function toE164(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const d = digitsOf(raw);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  // Already international (any leading + with 8–15 digits).
  if (raw.startsWith("+") && d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
}

/** `(412) 555-1234` for US numbers; other numbers are returned as E.164 or as-is. */
export function formatPhone(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const d = digitsOf(raw);
  const us = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : null;
  if (us) return `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`;
  return toE164(raw) ?? raw;
}

/** True when the two values refer to the same dialable number. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const ea = toE164(a);
  const eb = toE164(b);
  return !!ea && !!eb && ea === eb;
}

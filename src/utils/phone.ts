// US phone helpers.
//
// Phone inputs across the app were plain text boxes, so a field would happily
// accept "77788889999523". These keep the typed value to ten digits, present it
// the way the rest of the UI shows numbers, and let a caller tell a complete
// number from a half-typed one.

/** Digits only, capped at the ten a US number has. */
export const phoneDigits = (value: string | null | undefined): string =>
  (value ?? "").replace(/\D/g, "").slice(0, 10);

/**
 * Format for display as the user types: "5551234567" -> "(555) 123-4567".
 * Anything past ten digits is dropped, so the input cannot overrun.
 */
export function formatUSPhone(value: string | null | undefined): string {
  const d = phoneDigits(value);
  if (d.length === 0) return "";
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** True once the field holds a full ten-digit number. */
export const isCompleteUSPhone = (value: string | null | undefined): boolean =>
  phoneDigits(value).length === 10;

/** True when something has been typed but it is not yet a whole number. */
export const isPartialUSPhone = (value: string | null | undefined): boolean => {
  const n = phoneDigits(value).length;
  return n > 0 && n < 10;
};

/** The longest a formatted number gets — use as the input's maxLength. */
export const US_PHONE_MAX_LENGTH = 14; // (555) 123-4567

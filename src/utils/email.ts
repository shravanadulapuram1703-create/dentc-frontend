// Email validation shared by the forms that collect one.
//
// `<input type="email">` alone does not stop a form being submitted with a bad
// address — the browser only enforces it inside a native form submit, which
// these React screens do not use. So values like "trm" reached the backend and
// came back as an opaque 422 (the API models these as EmailStr).

/**
 * A pragmatic address check: one @, no whitespace, and a dotted domain with a
 * plausible TLD. Deliberately not RFC 5322 — the goal is catching typos before
 * the request, not reimplementing the spec.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

export const isValidEmail = (value: string | null | undefined): boolean =>
  EMAIL_RE.test((value ?? "").trim());

/** True once something has been typed that is not yet a valid address. */
export const isInvalidEmail = (value: string | null | undefined): boolean => {
  const v = (value ?? "").trim();
  return v.length > 0 && !EMAIL_RE.test(v);
};

/** Message to show under an email field, or "" when there is nothing to say. */
export const emailError = (value: string | null | undefined): string =>
  isInvalidEmail(value) ? "Enter a valid email address, e.g. name@example.com." : "";

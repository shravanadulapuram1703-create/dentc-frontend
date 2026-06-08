/**
 * Shared password complexity policy for all "create / reset password" flows
 * (reset-password, legacy activation, and ideally Change My Password).
 *
 * The minimum length (8) matches the backend `ChangePasswordRequest.new_password`
 * `@minLength 8` constraint in the generated client.
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  { id: "lowercase", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "A number", test: (p) => /\d/.test(p) },
  {
    id: "symbol",
    label: "A symbol (!@#$…)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export interface PasswordValidation {
  /** True when every rule passes. */
  valid: boolean;
  /** Rules that currently fail (for inline hints). */
  failed: PasswordRule[];
  /** Number of satisfied rules, 0..PASSWORD_RULES.length. */
  satisfied: number;
  /** 0 (empty) .. PASSWORD_RULES.length — drives the strength meter. */
  score: number;
}

export function validatePassword(password: string): PasswordValidation {
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(password));
  const satisfied = PASSWORD_RULES.length - failed.length;
  return {
    valid: failed.length === 0,
    failed,
    satisfied,
    score: password.length === 0 ? 0 : satisfied,
  };
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

/**
 * Returns the first user-facing problem with a new-password / confirm pair,
 * or `null` when the pair is acceptable. Use to gate submit + show one message.
 */
export function describePasswordProblem(
  password: string,
  confirm: string,
): string | null {
  const { valid, failed } = validatePassword(password);
  if (!valid) return `Password must include: ${failed.map((r) => r.label.toLowerCase()).join(", ")}.`;
  if (!passwordsMatch(password, confirm)) return "Passwords do not match.";
  return null;
}

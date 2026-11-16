/**
 * Shared password complexity policy for all "create / reset password" flows
 * (reset-password, legacy activation, and ideally Change My Password).
 *
 * Mirrors the server policy `app/core/password_policy.py` (PWD-RBAC-3), enforced on
 * every endpoint that sets a password (create user, admin reset, change-password,
 * forgot-password reset, legacy activation, signup) → 422 `password_too_weak` with
 * `details.failed_rules`. Rule `id`s ARE the server rule codes, in the server's
 * order (also published at GET /auth/password-policy), so `failed_rules` maps 1:1.
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "min_length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  { id: "lowercase", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "A number", test: (p) => /\d/.test(p) },
  {
    id: "symbol",
    label: "A symbol (!@#$…)",
    // Whitespace is NOT a symbol (server: `[^A-Za-z0-9\s]`).
    test: (p) => /[^A-Za-z0-9\s]/.test(p),
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

/* -------------------- Server error mapping -------------------- */

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

function apiErrorOf(err: unknown): { status?: number; code?: string; message?: string; details?: unknown } {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } } | null)?.response;
  const body = response?.data?.error;
  return { status: response?.status, code: body?.code, message: body?.message, details: body?.details };
}

/**
 * User-facing message for the password-specific server errors, or `null` when the
 * error is something else (let the caller's generic handling run):
 *  - 422 `password_too_weak`            → lists the failed rules (PWD-RBAC-3)
 *  - 403 `own_password_self_service`    → own password belongs on My Page (PWD-RBAC-1)
 *  - 403 `password_reset_not_permitted` → caller is not an administrator (PWD-RBAC-1)
 */
export function describePasswordApiError(err: unknown): string | null {
  const { code, message, details } = apiErrorOf(err);
  if (code === "password_too_weak") {
    const failed = (details as { failed_rules?: unknown } | null)?.failed_rules;
    const labels = Array.isArray(failed)
      ? failed.map((c) => PASSWORD_RULES.find((r) => r.id === c)?.label ?? String(c))
      : [];
    return labels.length
      ? `Password must include: ${labels.map((l) => l.toLowerCase()).join(", ")}.`
      : message ?? "Password does not meet the complexity policy.";
  }
  if (code === "own_password_self_service") {
    return "You can't reset your own password here. Change it from My Page → Account & Settings.";
  }
  if (code === "password_reset_not_permitted") {
    return "Only administrators can reset another user's password.";
  }
  return null;
}

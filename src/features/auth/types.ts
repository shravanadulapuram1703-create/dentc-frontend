/**
 * Typed contracts for the authentication workflows whose backend endpoints are
 * not yet implemented (forgot/reset password, legacy-user activation).
 *
 * All field names are snake_case to match the DentC backend + generated Orval
 * client (see CLAUDE.md). Once the backend ships these endpoints and
 * `npm run api:sync` regenerates the client, these can be replaced by the
 * generated model types and the calls swapped to the generated hooks.
 *
 * Backend gaps are documented in
 * `docs/authentication/authentication_backend_devreport.md`.
 */

/* -------------------- FORGOT / RESET PASSWORD -------------------- */

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ValidateResetTokenRequest {
  token: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
  /** Optional: the email the token belongs to, for display ("Resetting … for x@y"). */
  email?: string | null;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

/* -------------------- LEGACY USER ACTIVATION -------------------- */

/**
 * Verification channels the activation wizard is built to support. Only the
 * channel returned by the verify endpoint is active for a given user; the
 * others are rendered as forward-compatible placeholders.
 */
export type VerificationMethod = "email" | "otp" | "magic_link";

export interface LegacyVerifyRequest {
  username_or_email: string;
}

export interface LegacyVerifyResponse {
  /** Whether a matching legacy account exists and may be activated. */
  eligible: boolean;
  /** Rule 2: once true, activation is blocked and the user must use Forgot Password. */
  legacy_activation_completed: boolean;
  /** Which verification channel the backend initiated for this user. */
  verification_method: VerificationMethod;
  /** Masked destination for display, e.g. "s•••@dental.local". */
  masked_email?: string | null;
  /** Short-lived token tying the create-password step to this verification. */
  activation_token?: string | null;
}

export interface LegacyCreatePasswordRequest {
  /** Echoed back from the verify step so the backend can resolve the user. */
  username_or_email: string;
  new_password: string;
  /** The token issued by the verify step, when the backend uses one. */
  activation_token?: string | null;
}

export interface LegacyCreatePasswordResponse {
  message: string;
}

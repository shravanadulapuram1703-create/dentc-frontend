import { AxiosError } from "axios";

/**
 * Classifies authentication failures into a small set of kinds so the UI can
 * show a specific, user-friendly message instead of a single generic one.
 *
 * The HTTP status → kind mapping assumes the backend standardizes the responses
 * documented in `docs/authentication/authentication_backend_devreport.md`:
 *   401 invalid credentials · 403 disabled · 423 locked · 429 rate-limited.
 */
export type AuthErrorKind =
  | "invalid_credentials"
  | "account_disabled"
  | "account_locked"
  | "rate_limited"
  | "not_available"
  | "network"
  | "unknown";

export interface AuthError {
  kind: AuthErrorKind;
  message: string;
}

const DEFAULT_MESSAGES: Record<AuthErrorKind, string> = {
  invalid_credentials: "Incorrect username/email or password.",
  account_disabled:
    "This account is disabled. Please contact your administrator.",
  account_locked:
    "This account is temporarily locked after too many attempts. Try again later or reset your password.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  not_available:
    "This feature isn't available yet. Please contact your administrator.",
  network: "Unable to reach the server. Check your connection and try again.",
  unknown: "Something went wrong. Please try again.",
};

/** Pulls a human-readable detail string out of a backend error body, if any. */
function extractDetail(error: AxiosError): string | undefined {
  const data = error.response?.data as
    | { error?: { message?: string }; detail?: string; message?: string }
    | undefined;
  return data?.error?.message ?? data?.detail ?? data?.message ?? undefined;
}

export function mapAuthError(error: unknown): AuthError {
  if (error instanceof AxiosError) {
    // No response → network / CORS / server unreachable.
    if (!error.response) return { kind: "network", message: DEFAULT_MESSAGES.network };

    const status = error.response.status;
    const detail = extractDetail(error);

    let kind: AuthErrorKind;
    switch (status) {
      case 401:
        kind = "invalid_credentials";
        break;
      case 403:
        kind = "account_disabled";
        break;
      case 423:
        kind = "account_locked";
        break;
      case 429:
        kind = "rate_limited";
        break;
      case 404:
      case 405:
      case 501:
      case 502:
      case 503:
        // Endpoint not implemented yet (forgot/reset/legacy) or gateway down.
        kind = "not_available";
        break;
      default:
        kind = "unknown";
    }

    // Prefer a precise backend message for 4xx where it's safe to surface;
    // fall back to the curated default for the kind.
    const useBackendDetail =
      detail && (status === 400 || status === 422 || kind === "unknown");
    return { kind, message: useBackendDetail ? detail! : DEFAULT_MESSAGES[kind] };
  }

  if (error instanceof Error && error.message) {
    return { kind: "unknown", message: DEFAULT_MESSAGES.unknown };
  }

  return { kind: "unknown", message: DEFAULT_MESSAGES.unknown };
}

import api from "@/services/api";
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LegacyCreatePasswordRequest,
  LegacyCreatePasswordResponse,
  LegacyVerifyRequest,
  LegacyVerifyResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ValidateResetTokenRequest,
  ValidateResetTokenResponse,
} from "../types";

/**
 * Hand-written service for the authentication endpoints that do not yet exist
 * in the backend / generated Orval client (forgot-password, reset-password,
 * legacy-user verify + create-password).
 *
 * It reuses the shared axios instance (`src/services/api.ts`) so it inherits the
 * base URL and interceptors. Bodies are passed through as snake_case unchanged.
 *
 * Until the backend ships these routes, calls reject with a 404 — callers map
 * that via `mapAuthError` to a friendly "not available yet" message. No fake
 * client-side authentication is performed.
 *
 * Backend gaps: docs/authentication/authentication_backend_devreport.md
 */
export const authExtrasService = {
  /* ---------- Forgot / reset password ---------- */

  async forgotPassword(
    body: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    const res = await api.post("/api/v1/auth/forgot-password", body);
    return res.data;
  },

  async validateResetToken(
    body: ValidateResetTokenRequest,
  ): Promise<ValidateResetTokenResponse> {
    const res = await api.post("/api/v1/auth/reset-password/validate", body);
    return res.data;
  },

  async resetPassword(
    body: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const res = await api.post("/api/v1/auth/reset-password", body);
    return res.data;
  },

  /* ---------- Legacy user activation ---------- */

  async legacyVerify(
    body: LegacyVerifyRequest,
  ): Promise<LegacyVerifyResponse> {
    const res = await api.post("/api/v1/auth/legacy-user/verify", body);
    return res.data;
  },

  async legacyCreatePassword(
    body: LegacyCreatePasswordRequest,
  ): Promise<LegacyCreatePasswordResponse> {
    const res = await api.post("/api/v1/auth/legacy-user/create-password", body);
    return res.data;
  },
};

export default authExtrasService;

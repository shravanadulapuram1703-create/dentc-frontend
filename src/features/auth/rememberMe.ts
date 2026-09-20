/**
 * "Remember me" support for the login screen.
 *
 * The checkbox remembers only the *username/email* (never the password), so the
 * login form can pre-fill it on the next visit. It does NOT change how long the
 * session stays signed in.
 */

import { lastPatientKeys } from "@/features/patient-context/lastPatientStorage";
import { claimFillOutKeys } from "@/components/patient/claimFillOut";
import { adaLocalStoreKeys } from "@/features/claims/ada/adaLocalStores";
import { officeScopeKeys } from "@/features/office-scope/officeScopeStorage";

/** localStorage key holding the remembered username/email for login pre-fill. */
export const REMEMBERED_IDENTIFIER_KEY = "remembered_identifier";

/**
 * Clear all auth/session data from localStorage (on logout or a 401), but
 * PRESERVE keys that must outlive a session:
 *   - the "Remember me" identifier, so the login screen can still pre-fill it,
 *   - every per-user "last selected patient" key, so the app reopens the same
 *     patient after the user logs back in (persistent default patient),
 *   - every claim fill-out record, which the backend has nowhere to store yet
 *     (CLM-FO-1) and would otherwise be destroyed by a session timeout,
 *   - every per-user "last-used office" key (`dentc:last_office:<userId>`), so
 *     the working office is remembered per user across a re-login — login
 *     re-seeds from it before falling back to the home office.
 * Without this, `localStorage.clear()` would wipe all of them.
 */
export function clearAuthStorageKeepRemembered(): void {
  const preserved = new Map<string, string>();

  const remembered = localStorage.getItem(REMEMBERED_IDENTIFIER_KEY);
  if (remembered !== null) preserved.set(REMEMBERED_IDENTIFIER_KEY, remembered);

  for (const key of [
    ...lastPatientKeys(),
    ...claimFillOutKeys(),
    ...adaLocalStoreKeys(),
    ...officeScopeKeys(),
  ]) {
    const value = localStorage.getItem(key);
    if (value !== null) preserved.set(key, value);
  }

  localStorage.clear();

  for (const [key, value] of preserved) {
    localStorage.setItem(key, value);
  }
}

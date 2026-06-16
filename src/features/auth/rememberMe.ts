/**
 * "Remember me" support for the login screen.
 *
 * The checkbox remembers only the *username/email* (never the password), so the
 * login form can pre-fill it on the next visit. It does NOT change how long the
 * session stays signed in.
 */

/** localStorage key holding the remembered username/email for login pre-fill. */
export const REMEMBERED_IDENTIFIER_KEY = "remembered_identifier";

/**
 * Clear all auth/session data from localStorage (on logout or a 401), but
 * PRESERVE the "Remember me" identifier so the login screen can still pre-fill
 * it. Without this, `localStorage.clear()` would wipe the remembered username
 * and the checkbox would appear to do nothing after logging out.
 */
export function clearAuthStorageKeepRemembered(): void {
  const remembered = localStorage.getItem(REMEMBERED_IDENTIFIER_KEY);
  localStorage.clear();
  if (remembered !== null) {
    localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, remembered);
  }
}

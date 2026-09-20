/**
 * Where the working office lives in the browser.
 *
 *   1. Per-tab `sessionStorage` — two tabs may work different offices; nothing
 *      adopts another tab's selection (there is deliberately NO `storage` event
 *      listener anywhere in the app).
 *   2. Per-user `localStorage` last-used office, keyed like the persistent
 *      last-patient (`dentc:last_patient:<userId>`), preserved across logout /
 *      401 by `clearAuthStorageKeepRemembered` via {@link officeScopeKeys} — the
 *      only reason "remembered per user" survives a re-login, since that wipe is
 *      `localStorage.clear()`.
 *   3. The legacy mirror `localStorage['current_office']` is still written by
 *      AuthContext for older readers and may be wiped freely; it is rebuilt from (2).
 */

/** Prefix for every per-user last-used office key. Preserved across logout. */
export const LAST_OFFICE_PREFIX = "dentc:last_office:";
/** Prefix for the per-tab working office (sessionStorage). Cleared on logout. */
export const TAB_OFFICE_PREFIX = "dentc:office_scope:tab:";

export function lastOfficeKey(userId: string): string {
  return `${LAST_OFFICE_PREFIX}${userId}`;
}

export function tabOfficeKey(userId: string): string {
  return `${TAB_OFFICE_PREFIX}${userId}`;
}

function read(storage: Storage | undefined, key: string): string | null {
  try {
    const v = storage?.getItem(key);
    return v && v.trim() !== "" ? v : null;
  } catch {
    return null;
  }
}

function write(storage: Storage | undefined, key: string, value: string | null): void {
  try {
    if (value) storage?.setItem(key, value);
    else storage?.removeItem(key);
  } catch {
    /* ignore storage quota / disabled storage */
  }
}

function local(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function session(): Storage | undefined {
  return typeof sessionStorage === "undefined" ? undefined : sessionStorage;
}

/** The user's last-used office key (`OFF-<id>`), or null. */
export function getLastOffice(userId: string | null | undefined): string | null {
  return userId ? read(local(), lastOfficeKey(userId)) : null;
}

export function setLastOffice(userId: string | null | undefined, officeKey: string | null): void {
  if (userId) write(local(), lastOfficeKey(userId), officeKey);
}

/** This tab's working office key, or null. */
export function getTabOffice(userId: string | null | undefined): string | null {
  return userId ? read(session(), tabOfficeKey(userId)) : null;
}

export function setTabOffice(userId: string | null | undefined, officeKey: string | null): void {
  if (userId) write(session(), tabOfficeKey(userId), officeKey);
}

export function clearTabOffice(userId: string | null | undefined): void {
  setTabOffice(userId, null);
}

/** All per-user last-office keys in localStorage — registered with `clearAuthStorageKeepRemembered`. */
export function officeScopeKeys(): string[] {
  const keys: string[] = [];
  try {
    const store = local();
    if (!store) return keys;
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(LAST_OFFICE_PREFIX)) keys.push(k);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

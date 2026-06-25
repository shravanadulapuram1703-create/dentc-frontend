/**
 * Persistent "last selected patient" storage.
 *
 * The app should always reopen the patient the signed-in user last had in
 * context — across navigation, refresh, browser restart, and logout/login —
 * without ever prompting them to pick a patient first. We persist the selection
 * in `localStorage`, keyed PER USER, so:
 *
 *   - it survives a full restart and a logout/login cycle (we deliberately do
 *     NOT clear it on logout — see `clearAuthStorageKeepRemembered`), and
 *   - two users sharing a machine never see each other's last patient
 *     (multi-user isolation).
 *
 * NOTE: this is a per-device interim. True cross-device persistence needs a
 * backend "last selected patient per user" endpoint — see
 * docs/patient-context/persistent_patient_selection_backend_devreport.md.
 */

/** Lightweight patient identity persisted for the patient-context header/nav. */
export interface StoredPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
}

/** Prefix for every per-user last-patient key. Preserved across logout. */
export const LAST_PATIENT_PREFIX = "dentc:last_patient:";

/** The localStorage key holding `userId`'s last selected patient. */
export function lastPatientKey(userId: string): string {
  return `${LAST_PATIENT_PREFIX}${userId}`;
}

/** Read the last selected patient for a user, or `null` if none/invalid. */
export function getLastPatient(
  userId: string | null | undefined,
): StoredPatient | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(lastPatientKey(userId));
    return raw ? (JSON.parse(raw) as StoredPatient) : null;
  } catch {
    return null;
  }
}

/** Persist (or clear, when `patient` is null) a user's last selected patient. */
export function setLastPatient(
  userId: string | null | undefined,
  patient: StoredPatient | null,
): void {
  if (!userId) return;
  try {
    if (patient) {
      localStorage.setItem(lastPatientKey(userId), JSON.stringify(patient));
    } else {
      localStorage.removeItem(lastPatientKey(userId));
    }
  } catch {
    /* ignore storage quota / disabled storage */
  }
}

/** All persisted last-patient keys currently in localStorage. */
export function lastPatientKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LAST_PATIENT_PREFIX)) keys.push(k);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

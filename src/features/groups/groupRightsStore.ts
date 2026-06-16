/**
 * Stop-gap persistence for group → assigned rights.
 *
 * The backend models user groups (`/user-groups`) with only name/description/
 * is_active — there is no rights catalog or group→rights assignment endpoint yet
 * (see docs/security/groups/groups_backend_devreport.md). Until that ships, the
 * Group Setup screen keeps assignments in localStorage, keyed by group id, so the
 * UI is fully functional for review/testing. Swap these three functions for the
 * real API (e.g. GET/PUT /api/v1/user-groups/{id}/rights) once it exists.
 */
const KEY_PREFIX = "dentc.group_rights.";

export function getGroupRights(groupId: number | string): string[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + groupId);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setGroupRights(groupId: number | string, codes: string[]): void {
  try {
    localStorage.setItem(KEY_PREFIX + groupId, JSON.stringify(codes));
  } catch (e) {
    console.error("Failed to persist group rights (localStorage):", e);
  }
}

export function clearGroupRights(groupId: number | string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + groupId);
  } catch {
    /* ignore */
  }
}

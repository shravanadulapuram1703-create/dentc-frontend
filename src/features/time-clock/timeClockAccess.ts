// Who may see and correct other people's punches. Everyone can clock themselves
// in/out and read their own time card; the all-staff report and the entry
// editor are for managers. Client-side only — the backend does not restrict
// list/patch by caller yet (TC-BE-5).
import { isPrivilegedRole } from "@/features/office-scope";

/** owner / admin / manager (also matches `super_admin`, `office_manager`, …). */
export function canViewTeamTime(role?: string | null): boolean {
  return isPrivilegedRole(role);
}

export function canEditTime(role?: string | null): boolean {
  return canViewTeamTime(role);
}

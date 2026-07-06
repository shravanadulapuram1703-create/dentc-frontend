// Role-Based Access Control for the Utilities module.
//
// Each utility declares a `roles` allow-list. A user may run a utility when the
// list is empty (any authenticated user) or contains their role. The dashboard
// only renders authorized utilities; the runner re-checks on entry so a
// deep-linked URL cannot bypass the gate.
import type { UserRole } from "../../../contexts/AuthContext";
import type { UtilityDefinition } from "../types";

/** True when `role` may run `def`. */
export function canRunUtility(def: UtilityDefinition, role: UserRole | undefined): boolean {
  if (!def.roles || def.roles.length === 0) return true;
  if (!role) return false;
  return def.roles.includes(role);
}

/** Filter a list of utilities down to the ones `role` is authorized to see. */
export function authorizedUtilities(
  defs: UtilityDefinition[],
  role: UserRole | undefined,
): UtilityDefinition[] {
  return defs.filter((d) => canRunUtility(d, role));
}

/** Human-readable summary of who may run a utility (for tooltips/detail). */
export function rolesLabel(def: UtilityDefinition): string {
  if (!def.roles || def.roles.length === 0) return "All users";
  return def.roles.map((r) => r.replace(/_/g, " ")).join(", ");
}

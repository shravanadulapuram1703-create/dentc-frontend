/**
 * Who may change which password (RBAC).
 *
 *  - Your OWN password: only through My Page → Account & Settings
 *    (POST /users/me/change-password, verifies the current password). Never via
 *    Setup → Security → Users, even for an admin editing their own record.
 *  - ANOTHER user's password: only an administrator — the server decides and
 *    publishes it as `MeFull.can_reset_user_passwords` (PWD-RBAC-2; today
 *    `admin` + `super_admin`, NOT `owner`, which the Users write routes refuse),
 *    only in Setup → Security → Users → Edit User → Reset Password
 *    (sent as `password` on PUT /users/{user_id}/complete).
 *
 * The backend enforces the same rule (PWD-RBAC-1, shipped 2026-11-16): 403
 * `own_password_self_service` / `password_reset_not_permitted` — mapped to text by
 * `describePasswordApiError`. This module keeps the UI and the save payload in step.
 */
import type { UserRole } from "@/contexts/AuthContext";

/** Fallback only, for a backend that predates `MeFull.can_reset_user_passwords`. */
export const PASSWORD_ADMIN_ROLES: readonly UserRole[] = ["super_admin", "admin"];

/** Where a user changes their own password. `?section=account` opens the panel. */
export const MY_PASSWORD_PATH = "/my-page?section=account";

export function isPasswordAdmin(role: UserRole | null | undefined): boolean {
  return !!role && PASSWORD_ADMIN_ROLES.includes(role);
}

export type PasswordResetAccess =
  | { allowed: true }
  | { allowed: false; reason: "self" | "not_admin" };

/**
 * Can `actor` reset the password of the user with id `target_user_id` from
 * Setup → Security → Users?
 */
export function canResetUserPassword(
  actor:
    | { id: string; role: UserRole; can_reset_user_passwords?: boolean | null }
    | null
    | undefined,
  target_user_id: number | string | null | undefined,
): PasswordResetAccess {
  if (actor && target_user_id != null && String(target_user_id) === actor.id) {
    return { allowed: false, reason: "self" };
  }
  // Server flag wins; the role list is only used when the flag is absent.
  const is_admin =
    typeof actor?.can_reset_user_passwords === "boolean"
      ? actor.can_reset_user_passwords
      : isPasswordAdmin(actor?.role);
  if (!is_admin) return { allowed: false, reason: "not_admin" };
  return { allowed: true };
}

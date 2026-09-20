// Access control — pure rights logic (no React), so it's unit-testable and
// reusable outside components (route loaders, services, tests).
//
// Model: the backend rights catalog (GET /api/v1/permissions) is a flat list of
// string `code`s. A user's *effective* rights are delivered on login/restore via
// `GET /auth/me-full` → `MeFull.permissions` (already mapped onto the auth `user`
// by AuthContext). We gate the UI on membership of a `code` in that array.
//
// See docs/setup/security/ACCESS_RIGHTS_BACKEND_HANDOVER.md. Frontend gating is
// UX only (hide/disable); the real security boundary is the backend 403.
import type { UserRole } from "@/contexts/AuthContext";

/** A permission code from the backend rights catalog. */
export type RightCode = string;

/**
 * Master kill-switch for FRONTEND right-gating, kept DARK until:
 *   1. the backend catalog is curated (210 removed / 44 added), and
 *   2. `me-full.permissions` is verified to resolve as the union of the user's
 *      group rights (handover task B1).
 *
 * While `false`, every check GRANTS — so merging <RequireRight>/useRights()
 * changes nothing in the running app. Flip this one constant (or the localStorage
 * override below) to turn gating on everywhere at once. Mirrors the office-scope
 * `OFFICE_ASSIGNMENT_ENFORCED = false` pattern.
 */
export const RIGHTS_ENFORCED_DEFAULT = false;

/**
 * Dev/QA escape hatch so gating can be exercised before the flag flips, without a
 * rebuild: set `localStorage["dentc:rights_enforced"]` to "1" (on) or "0" (off).
 * Anything else falls through to RIGHTS_ENFORCED_DEFAULT.
 */
export function rightsEnforced(): boolean {
  try {
    const o = localStorage.getItem("dentc:rights_enforced");
    if (o === "1") return true;
    if (o === "0") return false;
  } catch {
    /* localStorage unavailable — use the default */
  }
  return RIGHTS_ENFORCED_DEFAULT;
}

/**
 * Roles that bypass every right check (super-admin). Matches the backend's
 * `permission_service.FULL_ACCESS_ROLES` (confirmed in ACCESS_RIGHTS_BACKEND_RESPONSE
 * §B1): only `admin` and `super_admin`. `owner`/`manager` are NOT full-access — they
 * get gated on their group rights like anyone else. This bypass is belt-and-suspenders:
 * the backend already returns the entire catalog in `me-full.permissions` for these
 * roles, so `hasRight` would grant anyway; keeping it guards admin UX if that array is
 * ever stale/empty.
 */
export const SUPER_ROLES: readonly UserRole[] = ["admin", "super_admin"];

export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role != null && SUPER_ROLES.includes(role);
}

/** The inputs a right check needs, lifted off the auth `user`. */
export interface RightsContext {
  /** `MeFull.permissions` — the user's effective right codes. */
  permissions: readonly RightCode[] | undefined;
  /** `MeFull.permissions_enforced` — the backend's own enforcement flag. */
  permissions_enforced: boolean | undefined;
  role: UserRole | undefined;
}

/** True when a check should short-circuit to GRANT regardless of `code`. */
function grantsEverything(ctx: RightsContext): boolean {
  // Gating dark → grant. Super-admin → grant. Backend says "not enforced" → grant.
  // This ordering guarantees turning gating on can never lock a user out before
  // the catalog + resolution are ready.
  return (
    !rightsEnforced() ||
    isSuperAdmin(ctx.role) ||
    ctx.permissions_enforced === false
  );
}

/** True when the user holds `code`. */
export function hasRight(code: RightCode, ctx: RightsContext): boolean {
  if (grantsEverything(ctx)) return true;
  return (ctx.permissions ?? []).includes(code);
}

/** True when the user holds at least one of `codes` (empty list → true). */
export function hasAnyRight(codes: readonly RightCode[], ctx: RightsContext): boolean {
  if (codes.length === 0 || grantsEverything(ctx)) return true;
  const held = new Set(ctx.permissions ?? []);
  return codes.some((c) => held.has(c));
}

/** True when the user holds every one of `codes` (empty list → true). */
export function hasAllRights(codes: readonly RightCode[], ctx: RightsContext): boolean {
  if (codes.length === 0 || grantsEverything(ctx)) return true;
  const held = new Set(ctx.permissions ?? []);
  return codes.every((c) => held.has(c));
}

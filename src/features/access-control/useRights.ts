// Access control — React hooks. Read the signed-in user's effective rights from
// AuthContext (which already hydrates `user.permissions` / `permissions_enforced`
// / `role` from `me-full`) and expose ergonomic checks.
import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  hasRight,
  hasAnyRight,
  hasAllRights,
  isSuperAdmin,
  rightsEnforced,
  type RightCode,
  type RightsContext,
} from "./rights";

export interface UseRights {
  /** True when the user holds `code`. */
  has: (code: RightCode) => boolean;
  /** True when the user holds at least one of `codes`. */
  hasAny: (codes: RightCode[]) => boolean;
  /** True when the user holds every one of `codes`. */
  hasAll: (codes: RightCode[]) => boolean;
  /** The user bypasses all checks (admin/super_admin). */
  isSuperAdmin: boolean;
  /** Whether FE gating is currently live (kill-switch + dev override). */
  enforced: boolean;
  /**
   * False while the session is authenticated but the identity (`me-full`) is
   * still hydrating — `has`/`hasAny`/`hasAll` can't be trusted yet. Guards should
   * wait rather than deny, so a hard reload doesn't flash "Access denied".
   */
  ready: boolean;
  /** The user's raw effective right codes (may be empty). */
  codes: readonly RightCode[];
}

/**
 * The primary access-control hook. Returns stable checker functions plus a couple
 * of derived flags. Prefer this in components that need more than one check.
 *
 * ```tsx
 * const { has } = useRights();
 * <button disabled={!has("transactions_delete_procedure")}>Delete</button>
 * ```
 */
export function useRights(): UseRights {
  const { user, isAuthenticated } = useAuth();

  const ctx: RightsContext = useMemo(
    () => ({
      permissions: user?.permissions,
      permissions_enforced: user?.permissions_enforced,
      role: user?.role,
    }),
    [user?.permissions, user?.permissions_enforced, user?.role],
  );

  const has = useCallback((code: RightCode) => hasRight(code, ctx), [ctx]);
  const hasAny = useCallback((codes: RightCode[]) => hasAnyRight(codes, ctx), [ctx]);
  const hasAll = useCallback((codes: RightCode[]) => hasAllRights(codes, ctx), [ctx]);

  // Authenticated but identity not yet hydrated (post-reload `me-full` fetch) →
  // rights are unknown, so callers should wait rather than treat "" as a denial.
  const ready = !(isAuthenticated && user == null);

  return {
    has,
    hasAny,
    hasAll,
    isSuperAdmin: isSuperAdmin(ctx.role),
    enforced: rightsEnforced(),
    ready,
    codes: ctx.permissions ?? [],
  };
}

/**
 * Convenience boolean hook for a single decision. Pass one code, or several with
 * `mode` ("any" — hold one of them, default; "all" — hold all).
 *
 * ```tsx
 * if (useHasRight("patient_delete_patient_information")) { … }
 * ```
 */
export function useHasRight(
  code: RightCode | RightCode[],
  mode: "any" | "all" = "any",
): boolean {
  const { has, hasAny, hasAll } = useRights();
  if (Array.isArray(code)) return mode === "all" ? hasAll(code) : hasAny(code);
  return has(code);
}

// Access control (RBAC) — frontend right-gating.
//
// Reads the signed-in user's effective right codes (MeFull.permissions, hydrated
// by AuthContext) and gates UI on them. Kept DARK by a kill-switch until the
// backend rights catalog is curated + resolution verified — see
// docs/setup/security/ACCESS_RIGHTS_BACKEND_HANDOVER.md.
//
//   import { useHasRight, RequireRight, RIGHT } from "@/features/access-control";
//
//   const canDelete = useHasRight(RIGHT.transactions.deleteProcedure);
//   <RequireRight code={RIGHT.imaging.deleteImage}><DeleteBtn/></RequireRight>
//   <RequireRight code={RIGHT.setup.securityUsersFull} redirectTo="/dashboard">…</RequireRight>
export {
  RIGHTS_ENFORCED_DEFAULT,
  rightsEnforced,
  SUPER_ROLES,
  isSuperAdmin,
  hasRight,
  hasAnyRight,
  hasAllRights,
  type RightCode,
  type RightsContext,
} from "./rights";

export { useRights, useHasRight, type UseRights } from "./useRights";

export {
  default as RequireRight,
  AccessDenied,
  type RequireRightProps,
} from "./RequireRight";

export { RIGHT } from "./rightCodes";

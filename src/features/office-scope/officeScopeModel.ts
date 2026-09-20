/**
 * Pure office-scope model — no React, no I/O — so the seed/authorization rules
 * are unit-testable and the same everywhere (AuthContext seeding, the switcher,
 * report/utility office pickers).
 *
 * The rules (see docs/office-scope/ and the approved plan):
 *   - the working office is never empty: stored (tab → per-user last-used →
 *     legacy mirror) → home office (`is_primary`) → first assigned → null, which
 *     means "tenant-wide with a banner", never a lockout;
 *   - membership is only checked when the backend says permissions are enforced
 *     (`MeFull.permissions_enforced`) and the user is not privileged — before
 *     that, any tenant office is selectable (same-day coverage);
 *   - "All offices" is a privilege: owner/admin/manager by role, or the
 *     `offices:view_all` permission once enforced.
 */

import { officeKey, officeKeyToId } from "@/services/officeLookup";

export { officeKey, officeKeyToId };

export type OfficeScopeStatus = "resolving" | "ready" | "unassigned";

export const PRIVILEGED_ROLES: readonly string[] = ["owner", "admin", "manager"];
/**
 * The one master office-scope right (confirmed with the backend team,
 * `office_scope_backend_response_r2.md`). It grants ALL of: view every office,
 * bypass the assigned-offices narrowing on lists/reports, and open cross-office
 * patient charts. There is no distinct `offices:switch_any` /
 * `patients:view_cross_office` / `reports:all_offices` — they collapse into this
 * right. Leadership roles hold it implicitly (surfaced in `MeFull.permissions`).
 */
export const PERMISSION_VIEW_ALL_OFFICES = "office_scope_view_all_offices";
/**
 * Legacy (Denticon-era) right in `MeFull.permissions` that additionally grants
 * targeting/switching to another office (coverage) without granting the full
 * master right above.
 */
export const LEGACY_PERMISSION_OTHER_OFFICE = "appointments_add_appointment_in_other_office";

/**
 * Whether the CLIENT restricts the switcher to `assigned_office_ids`. ON since
 * the backend shipped OFF-SCOPE-1/2/13 (`docs/office-scope/office_scope_backend_response.md`):
 * the server now 403s `office_not_assigned` for any `office_id` param, path,
 * body, or `X-Office-ID` header outside the caller's `user_offices` unless they
 * hold `offices:view_all` / `offices:switch_any`. The client mirrors that so the
 * working office it sends is always one the server will accept.
 *
 * The two server escape hatches keep this from locking anyone out and are
 * matched by {@link isOfficeAllowed}: a privileged caller is never narrowed, and
 * a caller with ZERO `user_offices` rows is ungated (a migrated tenant whose
 * assignments are not seeded — e.g. the seeded `super_admin` — is tenant-wide,
 * never fenced).
 */
export const OFFICE_ASSIGNMENT_ENFORCED = true;

export interface OfficeAccess {
  /** `MeFull.offices[].is_primary` → the user's home office, or null. */
  home_office_id: number | null;
  /** Every office the user is assigned to (`user_offices`). */
  assigned_office_ids: number[];
  /** May widen list/report reads to every office. */
  can_view_all_offices: boolean;
  /** May select an office outside `assigned_office_ids` once enforcement is on. */
  can_switch_any_office: boolean;
  /** `MeFull.permissions_enforced` — whether permission CODES are consulted. */
  permissions_enforced: boolean;
  /** Whether office MEMBERSHIP is enforced client-side (see OFFICE_ASSIGNMENT_ENFORCED). */
  office_assignment_enforced: boolean;
}

export interface OfficeAccessInput {
  role?: string | null;
  /**
   * `organizations[0].offices` from AuthContext: `{ id: "OFF-<n>", is_current }`
   * where `is_current` mirrors `OfficeAssignment.is_primary`.
   */
  offices: ReadonlyArray<{ id: string | number; is_current?: boolean | null }>;
  permissions?: ReadonlyArray<string> | null;
  permissions_enforced?: boolean | null;
  /** Test/override hook; defaults to {@link OFFICE_ASSIGNMENT_ENFORCED}. */
  office_assignment_enforced?: boolean | null;
}

function uniq(ids: (number | undefined)[]): number[] {
  const out: number[] = [];
  for (const id of ids) if (id != null && !out.includes(id)) out.push(id);
  return out;
}

/**
 * `UserRead.role` is a free string: the seeded admin is `super_admin`, and
 * legacy data carries `office_manager` / `org_owner`, so match on the
 * privileged word as a whole token, not on the exact string.
 */
export function isPrivilegedRole(role?: string | null): boolean {
  const tokens = String(role ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  return tokens.some((t) => PRIVILEGED_ROLES.includes(t));
}

/** Derive the access set from the identity the app already holds. */
export function deriveOfficeAccess(input: OfficeAccessInput): OfficeAccess {
  const assigned_office_ids = uniq(input.offices.map((o) => officeKeyToId(o.id)));
  const primary = input.offices.find((o) => o.is_current === true);
  const home_office_id = officeKeyToId(primary?.id) ?? null;
  const permissions_enforced = input.permissions_enforced === true;
  const perms = new Set(input.permissions ?? []);
  const privileged = isPrivilegedRole(input.role);
  // A permission counts only once the backend enforces its rights catalog; any
  // of the listed aliases is enough (the deployed name vs. the response-doc name).
  const byCode = (...codes: string[]) => permissions_enforced && codes.some((c) => perms.has(c));
  return {
    home_office_id,
    assigned_office_ids,
    can_view_all_offices: privileged || byCode(PERMISSION_VIEW_ALL_OFFICES),
    can_switch_any_office:
      privileged || byCode(PERMISSION_VIEW_ALL_OFFICES, LEGACY_PERMISSION_OTHER_OFFICE),
    permissions_enforced,
    office_assignment_enforced: input.office_assignment_enforced ?? OFFICE_ASSIGNMENT_ENFORCED,
  };
}

/**
 * Whether the user may work in `office_id`. Until office assignments are
 * enforced every tenant office is allowed (same-day coverage); after that only
 * assigned offices — except for privileged users, and for a user with NO
 * assignments at all (unseeded data must never be a lockout; the server is the
 * real gate, OFF-SCOPE-1).
 */
export function isOfficeAllowed(office_id: number, access: OfficeAccess): boolean {
  if (!access.office_assignment_enforced) return true;
  if (access.can_view_all_offices || access.can_switch_any_office) return true;
  if (access.assigned_office_ids.length === 0) return true;
  return access.assigned_office_ids.includes(office_id);
}

/**
 * The office to work in at login / restore. `candidates` are tried in order (the
 * caller passes tab key → per-user last-used → legacy mirror); the first one that
 * parses and is allowed wins, then home, then the first assigned office, then
 * null (tenant-wide + banner — never a gate).
 */
export function resolveInitialOffice(
  candidates: ReadonlyArray<string | number | null | undefined>,
  access: OfficeAccess,
): number | null {
  for (const c of candidates) {
    const id = officeKeyToId(c);
    if (id != null && isOfficeAllowed(id, access)) return id;
  }
  if (access.home_office_id != null) return access.home_office_id;
  return access.assigned_office_ids[0] ?? null;
}

/** Membership check as `resolveInitialOffice` applies it — tests + pickers reuse it. */
export function isMembershipRestricted(access: OfficeAccess): boolean {
  return (
    access.office_assignment_enforced &&
    !access.can_view_all_offices &&
    !access.can_switch_any_office &&
    access.assigned_office_ids.length > 0
  );
}

/** Status for banners: ready when an office is set; unassigned when nothing could seed one. */
export function deriveOfficeScopeStatus(office_id: number | null, access: OfficeAccess): OfficeScopeStatus {
  if (office_id != null) return "ready";
  if (access.home_office_id == null && access.assigned_office_ids.length === 0) return "unassigned";
  return "resolving";
}

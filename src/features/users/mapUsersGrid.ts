import type {
  UserRead,
  UserOfficeRead,
  OfficeRead,
  TenantRead,
  UserGroupMembershipRead,
  UserGroupRead,
} from "@/api/generated/model";
import { formatUsDateTime } from "@/utils/datetime";

/** A security group assigned to a user, with an office-style OID label. */
export interface SecurityGroupRef {
  /** Numeric group id. */
  id: number;
  /** Office-style label, e.g. "G-7". */
  oid: string;
  /** Group name resolved from the catalog (falls back to "Group {id}"). */
  name: string;
}

/**
 * Shape consumed by the UserSetup grid. Mirrors the legacy `User` row that the
 * old `/users/list-with-home-office` endpoint produced, so the grid renders
 * unchanged — but it is now assembled client-side from the canonical backend
 * resources (`/users` + `/user-offices` + `/offices` + `/tenants`).
 */
export interface UserGridRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  active: boolean;
  homeOffice: string;
  homeOfficeOID: string;
  pgid: string;
  pgidName: string;
  assignedOfficeOIDs: string[];
  assignedOfficeNames: string[];
  role: string;
  /** Summary label for the grid column (e.g. "Administrators +1", or "—"). */
  securityGroup: string;
  /** All security groups assigned to the user (for the detail list). */
  securityGroups: SecurityGroupRef[];
  lastLogin?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MapUsersGridInput {
  users: UserRead[];
  userOffices: UserOfficeRead[];
  offices: OfficeRead[];
  tenants: TenantRead[];
  userGroupMemberships?: UserGroupMembershipRead[];
  userGroups?: UserGroupRead[];
}

/**
 * Joins the four flat resources into grid rows. The home office is the user's
 * primary `user_offices` link resolved to the office name; assigned offices are
 * all of the user's links. `securityGroup` is not part of `UserRead` (it lives
 * in the user-group resources surfaced on the advanced tabs), so it renders as
 * a placeholder here.
 */
export function mapUsersGrid({
  users,
  userOffices,
  offices,
  tenants,
  userGroupMemberships = [],
  userGroups = [],
}: MapUsersGridInput): UserGridRow[] {
  const officeById = new Map(offices.map((o) => [o.id, o]));
  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const groupNameById = new Map(userGroups.map((g) => [g.id, g.name]));

  const linksByUser = new Map<number, UserOfficeRead[]>();
  for (const link of userOffices) {
    const arr = linksByUser.get(link.user_id);
    if (arr) arr.push(link);
    else linksByUser.set(link.user_id, [link]);
  }

  // Security groups assigned to each user, resolved via the user-group catalog.
  // Each carries an office-style "G-{id}" label so the detail list reads like
  // the assigned-offices list (e.g. "G-7 - Administrators").
  const groupsByUser = new Map<number, SecurityGroupRef[]>();
  for (const m of userGroupMemberships) {
    const ref: SecurityGroupRef = {
      id: m.group_id,
      oid: `G-${m.group_id}`,
      name: groupNameById.get(m.group_id) ?? `Group ${m.group_id}`,
    };
    const arr = groupsByUser.get(m.user_id);
    if (arr) arr.push(ref);
    else groupsByUser.set(m.user_id, [ref]);
  }

  return users.map((u) => {
    const links = linksByUser.get(u.id) ?? [];
    const primary = links.find((l) => l.is_primary) ?? links[0];
    const primaryOffice = primary ? officeById.get(primary.office_id) : undefined;
    const tenant = tenantById.get(u.tenant_id);
    const groups = groupsByUser.get(u.id) ?? [];

    return {
      id: `U-${u.id}`,
      firstName: u.first_name ?? "",
      lastName: u.last_name ?? "",
      username: u.username ?? "",
      email: u.email ?? "",
      active: u.is_active,
      homeOffice: primaryOffice?.name ?? "—",
      homeOfficeOID: primary ? `O-${primary.office_id}` : "",
      pgid: `P-${u.tenant_id}`,
      pgidName: tenant?.name ?? "—",
      assignedOfficeOIDs: links.map((l) => `O-${l.office_id}`),
      assignedOfficeNames: links
        .map((l) => officeById.get(l.office_id)?.name ?? "")
        .filter(Boolean),
      role: u.role ?? "—",
      securityGroups: groups,
      securityGroup:
        groups.length === 0
          ? "—"
          : groups.length === 1
            ? groups[0]!.name
            : `${groups[0]!.name} +${groups.length - 1}`,
      // Audit/login timestamps formatted in US Eastern (see KAN-19); creator/
      // updater prefer the backend-resolved *_by_name, else fall back to the id.
      lastLogin: u.last_login_at ? formatUsDateTime(u.last_login_at) : "Never",
      createdAt: u.created_at ? formatUsDateTime(u.created_at) : undefined,
      createdBy: u.created_by_name ?? (u.created_by != null ? `User #${u.created_by}` : undefined),
      updatedAt: u.updated_at ? formatUsDateTime(u.updated_at) : undefined,
      updatedBy: u.updated_by_name ?? (u.updated_by != null ? `User #${u.updated_by}` : undefined),
    };
  });
}

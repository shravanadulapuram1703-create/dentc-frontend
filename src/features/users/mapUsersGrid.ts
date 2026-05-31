import type {
  UserRead,
  UserOfficeRead,
  OfficeRead,
  TenantRead,
} from "@/api/generated/model";

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
  securityGroup: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface MapUsersGridInput {
  users: UserRead[];
  userOffices: UserOfficeRead[];
  offices: OfficeRead[];
  tenants: TenantRead[];
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
}: MapUsersGridInput): UserGridRow[] {
  const officeById = new Map(offices.map((o) => [o.id, o]));
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const linksByUser = new Map<number, UserOfficeRead[]>();
  for (const link of userOffices) {
    const arr = linksByUser.get(link.user_id);
    if (arr) arr.push(link);
    else linksByUser.set(link.user_id, [link]);
  }

  return users.map((u) => {
    const links = linksByUser.get(u.id) ?? [];
    const primary = links.find((l) => l.is_primary) ?? links[0];
    const primaryOffice = primary ? officeById.get(primary.office_id) : undefined;
    const tenant = tenantById.get(u.tenant_id);

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
      securityGroup: "—",
      lastLogin: u.last_login_at
        ? new Date(u.last_login_at).toLocaleString()
        : "Never",
      createdAt: u.created_at
        ? new Date(u.created_at).toLocaleString()
        : undefined,
    };
  });
}

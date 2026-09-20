import { describe, expect, it } from "vitest";
import {
  deriveOfficeAccess,
  deriveOfficeScopeStatus,
  isOfficeAllowed,
  resolveInitialOffice,
  type OfficeAccess,
} from "../officeScopeModel";

const offices = [
  { id: "OFF-4", is_current: true },
  { id: "OFF-1", is_current: false },
  { id: "OFF-9", is_current: false },
];

const access = (over: Partial<OfficeAccess> = {}): OfficeAccess => ({
  home_office_id: 4,
  assigned_office_ids: [4, 1, 9],
  can_view_all_offices: false,
  can_switch_any_office: false,
  permissions_enforced: false,
  office_assignment_enforced: false,
  ...over,
});
/** The future state: backend validates office_id against user_offices. */
const enforced = { office_assignment_enforced: true, permissions_enforced: true };

describe("deriveOfficeAccess", () => {
  it("reads home from is_primary and assigned from every row", () => {
    const a = deriveOfficeAccess({ role: "front_desk", offices });
    expect(a.home_office_id).toBe(4);
    expect(a.assigned_office_ids).toEqual([4, 1, 9]);
    expect(a.can_view_all_offices).toBe(false);
    expect(a.permissions_enforced).toBe(false);
  });

  it("treats owner, admin AND manager as privileged by role, including compound roles", () => {
    for (const role of ["owner", "admin", "manager", "Manager", "super_admin", "office_manager", "org-owner"]) {
      expect(deriveOfficeAccess({ role, offices }).can_view_all_offices).toBe(true);
    }
    for (const role of ["doctor", "front_desk", "staff", "administrative_assistant", ""]) {
      expect(deriveOfficeAccess({ role, offices }).can_view_all_offices).toBe(false);
    }
  });

  it("honours the master right office_scope_view_all_offices only once enforced", () => {
    const perms = ["office_scope_view_all_offices"];
    expect(deriveOfficeAccess({ role: "staff", offices, permissions: perms }).can_view_all_offices).toBe(false);
    expect(
      deriveOfficeAccess({ role: "staff", offices, permissions: perms, permissions_enforced: true })
        .can_view_all_offices,
    ).toBe(true);
  });

  it("does not treat the invented colon-style codes as the master right", () => {
    const perms = ["offices:view_all"];
    expect(
      deriveOfficeAccess({ role: "staff", offices, permissions: perms, permissions_enforced: true })
        .can_view_all_offices,
    ).toBe(false);
  });

  it("maps the legacy 'add appointment in other office' right to coverage switching", () => {
    const perms = ["appointments_add_appointment_in_other_office"];
    const a = deriveOfficeAccess({ role: "front_desk", offices, permissions: perms, permissions_enforced: true });
    expect(a.can_switch_any_office).toBe(true);
    expect(a.can_view_all_offices).toBe(false);
  });

  it("enforces office membership client-side now that the backend validates it (OFF-SCOPE-1)", () => {
    const a = deriveOfficeAccess({ role: "staff", offices, permissions_enforced: true });
    expect(a.permissions_enforced).toBe(true);
    expect(a.office_assignment_enforced).toBe(true);
  });

  it("still lets a test/override force enforcement off", () => {
    const a = deriveOfficeAccess({ role: "staff", offices, office_assignment_enforced: false });
    expect(a.office_assignment_enforced).toBe(false);
  });

  it("copes with an empty assignment set (owner with no user_offices rows)", () => {
    const a = deriveOfficeAccess({ role: "owner", offices: [] });
    expect(a.home_office_id).toBeNull();
    expect(a.assigned_office_ids).toEqual([]);
  });
});

describe("isOfficeAllowed", () => {
  it("allows any office while assignments are not enforced (same-day coverage)", () => {
    expect(isOfficeAllowed(77, access())).toBe(true);
    expect(isOfficeAllowed(77, access({ permissions_enforced: true }))).toBe(true);
  });
  it("restricts to assigned offices once enforced, unless privileged", () => {
    expect(isOfficeAllowed(77, access(enforced))).toBe(false);
    expect(isOfficeAllowed(9, access(enforced))).toBe(true);
    expect(isOfficeAllowed(77, access({ ...enforced, can_view_all_offices: true }))).toBe(true);
    expect(isOfficeAllowed(77, access({ ...enforced, can_switch_any_office: true }))).toBe(true);
  });
  it("never locks out a user with no assignments at all (unseeded data)", () => {
    expect(isOfficeAllowed(77, access({ ...enforced, assigned_office_ids: [], home_office_id: null }))).toBe(true);
  });
});

describe("resolveInitialOffice", () => {
  it("prefers the first stored candidate (tab key wins over last-used)", () => {
    expect(resolveInitialOffice(["OFF-9", "OFF-1"], access())).toBe(9);
  });
  it("keeps a valid last-used office over the home office", () => {
    expect(resolveInitialOffice([null, "OFF-1"], access())).toBe(1);
  });
  it("skips a stored office the user may no longer use under enforcement", () => {
    expect(resolveInitialOffice(["OFF-77"], access(enforced))).toBe(4);
  });
  it("keeps a stored non-assigned office for a privileged user", () => {
    expect(resolveInitialOffice(["OFF-77"], access({ ...enforced, can_view_all_offices: true }))).toBe(77);
  });
  it("keeps a stored office when the user has no assignments, even under enforcement", () => {
    expect(
      resolveInitialOffice(["OFF-77"], access({ ...enforced, assigned_office_ids: [], home_office_id: null })),
    ).toBe(77);
  });
  it("falls back home → first assigned → null, never throwing", () => {
    expect(resolveInitialOffice(["", "garbage"], access())).toBe(4);
    expect(resolveInitialOffice([], access({ home_office_id: null }))).toBe(4);
    expect(resolveInitialOffice([], access({ home_office_id: null, assigned_office_ids: [] }))).toBeNull();
  });
});

describe("deriveOfficeScopeStatus", () => {
  it("is ready with an office, unassigned with nothing to seed, resolving otherwise", () => {
    expect(deriveOfficeScopeStatus(4, access())).toBe("ready");
    expect(deriveOfficeScopeStatus(null, access({ home_office_id: null, assigned_office_ids: [] }))).toBe(
      "unassigned",
    );
    expect(deriveOfficeScopeStatus(null, access())).toBe("resolving");
  });
});

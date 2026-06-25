/**
 * Security → Users service layer.
 *
 * Wraps the generated Orval client (snake_case, backend-contract-aligned). Per-user
 * data is composed from the canonical resources:
 *   - core record      → GET /api/v1/users/{user_id}
 *   - office assignment→ GET /api/v1/user-offices?user_id=
 *   - group membership → GET /api/v1/user-group-memberships?user_id=
 *   - IP rules         → GET /api/v1/user-ip-rules?user_id=
 *   - preferences      → GET /api/v1/user-preferences?user_id=
 *   - time-clock config→ GET /api/v1/users/{user_id}/time-clock-config
 *   - security settings→ GET /api/v1/users/{user_id}/security-settings
 *
 * Atomic create/update goes through the compound endpoints
 * (POST /users/complete, PUT /users/{id}/complete) — see UserSetup.
 */
import {
  getUser,
  getUserTimeClockConfig,
  getUserSecuritySettings,
} from "../api/generated/endpoints/users/users";
import {
  listUserIpRules,
  listUserGroupMemberships,
  listUserPreferences,
} from "../api/generated/endpoints/staff/staff";
import { listUserOffices } from "../api/generated/endpoints/organization/organization";
import type { LoginRestrictions } from "../api/generated/model/loginRestrictions";
import type { BackendUser } from "../types/backendUser";

/* =========================================================
   TYPES (snake_case — mirrors the backend contract)
========================================================= */

export interface PermittedIp {
  id: number;
  ip_address: string;
  rule_type: string;
  description?: string | null;
  is_active: boolean;
}

export interface UserTimeClock {
  pay_rate: string | null;
  overtime_method: string | null;
  overtime_rate: string | null;
  clock_in_required: boolean;
}

/**
 * Read model for the View User Details modal. Core fields come from
 * GET /api/v1/users/{user_id}; office/group/IP/preference/time-clock/security data
 * is composed from the resources above. Display names (office, PGID, group) are
 * resolved by the consuming component via the generated list hooks.
 */
export interface UserDetails {
  // Core identity (UserRead)
  id: number;
  tenant_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  patient_access_level: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;

  // Audit trail (UserRead) — *_by_name are resolved server-side.
  created_at: string;
  created_by: number | null;
  created_by_name: string | null;
  updated_at: string | null;
  updated_by: number | null;
  updated_by_name: string | null;

  // Structural fields
  short_id: string | null;
  report_access_provider_id: string | null;
  custom_1: string | null;
  custom_2: string | null;
  signature_data: string | null;
  image_url: string | null;

  // Composed from related resources
  home_office_id: number | null;
  assigned_office_ids: number[];
  group_ids: number[];
  permitted_ips: PermittedIp[];
  login_restrictions: LoginRestrictions;
  time_clock: UserTimeClock;
  /** pref_key → pref_value (e.g. `startup_screen`, `default_perio_screen`). */
  preferences: Record<string, string | null>;
}

/* =========================================================
   HELPERS
========================================================= */

const LIST_SIZE = 200; // backend max page size

/** Accepts a numeric id, "61", or a legacy "U-61" identifier. */
function toNumericId(userId: string | number): number {
  if (typeof userId === "number") return userId;
  return parseInt(String(userId).replace(/^U-/, ""), 10);
}

/** Resolve a user's office assignments → { home_office_id, assigned_office_ids }. */
async function loadOfficeAssignment(userId: number): Promise<{
  home_office_id: number | null;
  assigned_office_ids: number[];
}> {
  const res = await listUserOffices({ user_id: userId, size: LIST_SIZE });
  const links = res.items ?? [];
  const primary = links.find((l) => l.is_primary) ?? links[0] ?? null;
  return {
    home_office_id: primary ? primary.office_id : null,
    assigned_office_ids: links.map((l) => l.office_id),
  };
}

/* =========================================================
   READ
========================================================= */

/**
 * Fetch a user plus all related resources for the read-only details modal.
 * @param userId numeric, "61", or legacy "U-61"
 */
export const fetchUserDetails = async (
  userId: string | number
): Promise<UserDetails | null> => {
  const numericId = toNumericId(userId);

  const [user, offices, ipRes, groupRes, prefRes, timeClock, security] =
    await Promise.all([
      getUser(numericId),
      loadOfficeAssignment(numericId),
      listUserIpRules({ user_id: numericId, size: LIST_SIZE }),
      listUserGroupMemberships({ user_id: numericId, size: LIST_SIZE }),
      listUserPreferences({ user_id: numericId, size: LIST_SIZE }),
      getUserTimeClockConfig(numericId),
      getUserSecuritySettings(numericId),
    ]);

  const preferences: Record<string, string | null> = {};
  for (const p of prefRes.items ?? []) preferences[p.pref_key] = p.pref_value ?? null;

  return {
    id: user.id,
    tenant_id: user.tenant_id,
    username: user.username,
    email: user.email,
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: user.phone ?? null,
    role: user.role,
    patient_access_level: user.patient_access_level ?? security.patient_access_level ?? null,
    is_active: user.is_active,
    must_change_password: user.must_change_password,
    last_login_at: user.last_login_at ?? null,
    created_at: user.created_at,
    created_by: user.created_by ?? null,
    created_by_name: user.created_by_name ?? null,
    updated_at: user.updated_at ?? null,
    updated_by: user.updated_by ?? null,
    updated_by_name: user.updated_by_name ?? null,

    short_id: user.short_id ?? null,
    report_access_provider_id: user.report_access_provider_id ?? null,
    custom_1: user.custom_1 ?? null,
    custom_2: user.custom_2 ?? null,
    signature_data: user.signature_data ?? null,
    image_url: user.image_url ?? null,

    home_office_id: offices.home_office_id,
    assigned_office_ids: offices.assigned_office_ids,
    group_ids: (groupRes.items ?? []).map((m) => m.group_id),
    permitted_ips: (ipRes.items ?? []).map((ip) => ({
      id: ip.id,
      ip_address: ip.ip_address,
      rule_type: ip.rule_type,
      description: ip.description,
      is_active: ip.is_active,
    })),
    login_restrictions: security.login_restrictions,
    time_clock: {
      pay_rate: timeClock.pay_rate ?? null,
      overtime_method: timeClock.overtime_method ?? null,
      overtime_rate: timeClock.overtime_rate ?? null,
      clock_in_required: timeClock.clock_in_required ?? false,
    },
    preferences,
  };
};

export const refreshUserDetails = fetchUserDetails;

/**
 * Fetch a user in BackendUser shape for the Add/Edit modal. Composes the core
 * record with office/group/IP/preference/time-clock/security data.
 */
export const fetchUserForEdit = async (
  userId: string | number
): Promise<BackendUser> => {
  const numericId = toNumericId(userId);

  const [user, offices, ipRes, groupRes, prefRes, timeClock, security] =
    await Promise.all([
      getUser(numericId),
      loadOfficeAssignment(numericId),
      listUserIpRules({ user_id: numericId, size: LIST_SIZE }),
      listUserGroupMemberships({ user_id: numericId, size: LIST_SIZE }),
      listUserPreferences({ user_id: numericId, size: LIST_SIZE }),
      getUserTimeClockConfig(numericId),
      getUserSecuritySettings(numericId),
    ]);

  const preferences: Record<string, string | null> = {};
  for (const p of prefRes.items ?? []) preferences[p.pref_key] = p.pref_value ?? null;

  return {
    user_id: user.id,
    username: user.username,
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    email: user.email,
    phone: user.phone ?? null,
    is_active: user.is_active,
    patient_access_level: user.patient_access_level ?? security.patient_access_level ?? null,
    short_id: user.short_id ?? null,
    report_access_provider_id: user.report_access_provider_id ?? null,
    custom_1: user.custom_1 ?? null,
    custom_2: user.custom_2 ?? null,
    signature_data: user.signature_data ?? null,
    image_url: user.image_url ?? null,
    home_office_id: offices.home_office_id,
    assigned_offices: offices.assigned_office_ids,
    roles: user.role ? [user.role] : [],
    group_memberships: (groupRes.items ?? []).map((m) => String(m.group_id)),
    permitted_ips: (ipRes.items ?? []).map((ip) => ip.ip_address),
    login_restrictions: security.login_restrictions,
    time_clock: {
      pay_rate: timeClock.pay_rate ?? null,
      overtime_method: timeClock.overtime_method ?? null,
      overtime_rate: timeClock.overtime_rate ?? null,
      clock_in_required: timeClock.clock_in_required ?? false,
    },
    preferences,
  };
};

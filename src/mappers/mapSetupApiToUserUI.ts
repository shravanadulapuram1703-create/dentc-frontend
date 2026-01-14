// src/mappers/mapSetupApiToUserUI.ts

export function mapSetupApiToUserUI(
  data: any,
  officeNameById?: Map<string, string>
) {
  const user = data.user ?? {};

  /* -------------------------------
     Offices
  -------------------------------- */
  const offices = (data.offices ?? []).filter((o: any) => o.is_active);

  const primaryOffice = offices.find((o: any) => o.is_primary);

  const assignedOfficeOIDs = offices.map(
    (o: any) => `O-${o.office_id}`
  );

  const assignedOfficeNames = officeNameById
    ? assignedOfficeOIDs.map(
        (oid) =>
          officeNameById.get(oid.replace("O-", "")) ?? "Unknown Office"
      )
    : [];

  /* -------------------------------
     IP Rules
  -------------------------------- */
  const permittedIPs = (data.ip_rules ?? []).map((r: any) => ({
    id: String(r.id),
    ipAddress: r.ip?.ip_address,
    description: r.ip?.description,
    active: r.is_active,
  }));

  /* -------------------------------
     Final UI User
  -------------------------------- */
  return {
    // Identifiers
    id: `U-${user.id}`,
    username: user.username,
    email: user.email,

    // Name
    firstName: user.first_name,
    lastName: user.last_name,

    // Status
    active: user.is_active,
    role: user.role,
    securityGroup: (data.groups ?? []).join(", "),

    // PGID (tenant)
    pgid: `P-${user.tenant_id}`,
    pgidName: "", // optional – fill if you have tenant lookup

    // Offices
    homeOfficeOID: primaryOffice
      ? `O-${primaryOffice.office_id}`
      : "",
    homeOffice: primaryOffice
      ? assignedOfficeNames[assignedOfficeOIDs.indexOf(`O-${primaryOffice.office_id}`)] ??
        `Office ${primaryOffice.office_id}`
      : "",
    assignedOfficeOIDs,
    assignedOfficeNames,

    // Login / audit
    lastLogin: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    createdBy: user.created_by,
    updatedBy: user.updated_by,

    // Permissions
    permittedIPs,
    groupMemberships: (data.groups ?? []).map((g: string) => ({
      groupId: g,
      groupName: g,
      description: "",
      joinedDate: "",
    })),

    // Time clock
    timeClockEnabled: Boolean(data.time_clock),
    payRate: data.time_clock?.pay_rate,
    overtimeRate: data.time_clock?.overtime_rate,

    // Preferences
    startupScreen: data.preferences?.startup_screen ?? "",
    perioTemplate: data.preferences?.perio_template ?? null,
    defaultNavigationSearch:
      Boolean(data.preferences?.default_navigation_search),
    defaultSearchBy: data.preferences?.default_search_by ?? "",
    productionView: Boolean(data.preferences?.production_view),
    hideProviderTime: Boolean(data.preferences?.hide_provider_time),
    defaultView: data.preferences?.default_perio_screen ?? "",
    showProductionColors: Boolean(
      data.preferences?.show_production_colors
    ),
    printLabels: Boolean(data.preferences?.print_labels),
    promptEntryDate: Boolean(data.preferences?.prompt_entry_date),
    includeInactivePatients: Boolean(
      data.preferences?.include_inactive_patients
    ),
    referralView: data.preferences?.referral_view ?? null,
    userRoleType: data.preferences?.user_role_type ?? null,
  };
}

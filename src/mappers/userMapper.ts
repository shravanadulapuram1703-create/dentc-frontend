// Define User type based on what the mapper returns
interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  active: boolean;
  isPlatformUser?: boolean;
  isLocked?: boolean;
  pgid: string;
  pgidName: string;
  homeOffice: string;
  homeOfficeOID?: string;
  assignedOfficeOIDs: string[];
  assignedOfficeNames: string[];
  role: string;
  securityGroup: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  permittedIPs?: any[];
  groupMemberships?: any[];
  recentTimeEntries?: string[];
  timeClockEnabled?: boolean;
  clockInRequired?: boolean;
  startupScreen?: string;
  perioTemplate?: string | null;
  defaultNavigationSearch?: boolean;
  defaultSearchBy?: string;
  productionView?: string;
  hideProviderTime?: boolean;
  defaultView?: string;
  showProductionColors?: boolean;
  printLabels?: boolean;
  promptEntryDate?: boolean;
  includeInactivePatients?: boolean;
  referralView?: string | null;
  userRoleType?: string | null;
  patientAccessLevel?: string | null;
  allowedDays?: any[];
  allowedFrom?: string | null;
  allowedUntil?: string | null;
}

export const mapApiUserToUI = (api: any): User => {
  return {
    // Core identity
    id: `U-${api.user_id}`,
    firstName: api.first_name,
    lastName: api.last_name,
    username: api.username,
    email: api.email,

    // Status
    active: api.is_active,
    isPlatformUser: api.is_platform_user,
    isLocked: api.is_locked,

    // PGID
    pgid: `P-${api.pgid}`,
    pgidName: api.pgid_name ?? "—",

    // Home office
    homeOffice: api.home_office_name ?? "—",
    homeOfficeOID: api.home_office_id
      ? `O-${api.home_office_id}`
      : undefined,

    // Assigned offices
    assignedOfficeOIDs:
      api.assigned_office_ids?.map((id: number) => `O-${id}`) ?? [],

    assignedOfficeNames: api.assigned_office_names ?? [],

    // Role & security
    role: api.role ?? "—",
    securityGroup: api.security_group ?? "—",

    // Login / audit
    lastLogin: api.last_login_at
      ? new Date(api.last_login_at).toLocaleString()
      : "Never",

    createdAt: api.created_at
      ? new Date(api.created_at).toLocaleString()
      : undefined,

    updatedAt: api.updated_at
      ? new Date(api.updated_at).toLocaleString()
      : undefined,

    updatedBy: api.updated_by ?? "-",
    

    // 🔽 NOW REAL DATA (from backend)
    permittedIPs: api.permittedIPs ?? [],
    groupMemberships: api.groupMemberships ?? [],

    recentTimeEntries:
      api.recentTimeEntries?.map((dt: string) =>
        new Date(dt).toLocaleString()
      ) ?? [],

    timeClockEnabled: api.timeClockEnabled ?? false,
    clockInRequired: api.clockInRequired ?? false,

    // User preferences (from user_preferences table)
    // theme: api.theme ?? "Light Mode",
    // language: api.language ?? "English (US)",
    // dateFormat: api.dateFormat ?? "MM/DD/YYYY",
    // timeFormat: api.timeFormat ?? "12-hour",
    // emailNotifications: api.emailNotifications ?? true,
    // smsNotifications: api.smsNotifications ?? false,
    // defaultView: api.startup_screen ?? "Dashboard",
    // itemsPerPage: api.itemsPerPage ?? 50,
    // User preferences (from backend)
    startupScreen: api.startupScreen ?? "Dashboard",
    perioTemplate: api.perioTemplate ?? null,
    defaultNavigationSearch: api.defaultNavigationSearch ?? true,
    defaultSearchBy: api.defaultSearchBy ?? "Patient Name",
    productionView: api.productionView ?? "Daily",
    hideProviderTime: api.hideProviderTime ?? false,
    defaultView: api.defaultView ?? "Dashboard",
    showProductionColors: api.showProductionColors ?? true,
    printLabels: api.printLabels ?? false,
    promptEntryDate: api.promptEntryDate ?? true,
    includeInactivePatients: api.includeInactivePatients ?? false,
    referralView: api.referralView ?? null,
    userRoleType: api.userRoleType ?? null,

    // Constraints (optional but useful)
    patientAccessLevel: api.patient_access_level ?? null,
    allowedDays: api.allowed_days ?? [],
    allowedFrom: api.allowed_from ?? null,
    allowedUntil: api.allowed_until ?? null,
  };
};



// export const mapApiUserToUI = (api: any): User => {
//   return {
//     id: `U-${api.user_id}`,
//     firstName: api.first_name,
//     lastName: api.last_name,
//     username: api.username,
//     email: api.email,

//     active: api.is_active,

//     pgid: `P-${api.pgid}`,
//     pgidName: api.pgid_name,

//     homeOffice: api.home_office_name ?? "—",
//     homeOfficeOID: api.home_office_id
//       ? `O-${api.home_office_id}`
//       : undefined,

//     assignedOfficeOIDs: api.assigned_office_ids?.map(
//       (id: number) => `O-${id}`
//     ) ?? [],

//     assignedOfficeNames: api.assigned_office_names ?? [],

//     role: api.role ?? "—",
//     securityGroup: api.security_group ?? "—",

//     lastLogin: api.last_login_at
//       ? new Date(api.last_login_at).toLocaleString()
//       : "Never",

//     // 🔽 placeholders (will be filled by other APIs)
//     permittedIPs: ["0.0.0.0.121"], // placeholder
//     groupMemberships: ["Default Group"], // placeholder
//     recentTimeEntries: ["09/15/2023 - 08:00 AM", "09/14/2023 - 05:00 PM"], // placeholder
//     timeClockEnabled: false,
//     clockInRequired: false,

//     // User settings defaults
//     theme: "Light Mode",
//     language: "English (US)",
//     dateFormat: "MM/DD/YYYY",
//     timeFormat: "12-hour",
//     emailNotifications: true,
//     smsNotifications: false,
//     defaultView: "Dashboard",
//     itemsPerPage: 50,
//   };
// };

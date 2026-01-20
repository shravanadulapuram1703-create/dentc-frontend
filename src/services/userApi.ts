import api from "./api";

/* =========================================================
   TYPES
========================================================= */

export interface PermittedIP {
  id: string;
  ipAddress: string;
  description?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupMembership {
  groupId: string;
  groupName: string;
  groupCode?: string; // The code from group_memberships array (e.g., "office", "tenant")
  description?: string;
  joinedDate?: string;
  role?: string;
}

export interface TimeClockEntry {
  id?: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: string;
  notes?: string;
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  defaultView?: string;
  itemsPerPage?: number;
  // Navigation defaults (from AddEditUserModal)
  startupScreen?: string;
  defaultPerioScreen?: string;
  defaultNavigationSearch?: string;
  defaultSearchBy?: string;
  defaultReferralView?: string;
  // Scheduler & Production Preferences
  showProductionView?: boolean;
  hideProviderTime?: boolean;
  printLabels?: boolean;
  // Data Entry Behavior
  promptEntryDate?: boolean;
  includeInactivePatients?: boolean;
  // Referral & Specialty Flags
  hipaaCompliantScheduler?: boolean;
  isOrthoAssistant?: boolean;
}

export interface UserDetails {
  // Core Identity
  id: string;
  userId?: string; // numeric ID from backend
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  
  // Status
  active: boolean;
  lastLogin?: string;
  
  // Organization Context
  pgid: string;
  pgidName: string;
  
  // Office Assignment
  homeOffice: string;
  homeOfficeOID: string;
  assignedOfficeOIDs: string[];
  assignedOfficeNames?: string[];
  
  // Security & Role
  role: string;
  securityGroup: string;
  roles?: string[];
  securityGroups?: string[];
  
  // Account Security
  passwordLastChanged?: string;
  mustChangePassword?: boolean;
  accountLockedUntil?: string;
  failedLoginAttempts?: number;
  requireIPCheck?: boolean;
  
  // Permitted IPs
  permittedIPs?: PermittedIP[];
  
  // Group Memberships
  groupMemberships?: GroupMembership[];
  
  // Time Clock
  timeClockEnabled?: boolean;
  clockInRequired?: boolean;
  recentTimeEntries?: TimeClockEntry[];
  timeClockPayRate?: number | null;
  timeClockOvertimeMethod?: string | null;
  timeClockOvertimeRate?: number | null;
  
  // User Preferences
  preferences?: UserPreferences;
  
  // Audit Fields
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

/* =========================================================
   API FUNCTIONS
========================================================= */

/**
 * Extract numeric user ID from user identifier (e.g., "U-123" -> "123")
 */
function extractUserId(userId: string): string {
  return userId.replace(/^U-/, "");
}

/**
 * Fetch complete user details including all related data
 * @param userId - User ID (can be "U-123" format or numeric "123")
 */
export const fetchUserDetails = async (userId: string): Promise<UserDetails | null> => {
  try {
    const numericId = extractUserId(userId);
    
    // Fetch all user data in parallel
    const [userRes, ipRes, groupsRes, timeClockRes, preferencesRes] = await Promise.allSettled([
      api.get(`/api/v1/users/${numericId}`),
      api.get(`/api/v1/users/${numericId}/ip-rules`).catch(() => ({ data: [] })),
      api.get(`/api/v1/users/${numericId}/groups`).catch(() => ({ data: [] })),
      api.get(`/api/v1/users/${numericId}/time-clock`).catch(() => ({ data: null })),
      api.get(`/api/v1/users/${numericId}/preferences`).catch(() => ({ data: null })),
    ]);

    // Extract successful responses
    const userData = userRes.status === "fulfilled" ? userRes.value.data : null;
    if (!userData) {
      throw new Error("Failed to fetch user data");
    }

    const ipData = ipRes.status === "fulfilled" ? ipRes.value.data : [];
    const groupsData = groupsRes.status === "fulfilled" ? groupsRes.value.data : [];
    const timeClockData = timeClockRes.status === "fulfilled" ? timeClockRes.value.data : null;
    const preferencesData = preferencesRes.status === "fulfilled" ? preferencesRes.value.data : null;

    // Transform API response to UserDetails format
    return {
      // Core Identity
      id: userData.id || `U-${userData.user_id}`,
      userId: String(userData.user_id || userData.id),
      firstName: userData.first_name || userData.firstName || "",
      lastName: userData.last_name || userData.lastName || "",
      username: userData.username || "",
      email: userData.email || "",
      
      // Status
      active: userData.is_active !== false,
      lastLogin: userData.last_login_at || userData.lastLogin || undefined,
      
      // Organization Context
      pgid: userData.pgid || `P-${userData.tenant_id}` || "",
      pgidName: userData.pgid_name || userData.tenant_name || userData.pgidName || "",
      
      // Office Assignment
      homeOffice: userData.home_office_name || userData.homeOffice || "",
      homeOfficeOID: userData.home_office_id 
        ? (String(userData.home_office_id).startsWith("O-") 
          ? userData.home_office_id 
          : `O-${userData.home_office_id}`)
        : "",
      assignedOfficeOIDs: (userData.assigned_offices || userData.assigned_office_ids || userData.assignedOfficeOIDs || []).map((id: number | string) =>
        String(id).startsWith("O-") ? String(id) : `O-${id}`
      ),
      assignedOfficeNames: userData.assigned_office_names || userData.assignedOfficeNames || [],
      
      // Security & Role - handle both single values and arrays
      role: Array.isArray(userData.roles) && userData.roles.length > 0 
        ? userData.roles[0] 
        : (userData.role || userData.user_role || ""),
      securityGroup: Array.isArray(userData.security_groups) && userData.security_groups.length > 0
        ? userData.security_groups[0]
        : (userData.security_group || userData.securityGroup || ""),
      roles: Array.isArray(userData.roles) ? userData.roles : (userData.role ? [userData.role] : []),
      securityGroups: Array.isArray(userData.security_groups) ? userData.security_groups : (userData.security_group ? [userData.security_group] : []),
      
      // Account Security
      passwordLastChanged: userData.password_last_changed || userData.passwordLastChanged || undefined,
      mustChangePassword: userData.must_change_password || userData.mustChangePassword || false,
      accountLockedUntil: userData.account_locked_until || userData.accountLockedUntil || undefined,
      failedLoginAttempts: userData.failed_login_attempts || userData.failedLoginAttempts || 0,
      requireIPCheck: userData.require_ip_check || userData.requireIPCheck || false,
      
      // Permitted IPs
      permittedIPs: (ipData || []).map((ip: any) => ({
        id: ip.id || String(ip.ip_address),
        ipAddress: ip.ip_address || ip.ipAddress || "",
        description: ip.description || "",
        active: ip.active !== false,
        created_at: ip.created_at,
        updated_at: ip.updated_at,
      })),
      
      // Group Memberships - check both the groups endpoint response and direct group_memberships array from user data
      groupMemberships: (() => {
        // First, check if userData has group_memberships array (simple string codes)
        const directGroupMemberships = userData.group_memberships || userData.groupMemberships || [];
        if (Array.isArray(directGroupMemberships) && directGroupMemberships.length > 0) {
          // If it's an array of strings (codes), return them as simple objects
          return directGroupMemberships.map((code: string) => ({
            groupId: code,
            groupName: code, // Will be resolved to name using metadata
            groupCode: code,
          }));
        }
        // Otherwise, use the groups endpoint response (if available)
        return (groupsData || []).map((group: any) => ({
          groupId: group.group_id || group.groupId || "",
          groupName: group.group_name || group.groupName || "",
          groupCode: group.group_code || group.groupCode || group.group_id || group.groupId || "",
          description: group.description || "",
          joinedDate: group.joined_date || group.joinedDate || group.created_at || "",
          role: group.role || "",
        }));
      })(),
      
      // Time Clock
      timeClockEnabled: timeClockData?.enabled || userData.time_clock_enabled || userData.timeClockEnabled || false,
      clockInRequired: timeClockData?.clock_in_required || userData.clock_in_required || userData.clockInRequired || false,
      recentTimeEntries: timeClockData?.recent_entries || timeClockData?.recentEntries || userData.recent_time_entries || userData.recentTimeEntries || [],
      // Time Clock Settings (from userData or timeClockData)
      timeClockPayRate: userData.time_clock?.pay_rate || timeClockData?.pay_rate || userData.timeClockPayRate || null,
      timeClockOvertimeMethod: userData.time_clock?.overtime_method || timeClockData?.overtime_method || userData.timeClockOvertimeMethod || null,
      timeClockOvertimeRate: userData.time_clock?.overtime_rate || timeClockData?.overtime_rate || userData.timeClockOvertimeRate || null,
      
      // User Preferences - match AddEditUserModal structure
      preferences: preferencesData || userData.preferences ? {
        // Display settings
        theme: (preferencesData || userData.preferences)?.theme,
        language: (preferencesData || userData.preferences)?.language,
        dateFormat: (preferencesData || userData.preferences)?.date_format || (preferencesData || userData.preferences)?.dateFormat,
        timeFormat: (preferencesData || userData.preferences)?.time_format || (preferencesData || userData.preferences)?.timeFormat,
        itemsPerPage: (preferencesData || userData.preferences)?.items_per_page || (preferencesData || userData.preferences)?.itemsPerPage,
        defaultView: (preferencesData || userData.preferences)?.default_view || (preferencesData || userData.preferences)?.defaultView || (preferencesData || userData.preferences)?.startup_screen || (preferencesData || userData.preferences)?.startupScreen,
        
        // Navigation defaults (from AddEditUserModal)
        startupScreen: (preferencesData || userData.preferences)?.startup_screen || (preferencesData || userData.preferences)?.startupScreen,
        defaultPerioScreen: (preferencesData || userData.preferences)?.default_perio_screen || (preferencesData || userData.preferences)?.defaultPerioScreen,
        defaultNavigationSearch: (preferencesData || userData.preferences)?.default_navigation_search || (preferencesData || userData.preferences)?.defaultNavigationSearch,
        defaultSearchBy: (preferencesData || userData.preferences)?.default_search_by || (preferencesData || userData.preferences)?.defaultSearchBy,
        defaultReferralView: (preferencesData || userData.preferences)?.default_referral_view || (preferencesData || userData.preferences)?.defaultReferralView,
        
        // Scheduler & Production Preferences
        showProductionView: (preferencesData || userData.preferences)?.show_production_view !== false,
        hideProviderTime: (preferencesData || userData.preferences)?.hide_provider_time || false,
        printLabels: (preferencesData || userData.preferences)?.print_labels || (preferencesData || userData.preferences)?.printLabelsForAppointments || false,
        
        // Data Entry Behavior
        promptEntryDate: (preferencesData || userData.preferences)?.prompt_entry_date || (preferencesData || userData.preferences)?.promptForEntryDate || false,
        includeInactivePatients: (preferencesData || userData.preferences)?.include_inactive_patients || (preferencesData || userData.preferences)?.includeInactivePatientsInSearch || false,
        
        // Referral & Specialty Flags
        hipaaCompliantScheduler: (preferencesData || userData.preferences)?.hipaa_compliant_scheduler || (preferencesData || userData.preferences)?.hipaaCompliantScheduler || false,
        isOrthoAssistant: (preferencesData || userData.preferences)?.is_ortho_assistant || (preferencesData || userData.preferences)?.isOrthoAssistant || false,
        
        // Notification preferences
        emailNotifications: (preferencesData || userData.preferences)?.email_notifications !== false,
        smsNotifications: (preferencesData || userData.preferences)?.sms_notifications || false,
      } : undefined,
      
      // Audit Fields
      createdBy: userData.created_by || undefined,
      createdAt: userData.created_at || undefined,
      updatedBy: userData.updated_by || undefined,
      updatedAt: userData.updated_at || undefined,
    };
  } catch (error: any) {
    console.error("Error fetching user details:", error);
    throw error;
  }
};

/**
 * Refresh user details (useful after updates)
 */
export const refreshUserDetails = fetchUserDetails;

/* =========================================================
   USER CRUD OPERATIONS
========================================================= */

/**
 * Fetch user details for editing (complete user data for AddEditUserModal)
 * This fetches the same data as ViewUserDetailsModal but returns it in BackendUser format
 * @param userId - User ID (numeric or "U-123" format)
 */
export const fetchUserForEdit = async (userId: string | number): Promise<BackendUser> => {
  const numericId = typeof userId === "string" ? extractUserId(userId) : String(userId);
  
  // Fetch complete user data - same as GET /api/v1/users/{userId} endpoint
  // This should return all fields including preferences, time_clock, etc.
  const response = await api.get<any>(`/api/v1/users/${numericId}`);
  const data = response.data;
  
  // Transform API response to BackendUser format
  // Handle both snake_case and camelCase responses
  const backendUser: BackendUser = {
    user_id: data.user_id || parseInt(numericId, 10),
    username: data.username || null,
    first_name: data.first_name || data.firstName || null,
    last_name: data.last_name || data.lastName || null,
    email: data.email || null,
    phone: data.phone || null,
    is_active: data.is_active !== false,
    home_office_id: data.home_office_id || data.homeOfficeId || null,
    assigned_offices: data.assigned_offices || data.assignedOffices || data.assigned_office_ids || [],
    roles: data.roles || (data.role ? [data.role] : []),
    security_groups: data.security_groups || data.securityGroups || (data.security_group ? [data.security_group] : []),
    group_memberships: data.group_memberships || data.groupMemberships || [],
    permitted_ips: data.permitted_ips || data.permittedIPs || [],
    time_clock: data.time_clock || data.timeClock || {
      pay_rate: null,
      overtime_method: null,
      overtime_rate: null,
    },
    preferences: data.preferences || {},
  };
  
  return backendUser;
};

/**
 * Create a new user
 * @param userData - User creation payload
 */
export const createUser = async (userData: any): Promise<BackendUser> => {
  const response = await api.post<BackendUser>("/api/v1/users", userData);
  return response.data;
};

/**
 * Update an existing user
 * @param userId - User ID (numeric or "U-123" format)
 * @param userData - User update payload
 */
export const updateUser = async (userId: string | number, userData: any): Promise<BackendUser> => {
  const numericId = typeof userId === "string" ? extractUserId(userId) : String(userId);
  
  const response = await api.put<BackendUser>(`/api/v1/users/${numericId}`, userData);
  return response.data;
};

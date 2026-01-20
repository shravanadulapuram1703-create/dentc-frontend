import { useState, useEffect, useMemo } from "react";
import { X, UserCheck, Shield, Clock, Settings, Wifi, RefreshCw, AlertCircle } from "lucide-react";
import { ReadOnlyField } from "../ReadOnlyField";
import { fetchUserDetails, type UserDetails } from "../../services/userApi";
import api from "../../services/api";
import type { UserSetupResponse } from "../../types/userSetup";

/* =========================================================
   TYPES
========================================================= */

interface ViewUserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null; // Changed from user object to userId
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ViewUserDetailsModal({
  isOpen,
  onClose,
  userId,
}: ViewUserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<UserSetupResponse | null>(null);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);
  const [groupMembershipsMetadata, setGroupMembershipsMetadata] = useState<Array<{ code: string; name: string; description?: string }>>([]);

  // Fetch setup data (offices, roles, groups, etc.) - same as AddEditUserModal
  useEffect(() => {
    if (!isOpen) return;

    setSetupLoading(true);
    api
      .get<UserSetupResponse>("/api/v1/users/setup")
      .then(res => setSetup(res.data))
      .catch(err => {
        console.error("Failed to load setup data:", err);
      })
      .finally(() => setSetupLoading(false));
  }, [isOpen]);

  // Fetch group memberships metadata
  useEffect(() => {
    if (!isOpen) return;

    api
      .get<{ groups: Array<{ code: string; name: string; description?: string }> }>("/api/v1/users/groups-metadata")
      .then(res => {
        setGroupMembershipsMetadata(res.data.groups || []);
      })
      .catch(err => {
        console.error("Failed to load group memberships metadata:", err);
        setGroupMembershipsMetadata([]);
      });
  }, [isOpen]);

  // Fetch user details when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUserDetails();
    } else {
      // Reset state when modal closes
      setUser(null);
      setError(null);
      setActiveTab(1);
    }
  }, [isOpen, userId]);

  const loadUserDetails = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const userData = await fetchUserDetails(userId);
      setUser(userData);
    } catch (err: any) {
      console.error("Error loading user details:", err);
      setError(err.response?.data?.detail || err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadUserDetails();
  };

  // Helper function to normalize OID (remove "O-" prefix)
  const normalizeOID = (v: string | number): string => {
    return String(v).replace(/^O-/, "");
  };

  // Get organization info from setup (same as AddEditUserModal)
  const organization = setup?.organization;
  const availableOffices = setup?.offices ?? [];
  const securityGroups = setup?.security_groups?.map(g => g.code) ?? [];
  const userRoles = setup?.roles?.map(r => r.code) ?? [];

  // Create a map of office IDs to office names (from setup data)
  const officeNameById = useMemo(() => {
    const map = new Map<string, string>();
    
    // First, use office names from user data if available
    if (user?.assignedOfficeOIDs && user?.assignedOfficeNames) {
      user.assignedOfficeOIDs.forEach((oid, index) => {
        const normalizedOid = normalizeOID(oid);
        const officeName = user.assignedOfficeNames?.[index] || "Unknown Office";
        map.set(normalizedOid, officeName);
      });
    }
    
    // Then, supplement with setup data - match by office_id (numeric)
    availableOffices.forEach(office => {
      // Map both the numeric ID and the OID format
      const numericId = String(office.office_id);
      const oidFormat = office.office_oid || `O-${office.office_id}`;
      const normalizedOid = normalizeOID(oidFormat);
      
      // Store by numeric ID
      map.set(numericId, office.office_name);
      // Also store by normalized OID format
      map.set(normalizedOid, office.office_name);
    });
    
    return map;
  }, [user?.assignedOfficeOIDs, user?.assignedOfficeNames, availableOffices]);

  if (!isOpen) return null;

  const tabs = [
    { id: 1, label: "Login Info & Office Access", icon: UserCheck },
    { id: 2, label: "Permitted IPs", icon: Wifi },
    { id: 3, label: "Group Memberships", icon: Shield },
    { id: 4, label: "Time Clock", icon: Clock },
    { id: 5, label: "User Settings", icon: Settings },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">View User Details</h2>
            {user ? (
              <p className="text-sm text-[#E2E8F0]">
                {user.firstName} {user.lastName} (@{user.username}) — Read Only
              </p>
            ) : (
              <p className="text-sm text-[#E2E8F0]">Loading user details...</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 hover:bg-white/20 rounded-lg disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#F7F9FC] border-b border-[#E2E8F0] flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-4 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#3A6EA5] text-[#3A6EA5] bg-white"
                    : "border-transparent text-[#64748B] hover:text-[#1F3A5F]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {loading && !user && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-[#3A6EA5] animate-spin mx-auto mb-4" />
                <p className="text-[#64748B] font-bold">Loading user details...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !user && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-bold mb-2">Failed to load user details</p>
                <p className="text-[#64748B] text-sm mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* User Data */}
          {!loading && !error && user && (
            <>
          {activeTab === 1 && (
            <div className="space-y-8">
              {/* Organization Context */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Organization Context
                </h3>

                <div className="bg-[#F0F9FF] border-2 border-[#3B82F6] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#1E3A8A] mb-1">
                        PRACTICE GROUP ID (PGID)
                      </label>
                      <p className="font-bold text-[#1E293B] mb-1">
                        {organization?.pgid || user.pgid} - {organization?.pgid_name || user.pgidName || "—"}
                      </p>
                      <p className="text-sm text-[#64748B]">
                        This user will inherit data access permissions based on PGID {organization?.pgid || user.pgid}. 
                        All users in this practice group share the same organizational boundary.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity & Login */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Identity & Login
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label="Username" value={user.username} />
                  <ReadOnlyField label="Email" value={user.email} />
                  <ReadOnlyField label="First Name" value={user.firstName} />
                  <ReadOnlyField label="Last Name" value={user.lastName} />
                </div>
              </div>

              {/* Account Status */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Account Status
                </h3>

                <ReadOnlyField
                  label="Status"
                  value={user.active ? "Active (Can log in)" : "Inactive (Login disabled)"}
                />
              </div>

              {/* Security & Role */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Security & Role
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField 
                    label="Primary Security Group" 
                    value={user.securityGroup || user.securityGroups?.[0] || "—"} 
                  />
                  <ReadOnlyField 
                    label="User Role / Type" 
                    value={user.role || user.roles?.[0] || "—"} 
                  />
                </div>
              </div>

              {/* Office Assignment */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Office Assignment & OID Mapping
                </h3>

                {/* Assigned Offices Display */}
                <div className="mb-4">
                  <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                    Assigned Offices ({user.assignedOfficeOIDs?.length || 0})
                  </label>
                  {user.assignedOfficeOIDs && user.assignedOfficeOIDs.length > 0 ? (
                    <div className="border-2 border-[#3A6EA5] rounded-lg p-3 min-h-[100px] bg-white">
                      <div className="grid grid-cols-2 gap-2">
                        {user.assignedOfficeOIDs.map((oid, index) => {
                          const normalizedOid = normalizeOID(oid);
                          const officeName = officeNameById.get(normalizedOid) || user.assignedOfficeNames?.[index] || "Unknown Office";
                          return (
                            <div
                              key={oid || index}
                              className="px-3 py-2 bg-[#E8EFF7] border border-[#3A6EA5] rounded text-sm"
                            >
                              <div className="font-bold text-[#1E293B]">{officeName}</div>
                              <div className="text-xs text-[#3A6EA5] font-bold">
                                OID: {oid}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-[#E2E8F0] rounded-lg p-8 text-center text-[#64748B] text-sm">
                      No assigned offices
                    </div>
                  )}
                </div>

                {/* Home Office */}
                <div>
                  <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                    Home Office (OID)
                  </label>
                  <div className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-[#F7F9FC]">
                    {(() => {
                      const homeOfficeId = user.homeOfficeOID ? normalizeOID(user.homeOfficeOID) : null;
                      const homeOfficeName = homeOfficeId 
                        ? (officeNameById.get(homeOfficeId) || user.homeOffice || "Unknown Office")
                        : (user.homeOffice || "—");
                      const homeOfficeOID = user.homeOfficeOID || "—";
                      return homeOfficeId 
                        ? `${homeOfficeName} (OID: ${homeOfficeOID})`
                        : homeOfficeName;
                    })()}
                  </div>
                  <p className="text-sm text-[#64748B] mt-1">
                    Default office on login • Home OID: {user.homeOfficeOID || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          )}



          {/* {activeTab === 2 && <div>Permitted IPs content</div>} */}
          {activeTab === 2 && (
            <div>
              <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 pb-2">
                IP Address Restrictions
              </h3>

              {user.permittedIPs && user.permittedIPs.length > 0 ? (
                <table className="w-full border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                  <thead className="bg-[#1F3A5F] text-white">
                    <tr>
                      <th className="px-4 py-2 text-left">IP Address</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.permittedIPs.map((ip, index) => (
                      <tr key={ip?.id || index} className="border-t">
                        <td className="px-4 py-2">{ip.ipAddress || "—"}</td>
                        <td className="px-4 py-2">{ip.description || "—"}</td>
                        <td className="px-4 py-2 font-bold">
                          {ip.active ? "Active" : "Inactive"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-[#64748B]">
                  No IP restrictions configured
                </div>
              )}
            </div>
          )}

          {/* {activeTab === 3 && <div>Group Memberships content</div>} */}

          {/* {activeTab === 3 && (
            <div className="space-y-3">
              {user.groupMemberships?.length ? (
                user.groupMemberships.map((group) => (
                  <div
                    key={group.groupName}
                    className="border rounded-lg p-3 bg-[#F8FAFC]"
                  >
                    <div className="font-bold">{group.groupName}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">
                  No group memberships
                </div>
              )}
            </div>
          )} */}

          {activeTab === 3 && (
            <div>
              <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 pb-2">
                User Group Memberships
              </h3>

              {(() => {
                // Get group membership codes from user data
                // Check both groupMemberships array and direct group_memberships codes
                const groupCodes: string[] = [];
                
                if (user.groupMemberships && user.groupMemberships.length > 0) {
                  // Extract codes from groupMemberships objects
                  user.groupMemberships.forEach(gm => {
                    const code = gm.groupCode || gm.groupId || gm.groupName;
                    if (code && !groupCodes.includes(code)) {
                      groupCodes.push(code);
                    }
                  });
                }

                // Create a map of code -> name from metadata
                const codeToNameMap = new Map<string, string>();
                groupMembershipsMetadata.forEach(g => {
                  codeToNameMap.set(g.code, g.name);
                });

                if (groupCodes.length === 0) {
                  return (
                    <div className="text-sm text-[#64748B]">
                      No group memberships
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {groupCodes.map((groupCode) => {
                      const groupName = codeToNameMap.get(groupCode) || groupCode;
                      const groupMeta = groupMembershipsMetadata.find(g => g.code === groupCode);
                      
                      return (
                        <div
                          key={groupCode}
                          className="px-3 py-2 bg-white border-2 border-[#3A6EA5] rounded-lg"
                        >
                          <div className="font-bold text-[#1F3A5F] mb-1">
                            {groupName}
                          </div>
                          {groupMeta?.description && (
                            <div className="text-sm text-[#64748B]">
                              {groupMeta.description}
                            </div>
                          )}
                          <div className="text-xs text-[#3A6EA5] font-bold mt-1">
                            Code: {groupCode}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}




          {activeTab === 4 && (
            <div className="space-y-6">
              <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                Time Clock Settings
              </h3>

              <p className="text-sm text-[#64748B] mb-4">
                Applies only if user participates in time tracking. Used by payroll and time clock modules.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField
                  label="Time Clock Pay Rate ($/hour)"
                  value={
                    user.timeClockPayRate != null && user.timeClockPayRate !== undefined
                      ? `$${Number(user.timeClockPayRate).toFixed(2)}`
                      : "—"
                  }
                />
                <ReadOnlyField
                  label="Overtime Method"
                  value={user.timeClockOvertimeMethod ? user.timeClockOvertimeMethod.charAt(0).toUpperCase() + user.timeClockOvertimeMethod.slice(1) : "—"}
                />
                <ReadOnlyField
                  label="Overtime Rate Multiplier"
                  value={user.timeClockOvertimeRate ? `${user.timeClockOvertimeRate}x` : "—"}
                />
                <ReadOnlyField
                  label="Time Clock Status"
                  value={user.timeClockEnabled ? "Enabled" : "Not Enabled"}
                />
                <ReadOnlyField
                  label="Clock In Required"
                  value={user.clockInRequired ? "Yes" : "No"}
                />
              </div>

              {user.recentTimeEntries && user.recentTimeEntries.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide">
                    Recent Time Entries
                  </h4>
                  <table className="w-full border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                    <thead className="bg-[#1F3A5F] text-white">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Clock In</th>
                        <th className="px-4 py-2 text-left">Clock Out</th>
                        <th className="px-4 py-2 text-left">Total Hours</th>
                        {user.recentTimeEntries.some(entry => entry?.notes) && (
                          <th className="px-4 py-2 text-left">Notes</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {user.recentTimeEntries.map((entry, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{entry?.date || "—"}</td>
                          <td className="px-4 py-2">{entry?.clockIn || "—"}</td>
                          <td className="px-4 py-2">{entry?.clockOut || "—"}</td>
                          <td className="px-4 py-2 font-bold">{entry?.totalHours || "—"}</td>
                          {user.recentTimeEntries?.some(e => e?.notes) && (
                            <td className="px-4 py-2">{entry?.notes || "—"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* <ReadOnlyField
            label="Time Clock"
            value={user.timeClockEnabled ? "Enabled" : "Not Enabled"}
          /> */}




          {activeTab === 5 && (
            <div className="space-y-6">
              <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                User Preferences & Settings
              </h3>

              {/* Navigation Defaults */}
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                  Navigation Defaults
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label="Start-up Screen" value={user.preferences?.startupScreen || "—"} />
                  <ReadOnlyField label="Default Perio Screen" value={user.preferences?.defaultPerioScreen || "—"} />
                  <ReadOnlyField label="Default Navigation Search" value={user.preferences?.defaultNavigationSearch || "—"} />
                  <ReadOnlyField label="Default Search By" value={user.preferences?.defaultSearchBy || "—"} />
                  <ReadOnlyField label="Default Referral View" value={user.preferences?.defaultReferralView || "—"} />
                </div>
              </div>

              {/* Scheduler & Production Preferences */}
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                  Scheduler & Production Preferences
                </h4>
                <div className="space-y-2">
                  <ReadOnlyField
                    label="Show Production View"
                    value={user.preferences?.showProductionView ? "Yes (production colors in appointments)" : "No"}
                  />
                  <ReadOnlyField
                    label="Hide Provider Time in Scheduler"
                    value={user.preferences?.hideProviderTime ? "Yes" : "No"}
                  />
                  <ReadOnlyField
                    label="Print Labels for Appointments"
                    value={user.preferences?.printLabels ? "Yes" : "No"}
                  />
                </div>
              </div>

              {/* Data Entry Behavior */}
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                  Data Entry Behavior
                </h4>
                <div className="space-y-2">
                  <ReadOnlyField
                    label="Prompt for Entry Date"
                    value={user.preferences?.promptEntryDate ? "Yes" : "No"}
                  />
                  <ReadOnlyField
                    label="Include Inactive Patients in Search"
                    value={user.preferences?.includeInactivePatients ? "Yes" : "No"}
                  />
                </div>
              </div>

              {/* Referral & Specialty Flags */}
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                  Referral & Specialty Flags
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField
                    label="HIPAA Compliant Scheduler"
                    value={user.preferences?.hipaaCompliantScheduler ? "Yes" : "No"}
                  />
                  <ReadOnlyField
                    label="Is Ortho Assistant"
                    value={user.preferences?.isOrthoAssistant ? "Yes" : "No"}
                  />
                </div>
              </div>

              {/* Display Settings */}
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                  Display Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label="Default View" value={user.preferences?.defaultView || "—"} />
                  <ReadOnlyField label="Theme" value={user.preferences?.theme || "—"} />
                  <ReadOnlyField label="Language" value={user.preferences?.language || "—"} />
                  <ReadOnlyField label="Date Format" value={user.preferences?.dateFormat || "—"} />
                  <ReadOnlyField label="Time Format" value={user.preferences?.timeFormat || "—"} />
                  <ReadOnlyField label="Items Per Page" value={user.preferences?.itemsPerPage?.toString() || "—"} />
                </div>
              </div>

              {/* Notification Preferences */}
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                  Notification Preferences
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField
                    label="Email Notifications"
                    value={user.preferences?.emailNotifications ? "Enabled" : "Disabled"}
                  />
                  <ReadOnlyField
                    label="SMS Notifications"
                    value={user.preferences?.smsNotifications ? "Enabled" : "Disabled"}
                  />
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E2E8F0] p-4 bg-[#F7F9FC] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#64748B] text-white rounded-lg hover:bg-[#475569]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

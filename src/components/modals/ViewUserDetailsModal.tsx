import { useState, useEffect, useMemo } from "react";
import { X, UserCheck, Shield, Clock, Settings, Wifi, RefreshCw, AlertCircle } from "lucide-react";
import { ReadOnlyField } from "../ReadOnlyField";
import { fetchUserDetails, type UserDetails } from "../../services/userApi";
import {
  useListOffices,
  useListTenants,
  useListProviders,
} from "../../api/generated/endpoints/organization/organization";
import { useListUserGroups } from "../../api/generated/endpoints/staff/staff";
import { formatUsDateTime } from "../../utils/datetime";
import { apiAssetUrl } from "../../utils/apiAsset";

/* =========================================================
   TYPES
========================================================= */

interface ViewUserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | number | null;
}

const LIST_PARAMS = { size: 200 } as const;

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

  // Lookups for resolving display names (backend-driven via generated hooks).
  const officesQ = useListOffices(LIST_PARAMS, { query: { enabled: isOpen } });
  const tenantsQ = useListTenants(LIST_PARAMS, { query: { enabled: isOpen } });
  const groupsQ = useListUserGroups(LIST_PARAMS, { query: { enabled: isOpen } });

  const officeById = useMemo(() => {
    const map = new Map<number, { name: string; office_code: string }>();
    for (const o of officesQ.data?.items ?? []) {
      map.set(o.id, { name: o.name, office_code: o.office_code });
    }
    return map;
  }, [officesQ.data]);

  const tenantById = useMemo(() => {
    const map = new Map<number, { name: string; code: string }>();
    for (const t of tenantsQ.data?.items ?? []) map.set(t.id, { name: t.name, code: t.code });
    return map;
  }, [tenantsQ.data]);

  const groupNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of groupsQ.data?.items ?? []) map.set(g.id, g.name);
    return map;
  }, [groupsQ.data]);

  const providersQ = useListProviders({ size: 200 }, { query: { enabled: isOpen } });
  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of providersQ.data?.items ?? []) map.set(p.id, p.name);
    return map;
  }, [providersQ.data]);

  // Fetch user details when modal opens
  useEffect(() => {
    if (isOpen && userId != null) {
      loadUserDetails();
    } else {
      setUser(null);
      setError(null);
      setActiveTab(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const loadUserDetails = async () => {
    if (userId == null) return;
    setLoading(true);
    setError(null);
    try {
      setUser(await fetchUserDetails(userId));
    } catch (err: any) {
      console.error("Error loading user details:", err);
      setError(err.response?.data?.detail || err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => loadUserDetails();

  if (!isOpen) return null;

  const tenant = user ? tenantById.get(user.tenant_id) : undefined;
  const pgidLabel = tenant?.code ?? (user ? `P-${user.tenant_id}` : "—");
  const pgidName = tenant?.name ?? "—";

  const lr = user?.login_restrictions;
  const loginHoursLabel = !lr
    ? "—"
    : lr.is_24_7
      ? "24/7 (no restriction)"
      : `${lr.allowed_days || "—"} · ${(lr.start_time ?? "").slice(0, 5)}–${(lr.end_time ?? "").slice(0, 5)}`;

  const pref = (k: string) => user?.preferences[k] || "—";
  const prefYesNo = (k: string) => {
    const v = user?.preferences[k];
    return v == null ? "—" : v === "true" ? "Yes" : "No";
  };

  const officeLabel = (officeId: number): string => {
    const o = officeById.get(officeId);
    return o ? `${o.name} (OID: ${o.office_code})` : `Office ${officeId}`;
  };

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
          <div className="flex items-center gap-3">
            {user?.image_url && (
              <img
                src={apiAssetUrl(user.image_url)}
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-white/40"
              />
            )}
            <div>
              <h2 className="text-xl font-bold">View User Details</h2>
              {user ? (
                <p className="text-sm text-[#E2E8F0]">
                  {user.first_name} {user.last_name} (@{user.username}) — Read Only
                </p>
              ) : (
                <p className="text-sm text-[#E2E8F0]">Loading user details...</p>
              )}
            </div>
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
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
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
                            {pgidLabel} - {pgidName}
                          </p>
                          <p className="text-sm text-[#64748B]">
                            This user inherits data access permissions based on PGID {pgidLabel}.
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
                      <ReadOnlyField label="Short ID" value={user.short_id || "—"} />
                      <ReadOnlyField label="Email" value={user.email} />
                      <ReadOnlyField label="First Name" value={user.first_name} />
                      <ReadOnlyField label="Last Name" value={user.last_name} />
                      <ReadOnlyField label="Phone" value={user.phone || "—"} />
                      <ReadOnlyField label="Custom 1" value={user.custom_1 || "—"} />
                      <ReadOnlyField label="Custom 2" value={user.custom_2 || "—"} />
                      <ReadOnlyField
                        label="Last Login"
                        value={user.last_login_at ? formatUsDateTime(user.last_login_at) : "Never"}
                      />
                    </div>
                  </div>

                  {/* Account Status */}
                  <div>
                    <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                      Account Status
                    </h3>
                    <ReadOnlyField
                      label="Status"
                      value={user.is_active ? "Active (Can log in)" : "Inactive (Login disabled)"}
                    />
                  </div>

                  {/* Audit Information (times shown in US Eastern) */}
                  <div>
                    <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                      Audit Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <ReadOnlyField label="Created On" value={formatUsDateTime(user.created_at)} />
                      <ReadOnlyField
                        label="Created By"
                        value={user.created_by_name || (user.created_by != null ? `User #${user.created_by}` : "—")}
                      />
                      <ReadOnlyField label="Updated On" value={formatUsDateTime(user.updated_at)} />
                      <ReadOnlyField
                        label="Updated By"
                        value={user.updated_by_name || (user.updated_by != null ? `User #${user.updated_by}` : "—")}
                      />
                    </div>
                  </div>

                  {/* Security & Role */}
                  <div>
                    <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                      Security & Role
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <ReadOnlyField label="User Role / Type" value={user.role || "—"} />
                      <ReadOnlyField label="Patient Access Level" value={user.patient_access_level || "—"} />
                      <ReadOnlyField
                        label="Report Access Provider"
                        value={
                          user.report_access_provider_id
                            ? providerNameById.get(user.report_access_provider_id) ||
                              user.report_access_provider_id
                            : "—"
                        }
                      />
                      <ReadOnlyField
                        label="Must Change Password"
                        value={user.must_change_password ? "Yes" : "No"}
                      />
                      <ReadOnlyField label="Login Hours" value={loginHoursLabel} />
                    </div>
                  </div>

                  {/* Office Assignment */}
                  <div>
                    <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                      Office Assignment & OID Mapping
                    </h3>
                    <div className="mb-4">
                      <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                        Assigned Offices ({user.assigned_office_ids.length})
                      </label>
                      {user.assigned_office_ids.length > 0 ? (
                        <div className="border-2 border-[#3A6EA5] rounded-lg p-3 min-h-[100px] bg-white">
                          <div className="grid grid-cols-2 gap-2">
                            {user.assigned_office_ids.map((officeId) => {
                              const o = officeById.get(officeId);
                              return (
                                <div
                                  key={officeId}
                                  className="px-3 py-2 bg-[#E8EFF7] border border-[#3A6EA5] rounded text-sm"
                                >
                                  <div className="font-bold text-[#1E293B]">
                                    {o?.name || `Office ${officeId}`}
                                  </div>
                                  <div className="text-xs text-[#3A6EA5] font-bold">
                                    OID: {o?.office_code || officeId}
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
                        {user.home_office_id != null ? officeLabel(user.home_office_id) : "—"}
                      </div>
                      <p className="text-sm text-[#64748B] mt-1">
                        Default office on login
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Permitted IPs */}
              {activeTab === 2 && (
                <div>
                  <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 pb-2">
                    IP Address Restrictions
                  </h3>
                  {user.permitted_ips.length > 0 ? (
                    <table className="w-full border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <thead className="bg-[#1F3A5F] text-white">
                        <tr>
                          <th className="px-4 py-2 text-left">IP Address</th>
                          <th className="px-4 py-2 text-left">Rule Type</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user.permitted_ips.map((ip) => (
                          <tr key={ip.id} className="border-t">
                            <td className="px-4 py-2">{ip.ip_address || "—"}</td>
                            <td className="px-4 py-2">{ip.rule_type || "—"}</td>
                            <td className="px-4 py-2">{ip.description || "—"}</td>
                            <td className="px-4 py-2 font-bold">
                              {ip.is_active ? "Active" : "Inactive"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#64748B]">No IP restrictions configured</div>
                  )}
                </div>
              )}

              {/* Group Memberships */}
              {activeTab === 3 && (
                <div>
                  <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 pb-2">
                    User Group Memberships
                  </h3>
                  {user.group_ids.length === 0 ? (
                    <div className="text-sm text-[#64748B]">No group memberships</div>
                  ) : (
                    <div className="space-y-2">
                      {user.group_ids.map((groupId) => (
                        <div
                          key={groupId}
                          className="px-3 py-2 bg-white border-2 border-[#3A6EA5] rounded-lg"
                        >
                          <div className="font-bold text-[#1F3A5F] mb-1">
                            {groupNameById.get(groupId) || `Group ${groupId}`}
                          </div>
                          <div className="text-xs text-[#3A6EA5] font-bold">Group ID: {groupId}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Time Clock — from GET /users/{id}/time-clock-config */}
              {activeTab === 4 && (
                <div className="space-y-6">
                  <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                    Time Clock Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField
                      label="Pay Rate ($/hour)"
                      value={
                        user.time_clock.pay_rate != null
                          ? `$${Number(user.time_clock.pay_rate).toFixed(2)}`
                          : "—"
                      }
                    />
                    <ReadOnlyField
                      label="Overtime Method"
                      value={user.time_clock.overtime_method || "—"}
                    />
                    <ReadOnlyField
                      label="Overtime Rate"
                      value={
                        user.time_clock.overtime_rate != null
                          ? `${user.time_clock.overtime_rate}x`
                          : "—"
                      }
                    />
                    <ReadOnlyField
                      label="Clock-in Required"
                      value={user.time_clock.clock_in_required ? "Yes" : "No"}
                    />
                  </div>
                </div>
              )}

              {/* User Settings — backend-driven from user-preferences (key/value) */}
              {activeTab === 5 && (
                <div className="space-y-6">
                  <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                    User Preferences & Settings
                  </h3>

                  <div>
                    <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                      Navigation Defaults
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <ReadOnlyField label="Start-up Screen" value={pref("startup_screen")} />
                      <ReadOnlyField label="Toolbar" value={pref("toolbar")} />
                      <ReadOnlyField label="Perio Setup Template" value={pref("perio_setup_template")} />
                      <ReadOnlyField label="Default Perio Screen" value={pref("default_perio_screen")} />
                      <ReadOnlyField label="Default Navigation Search" value={pref("default_navigation_search")} />
                      <ReadOnlyField label="Default Search By" value={pref("default_search_by")} />
                      <ReadOnlyField label="Default Referral View" value={pref("default_referral_view")} />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                      Scheduler & Production
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <ReadOnlyField label="Production View?" value={prefYesNo("production_view")} />
                      <ReadOnlyField label="Show Production Colors in Appt Units?" value={prefYesNo("show_production_colors")} />
                      <ReadOnlyField label="Hide Provider Time" value={prefYesNo("hide_provider_time")} />
                      <ReadOnlyField label="Print Labels for Appt." value={prefYesNo("print_labels")} />
                      <ReadOnlyField label="Prompt for Entry Date?" value={prefYesNo("prompt_entry_date")} />
                      <ReadOnlyField label="Include Inactive Patients?" value={prefYesNo("include_inactive_patients")} />
                      <ReadOnlyField label="Is Ortho Assistant?" value={prefYesNo("is_ortho_assistant")} />
                      <ReadOnlyField label="HIPAA Compliant Scheduler?" value={prefYesNo("hipaa_compliant_scheduler")} />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide text-sm border-b border-[#E2E8F0] pb-2">
                      Signature
                    </h4>
                    {user.signature_data ? (
                      <img
                        src={user.signature_data}
                        alt="Signature"
                        className="h-24 max-w-[240px] object-contain border-2 border-[#E2E8F0] rounded-lg bg-white"
                      />
                    ) : (
                      <div className="text-sm text-[#64748B]">No signature on file</div>
                    )}
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

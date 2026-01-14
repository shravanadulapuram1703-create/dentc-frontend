import { useState } from "react";
import { X, UserCheck, Shield, Clock, Settings, Wifi } from "lucide-react";
import {ReadOnlyField} from "../ReadOnlyField"

/* =========================================================
   TYPES
========================================================= */

interface PermittedIP {
  id: string;
  ipAddress: string;
  description: string;
  active: boolean;
}

interface GroupMembership {
  groupId: string;
  groupName: string;
  description: string;
  joinedDate: string;
}

interface TimeClockEntry {
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: string;
  notes?: string;
}

interface UserData {
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
  lastLogin?: string;
  role: string;
  securityGroup: string;

  passwordLastChanged?: string;
  mustChangePassword?: boolean;
  accountLockedUntil?: string;
  failedLoginAttempts?: number;

  permittedIPs?: PermittedIP[];
  requireIPCheck?: boolean;

  groupMemberships?: GroupMembership[];

  timeClockEnabled?: boolean;
  clockInRequired?: boolean;
  recentTimeEntries?: TimeClockEntry[];

  theme?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  defaultView?: string;
  itemsPerPage?: number;
}

interface ViewUserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ViewUserDetailsModal({
  isOpen,
  onClose,
  user,
}: ViewUserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<number>(1);
  console.log("VIEW MODAL USER:", user);


  if (!isOpen || !user) return null;

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
            <p className="text-sm text-[#E2E8F0]">
              {user.firstName} {user.lastName} (@{user.username}) — Read Only
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
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
          {/* {activeTab === 1 && (
            <div className="text-sm text-[#1E293B]">
              {/* (Content unchanged — you already had it correct) */}
              {/* Login Info & Office Access content here */}
            {/* </div> */}
          {/* )} */}
          {activeTab === 1 && (
            <div className="space-y-8">
              {/* Organization Context */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Organization Context
                </h3>

                <div className="bg-[#F0F9FF] border-2 border-[#3B82F6] rounded-lg p-4">
                  <ReadOnlyField
                    label="Practice Group ID (PGID)"
                    value={`${user.pgid} - ${user.pgidName}`}
                  />
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
                  <ReadOnlyField label="Primary Security Group" value={user.securityGroup} />
                  <ReadOnlyField label="User Role / Type" value={user.role} />
                </div>
              </div>

              {/* Office Assignment */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Office Assignment
                </h3>

                <ReadOnlyField
                  label="Home Office"
                  value={`${user.homeOffice} (${user.homeOfficeOID})`}
                />

                <div className="mt-4">
                  <label className="block font-bold text-sm mb-2">
                    Assigned Offices
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {user.assignedOfficeOIDs.map((oid) => (
                      <div
                        key={oid}
                        className="px-3 py-2 bg-[#E8EFF7] border border-[#3A6EA5] rounded text-sm font-bold"
                      >
                        {oid}
                      </div>
                    ))}
                  </div>
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

              {user.permittedIPs?.length ? (
                <table className="w-full border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                  <thead className="bg-[#1F3A5F] text-white">
                    <tr>
                      <th className="px-4 py-2 text-left">IP Address</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.permittedIPs.map((ip) => (
                      <tr key={ip.id} className="border-t">
                        <td className="px-4 py-2">{ip.ipAddress}</td>
                        <td className="px-4 py-2">{ip.description}</td>
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

              {user.groupMemberships?.length ? (
                <div className="border-2 border-[#3A6EA5] rounded-lg p-3 bg-white">
                  {user.groupMemberships.map((group) => (
                    <div
                      key={group.groupName}
                      className="px-3 py-2 bg-[#E8EFF7] border border-[#3A6EA5] rounded mb-2 font-bold"
                    >
                      {group.groupName}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#64748B]">
                  No group memberships
                </div>
              )}
            </div>
          )}




          {/* {activeTab === 4 && <div>Time Clock content</div>} */}
          {activeTab === 4 && (
            <ReadOnlyField
            label="Time Clock"
            value={user.timeClockEnabled ? "Enabled" : "Not Enabled"}
            />
            // <div className="text-sm">
            //   {user.timeClockEnabled ? (
            //     <div className="text-green-700 font-bold">
            //       Time Clock Enabled
            //     </div>
            //   ) : (
            //     <div className="text-gray-500">
            //       Time Clock Not Enabled
            //     </div>
            //   )}
            // </div>
          )}
          {/* <ReadOnlyField
            label="Time Clock"
            value={user.timeClockEnabled ? "Enabled" : "Not Enabled"}
          /> */}




          {/* {activeTab === 5 && <div>User Settings content</div>} */}
          {activeTab === 5 && (
            <ReadOnlyField label="Default View" value={user.defaultView} />
            // <div className="grid grid-cols-2 gap-6 text-sm">
            //   <div>
            //     <label className="text-xs font-bold text-gray-500">
            //       Default View
            //     </label>
            //     <div>{user.defaultView || "—"}</div>
            //   </div>

            //   <div>
            //     <label className="text-xs font-bold text-gray-500">
            //       Theme
            //     </label>
            //     <div>{user.theme || "—"}</div>
            //   </div>

            //   <div>
            //     <label className="text-xs font-bold text-gray-500">
            //       Language
            //     </label>
            //     <div>{user.language || "—"}</div>
            //   </div>
            // </div>
          )}
          {/* <ReadOnlyField label="Default View" value={user.defaultView} /> */}



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

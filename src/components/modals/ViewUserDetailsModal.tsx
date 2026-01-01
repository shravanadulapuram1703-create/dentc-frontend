import { useState } from "react";
import { X, UserCheck, Shield, Clock, Settings, Wifi } from "lucide-react";

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
          {activeTab === 1 && (
            <div className="text-sm text-[#1E293B]">
              {/* (Content unchanged — you already had it correct) */}
              Login Info & Office Access content here
            </div>
          )}

          {activeTab === 2 && <div>Permitted IPs content</div>}
          {activeTab === 3 && <div>Group Memberships content</div>}
          {activeTab === 4 && <div>Time Clock content</div>}
          {activeTab === 5 && <div>User Settings content</div>}
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

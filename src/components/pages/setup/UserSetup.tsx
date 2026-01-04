import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import AddEditUserModal from "../../modals/AddEditUserModal";
import ViewUserDetailsModal from "../../modals/ViewUserDetailsModal";

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

interface User {
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
  // 🔐 Audit fields
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  // Login Info
  passwordLastChanged?: string;
  mustChangePassword?: boolean;
  accountLockedUntil?: string;
  failedLoginAttempts?: number;
  // Permitted IPs
  permittedIPs?: PermittedIP[];
  requireIPCheck?: boolean;
  // Group Memberships
  groupMemberships?: GroupMembership[];
  // Time Clock
  timeClockEnabled?: boolean;
  clockInRequired?: boolean;
  recentTimeEntries?: TimeClockEntry[];
  // User Settings
  theme?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  defaultView?: string;
  itemsPerPage?: number;
}

interface UserSetupProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function UserSetup({
  onLogout,
  currentOffice,
  setCurrentOffice,
}: UserSetupProps) {
  const [searchText, setSearchText] = useState("");
  const [searchScope, setSearchScope] = useState<
    "all" | "home"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "username">(
    "name",
  );
  const [selectedUser, setSelectedUser] = useState<User | null>(
    null,
  );
  const [showAddEditModal, setShowAddEditModal] =
    useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(
    null,
  );
  const [filterPGID, setFilterPGID] = useState<string>("all");
  const [filterOID, setFilterOID] = useState<string>("all");
  const [showViewDetailsModal, setShowViewDetailsModal] =
    useState(false);

  // Available PGIDs and OIDs for filtering
  const availablePGIDs = [
    { id: "P-001", name: "Cranberry Dental Arts Corp" },
    { id: "P-002", name: "Pittsburgh Dental Group" },
  ];

  const availableOIDs = [
    { id: "O-001", name: "Cranberry Main" },
    { id: "O-002", name: "Cranberry North" },
    { id: "O-003", name: "Downtown Pittsburgh" },
  ];

  // Mock user data
  const mockUsers: User[] = [
    {
      id: "U-001",
      firstName: "Sarah",
      lastName: "Johnson",
      username: "sjohnson",
      email: "sjohnson@dentalclinic.com",
      active: true,
      homeOffice: "Cranberry Main",
      homeOfficeOID: "O-001",
      pgid: "P-001",
      pgidName: "Cranberry Dental Arts Corp",
      assignedOfficeOIDs: ["O-001", "O-002"],
      assignedOfficeNames: [
        "Cranberry Main",
        "Cranberry North",
      ],
      lastLogin: "2024-12-30 09:45 AM",
      role: "Office Manager",
      securityGroup: "Administrators",
      // 🔐 Audit fields
      createdBy: "admin@dentalclinic.com",
      createdAt: "2023-01-10 09:15 AM",
      updatedBy: "superadmin@dentalclinic.com",
      updatedAt: "2024-12-15 04:42 PM",
      // Login Info
      passwordLastChanged: "2024-11-15 03:20 PM",
      mustChangePassword: false,
      accountLockedUntil: undefined,
      failedLoginAttempts: 0,
      // Permitted IPs
      requireIPCheck: true,
      permittedIPs: [
        {
          id: "IP-001",
          ipAddress: "192.168.1.100",
          description:
            "Office Manager Workstation - Main Office",
          active: true,
        },
        {
          id: "IP-002",
          ipAddress: "192.168.2.50",
          description:
            "Office Manager Workstation - North Office",
          active: true,
        },
        {
          id: "IP-003",
          ipAddress: "10.0.0.25",
          description: "VPN Access - Home Office",
          active: true,
        },
        {
          id: "IP-004",
          ipAddress: "192.168.1.105",
          description: "Backup Workstation - Main Office",
          active: false,
        },
      ],

      // Group Memberships
      groupMemberships: [
        {
          groupId: "GRP-001",
          groupName: "Administrators",
          description:
            "Full system access with administrative privileges including user management, security settings, and system configuration",
          joinedDate: "2023-01-15",
        },
        {
          groupId: "GRP-005",
          groupName: "Office Managers",
          description:
            "Office management access including scheduling, staff coordination, and operational reports",
          joinedDate: "2023-01-15",
        },
        {
          groupId: "GRP-010",
          groupName: "Billing Administrators",
          description:
            "Full billing and financial access including claim processing, payment posting, and financial reports",
          joinedDate: "2023-03-20",
        },
      ],
      // Time Clock
      timeClockEnabled: true,
      clockInRequired: true,
      recentTimeEntries: [
        {
          date: "2024-12-30",
          clockIn: "08:00 AM",
          clockOut: "05:00 PM",
          totalHours: "9.0",
          notes: "Regular shift",
        },
        {
          date: "2024-12-27",
          clockIn: "08:00 AM",
          clockOut: "05:30 PM",
          totalHours: "9.5",
          notes: "Staff meeting until 5:30 PM",
        },
        {
          date: "2024-12-26",
          clockIn: "08:15 AM",
          clockOut: "05:00 PM",
          totalHours: "8.75",
          notes: "Late arrival - traffic",
        },
        {
          date: "2024-12-23",
          clockIn: "08:00 AM",
          clockOut: "04:00 PM",
          totalHours: "8.0",
          notes: "Holiday week - early closure",
        },
        {
          date: "2024-12-20",
          clockIn: "07:45 AM",
          clockOut: "05:15 PM",
          totalHours: "9.5",
          notes: "Early arrival for inventory",
        },
      ],
      // User Settings
      theme: "Light Mode",
      language: "English (US)",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12-hour",
      emailNotifications: true,
      smsNotifications: false,
      defaultView: "Dashboard",
      itemsPerPage: 50,
    },
    {
      id: "U-002",
      firstName: "Michael",
      lastName: "Chen",
      username: "mchen",
      email: "mchen@dentalclinic.com",
      active: true,
      homeOffice: "Cranberry Main",
      homeOfficeOID: "O-001",
      pgid: "P-001",
      pgidName: "Main Office",
      assignedOfficeOIDs: ["O-001", "O-002"],
      assignedOfficeNames: [
        "Cranberry Main",
        "Cranberry North",
      ],
      lastLogin: "2024-12-30 08:30 AM",
      role: "Dentist",
      securityGroup: "Doctor",
    },
    {
      id: "U-003",
      firstName: "Emily",
      lastName: "Rodriguez",
      username: "erodriguez",
      email: "erodriguez@dentalclinic.com",
      active: true,
      homeOffice: "Cranberry North",
      homeOfficeOID: "O-002",
      pgid: "P-002",
      pgidName: "North Office",
      assignedOfficeOIDs: ["O-002"],
      assignedOfficeNames: ["Cranberry North"],
      lastLogin: "2024-12-29 04:15 PM",
      role: "Front Desk",
      securityGroup: "Clerical",
    },
    {
      id: "U-004",
      firstName: "David",
      lastName: "Williams",
      username: "dwilliams",
      email: "dwilliams@dentalclinic.com",
      active: false,
      homeOffice: "Cranberry Main",
      homeOfficeOID: "O-001",
      pgid: "P-001",
      pgidName: "Main Office",
      assignedOfficeOIDs: ["O-001", "O-002"],
      assignedOfficeNames: [
        "Cranberry Main",
        "Cranberry North",
      ],
      lastLogin: "2024-11-15 03:20 PM",
      role: "Dental Assistant",
      securityGroup: "Assistant",
    },
    {
      id: "U-005",
      firstName: "Jennifer",
      lastName: "Martinez",
      username: "jmartinez",
      email: "jmartinez@dentalclinic.com",
      active: true,
      homeOffice: "Downtown Pittsburgh",
      homeOfficeOID: "O-003",
      pgid: "P-003",
      pgidName: "Pittsburgh Office",
      assignedOfficeOIDs: ["O-003"],
      assignedOfficeNames: ["Downtown Pittsburgh"],
      lastLogin: "2024-12-30 10:00 AM",
      role: "Hygienist",
      securityGroup: "Clinical",
    },
    {
      id: "U-006",
      firstName: "Robert",
      lastName: "Anderson",
      username: "randerson",
      email: "randerson@dentalclinic.com",
      active: true,
      homeOffice: "Cranberry Main",
      homeOfficeOID: "O-001",
      pgid: "P-001",
      pgidName: "Main Office",
      assignedOfficeOIDs: ["O-001", "O-002"],
      assignedOfficeNames: [
        "Cranberry Main",
        "Cranberry North",
      ],
      lastLogin: "2024-12-30 07:50 AM",
      role: "Billing",
      securityGroup: "Billing",
    },
    {
      id: "U-007",
      firstName: "Lisa",
      lastName: "Thompson",
      username: "lthompson",
      email: "lthompson@dentalclinic.com",
      active: false,
      homeOffice: "Cranberry North",
      homeOfficeOID: "O-002",
      pgid: "P-002",
      pgidName: "North Office",
      assignedOfficeOIDs: ["O-002"],
      assignedOfficeNames: ["Cranberry North"],
      lastLogin: "2024-10-20 02:30 PM",
      role: "Front Desk",
      securityGroup: "Clerical",
    },
  ];

  // Filter and sort users
  const filteredUsers = mockUsers
    .filter((user) => {
      // Search scope filter
      if (
        searchScope === "home" &&
        user.homeOffice !== currentOffice
      ) {
        return false;
      }

      // Text search filter
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        return (
          user.firstName.toLowerCase().includes(search) ||
          user.lastName.toLowerCase().includes(search) ||
          user.username.toLowerCase().includes(search)
        );
      }

      // PGID filter
      if (filterPGID !== "all" && user.pgid !== filterPGID) {
        return false;
      }

      // OID filter
      if (
        filterOID !== "all" &&
        !user.assignedOfficeOIDs.includes(filterOID)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        const nameA = `${a.lastName}, ${a.firstName}`;
        const nameB = `${b.lastName}, ${b.firstName}`;
        return nameA.localeCompare(nameB);
      } else {
        return a.username.localeCompare(b.username);
      }
    });

  const handleAddUser = () => {
    setEditingUser(null);
    setShowAddEditModal(true);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    setEditingUser(selectedUser);
    setShowAddEditModal(true);
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;

    // Check if user has historical data (in real system)
    const hasHistoricalData = true; // Mock

    if (hasHistoricalData) {
      alert(
        "Cannot delete user with historical data. Please deactivate the user instead by editing and setting Active = No.",
      );
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete user ${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.username})?`,
      )
    ) {
      // Delete logic here
      alert("User deleted successfully");
      setSelectedUser(null);
    }
  };

  const handleSaveUser = (userData: any) => {
    const now = new Date().toLocaleString();
    const loggedInUserEmail = "admin@dentalclinic.com";

    if (editingUser) {
      userData.updatedBy = loggedInUserEmail;
      userData.updatedAt = now;
    } else {
      userData.createdBy = loggedInUserEmail;
      userData.createdAt = now;
      userData.updatedBy = loggedInUserEmail;
      userData.updatedAt = now;
    }

    console.log("Saving user:", userData);
    setShowAddEditModal(false);
    setEditingUser(null);
    setSelectedUser(null);
  };

  const handleViewDetails = () => {
    if (!selectedUser) return;
    setShowViewDetailsModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Page Content */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - User List */}
          <div className="col-span-4 bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            {/* Search & Filter Header */}
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-3">
              <h2 className="font-bold text-[#1F3A5F] mb-3 text-sm">
                USER LIST
              </h2>

              {/* Search Input */}
              <div className="mb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search by name or username..."
                    value={searchText}
                    onChange={(e) =>
                      setSearchText(e.target.value)
                    }
                    className="w-full pl-10 pr-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                </div>
              </div>

              {/* Search Scope */}
              <div className="mb-2">
                <label className="block text-xs font-bold text-[#1F3A5F] mb-1">
                  Search In:
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="searchScope"
                      value="all"
                      checked={searchScope === "all"}
                      onChange={(e) =>
                        setSearchScope(
                          e.target.value as "all" | "home",
                        )
                      }
                      className="w-3.5 h-3.5 text-[#3A6EA5]"
                    />
                    <span className="text-xs text-[#1E293B]">
                      All Offices
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="searchScope"
                      value="home"
                      checked={searchScope === "home"}
                      onChange={(e) =>
                        setSearchScope(
                          e.target.value as "all" | "home",
                        )
                      }
                      className="w-3.5 h-3.5 text-[#3A6EA5]"
                    />
                    <span className="text-xs text-[#1E293B]">
                      Home Office Only
                    </span>
                  </label>
                </div>
              </div>

              {/* Sort By */}
              <div className="mb-1">
                <label className="block text-[11px] font-semibold text-[#1F3A5F] mb-0.5">
                  Sort By:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "name" | "username",
                    )
                  }
                  className="w-full px-2 py-1 border border-[#E2E8F0] rounded-md
               text-xs text-[#1E293B]
               focus:outline-none focus:border-[#3A6EA5]
               focus:ring-1 focus:ring-[#3A6EA5]/20"
                >
                  <option value="name">
                    Last Name, First Name
                  </option>
                  <option value="username">Username</option>
                </select>
              </div>

              {/* PGID Filter */}
              <div className="mb-2">
                <label className="block text-xs font-bold text-[#1F3A5F] mb-1">
                  Practice Group (PGID):
                </label>
                <select
                  value={filterPGID}
                  onChange={(e) =>
                    setFilterPGID(e.target.value)
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] text-xs"
                >
                  <option value="all">All PGIDs</option>
                  {availablePGIDs.map((pgid) => (
                    <option key={pgid.id} value={pgid.id}>
                      {pgid.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* OID Filter */}
              <div>
                <label className="block text-xs font-bold text-[#1F3A5F] mb-1">
                  Office (OID):
                </label>
                <select
                  value={filterOID}
                  onChange={(e) => setFilterOID(e.target.value)}
                  className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] text-xs"
                >
                  <option value="all">All OIDs</option>
                  {availableOIDs.map((oid) => (
                    <option key={oid.id} value={oid.id}>
                      {oid.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* User List */}
            <div className="overflow-y-auto max-h-[calc(100vh-340px)]">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-[#64748B]">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`px-4 py-3 border-b border-[#E2E8F0] cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? "bg-[#E8EFF7] border-l-4 border-l-[#3A6EA5]"
                        : "hover:bg-[#F1F5F9]"
                    } ${!user.active ? "bg-[#FAFAFA]" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold leading-tight ${
                              user.active
                                ? "text-[#1E293B]"
                                : "text-[#64748B]"
                            }`}
                          >
                            {user.lastName}
                            {", "}
                            {user.firstName}
                          </span>
                          {!user.active && (
                            <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-xs rounded">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#64748B] tracking-wide">
                          ({user.username})
                        </div>
                        <div className="text-xs text-[#475569]">
                          {user.homeOffice}
                        </div>
                        {user.lastLogin && (
                          <div className="text-[11px] text-[#94A3B8] pt-0.5">
                            Last login: {user.lastLogin}
                          </div>
                        )}
                      </div>
                      {user.active ? (
                        <UserCheck className="w-5 h-5 text-[#22C55E]" />
                      ) : (
                        <UserX className="w-5 h-5 text-[#EF4444]" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="border-t-2 border-[#E2E8F0] p-4 bg-[#F7F9FC]">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleAddUser}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-bold">Add</span>
                </button>
                <button
                  onClick={handleEditUser}
                  disabled={!selectedUser}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#2d5080] transition-colors shadow-sm disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    Edit
                  </span>
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={!selectedUser}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] transition-colors shadow-sm disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    Delete
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - User Details */}
          <div className="col-span-8">
            {selectedUser ? (
              <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
                {/* User Header */}
                <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-4 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-1 text-white">
                        {selectedUser.firstName}{" "}
                        {selectedUser.lastName}
                      </h2>
                      <p className="text-sm text-white/90">
                        @{selectedUser.username} •{" "}
                        {selectedUser.email}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                        selectedUser.active
                          ? "bg-[#22C55E] text-white"
                          : "bg-[#EF4444] text-white"
                      }`}
                    >
                      {selectedUser.active
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </div>
                  </div>
                </div>

                {/* User Details */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-bold text-sm text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5">
                        User Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                            USER ID
                          </label>
                          <p className="text-sm text-[#1E293B]">
                            {selectedUser.id}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                            PRACTICE GROUP ID (PGID)
                          </label>
                          <p className="text-sm text-[#1E293B]">
                            {selectedUser.pgid} -{" "}
                            {selectedUser.pgidName}
                          </p>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            Organizational boundary for data
                            access
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                            ROLE
                          </label>
                          <p className="text-sm text-[#1E293B]">
                            {selectedUser.role}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                            SECURITY GROUP
                          </label>
                          <p className="text-sm text-[#1E293B]">
                            {selectedUser.securityGroup}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5">
                        Office Access
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                            HOME OFFICE (OID)
                          </label>
                          <p className="text-sm text-[#1E293B]">
                            {selectedUser.homeOffice}
                          </p>
                          <p className="text-xs text-[#3A6EA5] font-bold">
                            OID: {selectedUser.homeOfficeOID}
                          </p>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            Default login location
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                            ASSIGNED OFFICES
                          </label>
                          <div className="space-y-1">
                            {selectedUser.assignedOfficeOIDs.map(
                              (oid) => (
                                <div
                                  key={oid}
                                  className="px-2 py-1 bg-[#E8EFF7] border border-[#3A6EA5] rounded text-xs"
                                >
                                  <span className="text-[#1E293B] font-bold">
                                    OID: {oid}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">
                            User can access{" "}
                            {
                              selectedUser.assignedOfficeOIDs
                                .length
                            }{" "}
                            office
                            {selectedUser.assignedOfficeOIDs
                              .length !== 1
                              ? "s"
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Access Scope Summary */}
                  <div className="mt-4 pt-4 border-t-2 border-[#E2E8F0]">
                    <h3 className="font-bold text-sm text-[#1F3A5F] mb-2 uppercase tracking-wide">
                      Data Access Scope
                    </h3>
                    <div className="bg-[#F0F9FF] border-2 border-[#3B82F6] rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-7 h-7 bg-[#3B82F6] rounded-full flex items-center justify-center">
                          <UserCheck className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-[#1E293B] mb-1">
                            <span className="font-bold">
                              PGID {selectedUser.pgid}
                            </span>{" "}
                            access allows viewing all data
                            within{" "}
                            <span className="font-bold">
                              {selectedUser.pgidName}
                            </span>
                          </p>
                          <p className="text-xs text-[#1E293B]">
                            Can search patients and schedule
                            appointments at{" "}
                            <span className="font-bold">
                              {
                                selectedUser.assignedOfficeOIDs
                                  .length
                              }{" "}
                              assigned office location
                              {selectedUser.assignedOfficeOIDs
                                .length !== 1
                                ? "s"
                                : ""}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit Information */}
                  <div className="mt-4 pt-4 border-t-2 border-[#E2E8F0]">
                    <h3 className="font-bold text-sm text-[#1F3A5F] mb-2 uppercase tracking-wide">
                      Audit Information
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                          CREATED BY
                        </label>
                        <p className="text-sm text-[#1E293B]">
                          {selectedUser.createdBy || "System"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                          CREATED ON
                        </label>
                        <p className="text-sm text-[#1E293B]">
                          {selectedUser.createdAt || "—"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                          LAST UPDATED BY
                        </label>
                        <p className="text-sm text-[#1E293B]">
                          {selectedUser.updatedBy || "—"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                          LAST UPDATED ON
                        </label>
                        <p className="text-sm text-[#1E293B]">
                          {selectedUser.updatedAt || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 pt-4 border-t-2 border-[#E2E8F0]">
                    <div className="flex gap-3">
                      <button
                        onClick={handleEditUser}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#2d5080] transition-colors shadow-sm font-bold text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        EDIT USER DETAILS
                      </button>
                      <button
                        onClick={handleViewDetails}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#64748B] text-white rounded-lg hover:bg-[#475569] transition-colors shadow-sm font-bold text-sm"
                      >
                        <UserCheck className="w-4 h-4" />
                        VIEW USER DETAILS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm p-12 text-center">
                <UserCheck className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" />
                <p className="text-[#64748B] text-lg">
                  Select a user from the list to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showAddEditModal && (
        <AddEditUserModal
          isOpen={showAddEditModal}
          onClose={() => {
            setShowAddEditModal(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
          editingUser={editingUser}
          currentOffice={currentOffice}
        />
      )}

      {/* View User Details Modal */}
      {showViewDetailsModal && (
        <ViewUserDetailsModal
          isOpen={showViewDetailsModal}
          onClose={() => setShowViewDetailsModal(false)}
          user={selectedUser}
        />
      )}
    </div>
  );
}
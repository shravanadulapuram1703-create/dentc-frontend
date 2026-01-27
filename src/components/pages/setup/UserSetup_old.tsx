import { useEffect, useState } from "react";
import { Search, Plus, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import api from "../../../services/api";
import AddEditUserModal from "../../modals/AddEditUserModal";
import ViewUserDetailsModal from "../../modals/ViewUserDetailsModal";

/* ===============================
   BACKEND RESPONSE TYPE
   =============================== */

interface ApiUser {
  id: number;
  tenant_id: number;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  security_group: string | null;
  is_active: boolean;
  is_platform_user: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  created_by: number | null;
  pgid: number | null;
  pgid_name: string | null;
  home_office_id: number | null;
  home_office_name: string | null;
  assigned_office_ids: number[];
  assigned_office_names: string[];
  patient_access_level: string | null;
  allowed_days: string[] | null;
  allowed_from: string | null;
  allowed_until: string | null;
}

/* ===============================
   EXISTING UI MODEL (UNCHANGED)
   =============================== */

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
}

interface UserSetupProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

/* ===============================
   API → UI MAPPER
   =============================== */

const mapApiUserToUiUser = (u: ApiUser): User => ({
  id: String(u.id),
  firstName: u.first_name ?? "—",
  lastName: u.last_name ?? "—",
  username: u.username,
  email: u.email,
  active: u.is_active,
  role: u.role,
  securityGroup: u.security_group ?? "—",
  pgid: u.pgid ? String(u.pgid) : "—",
  pgidName: u.pgid_name ?? "—",
  homeOffice: u.home_office_name ?? "Not Assigned",
  homeOfficeOID: u.home_office_id ? String(u.home_office_id) : "—",
  assignedOfficeOIDs: u.assigned_office_ids.map(String),
  assignedOfficeNames: u.assigned_office_names,
  lastLogin: u.last_login_at
    ? new Date(u.last_login_at).toLocaleString()
    : undefined,
});

/* ===============================
   COMPONENT
   =============================== */

export default function UserSetup({
  onLogout,
  currentOffice,
  setCurrentOffice,
}: UserSetupProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "home">("all");
  const [sortBy, setSortBy] = useState<"name" | "username">("name");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);

  /* ===============================
     FETCH USERS FROM API
     =============================== */

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get<ApiUser[]>(
          "/api/v1/auth/list-with-home-office"
        );
        setUsers(res.data.map(mapApiUserToUiUser));
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  /* ===============================
     FILTER & SORT (UNCHANGED)
     =============================== */

  const filteredUsers = users
    .filter((user) => {
      if (searchScope === "home" && user.homeOffice !== currentOffice) {
        return false;
      }

      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        return (
          user.firstName.toLowerCase().includes(search) ||
          user.lastName.toLowerCase().includes(search) ||
          user.username.toLowerCase().includes(search)
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return `${a.lastName}, ${a.firstName}`.localeCompare(
          `${b.lastName}, ${b.firstName}`
        );
      }
      return a.username.localeCompare(b.username);
    });

  /* ===============================
     HANDLERS (UNCHANGED)
     =============================== */

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
    alert("Delete API not wired yet");
  };

  const handleSaveUser = () => {
    setShowAddEditModal(false);
    setEditingUser(null);
    setSelectedUser(null);
  };

  const handleViewDetails = () => {
    if (!selectedUser) return;
    setShowViewDetailsModal(true);
  };

  /* ===============================
     RENDER
     =============================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#64748B]">
        Loading users…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT PANEL – USER LIST */}
          <div className="col-span-4 bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-3">
              <h2 className="font-bold text-[#1F3A5F] mb-3 text-sm">
                USER LIST
              </h2>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by name or username..."
                  className="w-full pl-10 pr-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-[#64748B]">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-4 border-b cursor-pointer ${
                      selectedUser?.id === user.id
                        ? "bg-[#E8EFF7] border-l-4 border-l-[#3A6EA5]"
                        : "hover:bg-[#F7F9FC]"
                    }`}
                  >
                    <div className="font-bold">
                      {user.lastName}, {user.firstName}
                    </div>
                    <div className="text-sm text-[#64748B]">
                      ({user.username})
                    </div>
                    <div className="text-xs text-[#64748B]">
                      {user.homeOffice}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANEL – DETAILS (UNCHANGED JSX BELOW) */}
          {/* ⬆️ Your existing right panel JSX remains exactly the same */}
        </div>
      </div>

      {showAddEditModal && (
        <AddEditUserModal
          isOpen
          onClose={() => setShowAddEditModal(false)}
          onSave={handleSaveUser}
          editingUser={editingUser as any}
          currentOffice={currentOffice}
        />
      )}

      {showViewDetailsModal && selectedUser && (
        <ViewUserDetailsModal
          isOpen
          onClose={() => setShowViewDetailsModal(false)}
          userId={selectedUser?.id || null}
        />
      )}
    </div>
  );
}

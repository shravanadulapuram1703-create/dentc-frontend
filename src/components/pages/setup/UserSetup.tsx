import { useEffect, useState } from "react";
import { Search, Plus, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import AddEditUserModal from "../../modals/AddEditUserModal";
import ViewUserDetailsModal from "../../modals/ViewUserDetailsModal";
import api from "../../../services/api";
import { mapApiUserToUI } from "../../../mappers/userMapper";
import { mapApiTenantToUI, mapApiOfficeToUI } from "../../../mappers/tenantMapper";
import { mapSetupApiToUserUI } from "../../../mappers/mapSetupApiToUserUI";
import { useMemo } from "react";
// import type { BackendUser } from "../../modals/AddEditUserModal";
import type { BackendUser } from "../../../types/backendUser";

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

// interface User {
//   id: string;
//   firstName: string;
//   lastName: string;
//   username: string;
//   email: string;
//   active: boolean;
//   homeOffice: string;
//   homeOfficeOID: string;
//   pgid: string;
//   pgidName: string;
//   assignedOfficeOIDs: string[];
//   assignedOfficeNames: string[];
//   lastLogin?: string;
//   role: string;
//   updatedBy:string;
//   securityGroup: string;
//   // Login Info
//   passwordLastChanged?: string;
//   mustChangePassword?: boolean;
//   accountLockedUntil?: string;
//   failedLoginAttempts?: number;
//   // Permitted IPs
//   permittedIPs?: PermittedIP[];
//   requireIPCheck?: boolean;
//   // Group Memberships
//   groupMemberships?: GroupMembership[];
//   // Time Clock
//   timeClockEnabled?: boolean;
//   clockInRequired?: boolean;
//   recentTimeEntries?: TimeClockEntry[];
//   // User Settings
//   // theme?: string;
//   // language?: string;
//   // dateFormat?: string;
//   // timeFormat?: string;
//   // emailNotifications?: boolean;
//   // smsNotifications?: boolean;
//   // defaultView?: string;
//   // itemsPerPage?: number;
//   startupScreen: string;
//   perioTemplate: string | null;
//   defaultNavigationSearch: boolean;
//   defaultSearchBy: string;
//   productionView: string;
//   hideProviderTime: boolean;
//   defaultView: string;
//   showProductionColors: boolean;
//   printLabels: boolean;
//   promptEntryDate: boolean;
//   includeInactivePatients: boolean;
//   referralView: string | null;
//   userRoleType: string | null;

//   }

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

  role: string;
  securityGroup: string;

  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;

  permittedIPs?: PermittedIP[];
  groupMemberships?: GroupMembership[];
}


interface UserSetupProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface Tenant {
  id: number;
  name: string;
  code: string;

  status: string;
  isActive: boolean;
  isLocked: boolean;

  createdAt: string;
  updatedAt: string;

  createdBy?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface Office {
  id: number;

  officeCode: string;
  officeName: string;

  phone1?: string;
  phone2?: string;
  fax?: string;
  email?: string;

  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;

  tenantId: number;
  timezone?: string;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export default function UserSetup({
  onLogout,
  currentOffice,
  setCurrentOffice,
}: UserSetupProps) {
  const [searchText, setSearchText] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "home">("all");
  const [sortBy, setSortBy] = useState<"name" | "username">("name");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  // const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [filterPGID, setFilterPGID] = useState<string>("all");
  const [filterOID, setFilterOID] = useState<string>("all");
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  // const fetchFullUserDetails = async (user: User) => {
  //   try {
  //     setLoadingUserDetails(true);

  //     const id = normalizeUID(user.id); // or replace("U-", "")
  //     const pgid = normalizePGID(user.pgid);

  //     const [
  //       userRes,
  //       ipRes,
  //       groupRes,
  //     ] = await Promise.all([
  //       api.get(`/api/v1/users/${id}`),          // full user
  //       api.get(`/api/v1/users/${pgid}/${id}/ip-rules`),
  //       api.get(`/api/v1/users/${id}/groups`),
  //     ]);

  //     const fullUser: User = {
  //       ...mapApiUserToUI(userRes.data),
  //       permittedIPs: ipRes.data,
  //       groupMemberships: groupRes.data,
  //     };

  //     setSelectedUser(fullUser);
  //     return fullUser;
  //   } catch (err) {
  //     console.error("Failed to load user details", err);
  //     return null;
  //   } finally {
  //     setLoadingUserDetails(false);
  //   }
  // };



  // // Available PGIDs and OIDs for filtering
  // const availablePGIDs = [
  //   { id: "P-001", name: "Cranberry Dental Arts Corp" },
  //   { id: "P-002", name: "Pittsburgh Dental Group" },
  // ];
  // const [availablePGIDs, setAvailablePGIDs] = useState([]);

  // useEffect(() => {
  //   api.get("/pgids").then(res => {
  //     setAvailablePGIDs(
  //       res.data.map((p: any) => ({
  //         id: `P-${p.id}`,
  //         name: p.name,
  //       }))
  //     );
  //   });
  // }, []);

  // const fetchFullUserDetails = async (user: User) => {
  //   try {
  //     setLoadingUserDetails(true);

  //     const id = normalizeUID(user.id);     // e.g. "U-61" → 61
  //     const pgid = normalizePGID(user.pgid); // e.g. "ORG-1" → 1

  //     // ✅ Single aggregation API
  //     const res = await api.get(
  //       `/api/v1/users/setup`
  //     );

  //     const data = res.data;

  //     console.log("SETUP API RAW:", data);
      


  //     // const fullUser: User = {
  //     //   ...mapApiUserToUI(data.user),

  //     //   // 👇 coming from setup API
  //     //   // offices: data.offices,
  //     //   permittedIPs: data.ip_rules,
  //     //   groupMemberships: data.groups,
  //     //   // timeClock: data.time_clock,
  //     //   // preferences: data.preferences,
  //     //   // // map to existing fields
  //     //   // permittedIPs: data.ip_rules ?? [],
  //     //   // groupMemberships: data.groups ?? [],
        
  //     // };



  //     const fullUser = mapSetupApiToUserUI(
  //       data,
  //       officeNameById // pass your memoized map
  //     );

  //     setSelectedUser(fullUser);
  //     return fullUser;

      
      
  //     console.log("FULL USER UI:", fullUser);

  //     setSelectedUser(fullUser);
  //     return fullUser;
  //   } catch (err) {
  //     console.error("Failed to load user details", err);
  //     return null;
  //   } finally {
  //     setLoadingUserDetails(false);
  //   }
  // };

  // const fetchFullUserDetails = async (user: User) => {
  //   try {
  //     setLoadingUserDetails(true);

  //     const id = normalizeUID(user.id);

  //     const res = await api.get(`/api/v1/users/setup`);

  //     const backendUser: BackendUser = res.data.user;

  //     return backendUser; // 👈 backend-shaped
  //   } catch (err) {
  //     console.error("Failed to load user details", err);
  //     return null;
  //   } finally {
  //     setLoadingUserDetails(false);
  //   }
  // };


  const fetchFullUserDetails = async (user: User) => {
    try {
      setLoadingUserDetails(true);

      const id = normalizeUID(user.id);

      // 1️⃣ fetch user
      const userRes = await api.get<BackendUser>(
        '/api/v1/users/setup'
      );

      return userRes.data; //  backend user ONLY
    } catch (err) {
      console.error("Failed to load user details", err);
      return null;
    } finally {
      setLoadingUserDetails(false);
    }
  };


  
  const [availablePGIDs, setAvailablePGIDs] = useState<Tenant[]>([]);

  useEffect(() => {
    api.get("/api/v1/users/all-tenants")
      .then((res) => {
        setAvailablePGIDs(res.data.map(mapApiTenantToUI));
      })
      .catch(() => {
        console.error("Failed to load tenants");
      });
  }, []);



  const [availableOIDs, setAvailableOIDs] = useState<Office[]>([]);

  useEffect(() => {
    api.get("/api/v1/users/all-offices")
      .then((res) => {
        setAvailableOIDs(res.data.map(mapApiOfficeToUI));
      })
      .catch(() => {
        console.error("Failed to load offices");
      });
  }, []);

  useEffect(() => {
    if (searchScope === "home") {
      setFilterPGID("all");
      setFilterOID("all");
    }
  }, [searchScope]);

  const normalizeOID = (v: string | number) =>
    String(v).replace(/^O-/, "");
  const normalizeUID = (v: string | number) =>
    String(v).replace(/^U-/, "");

  const normalizePGID = (v: string | number) =>
    String(v).replace(/^P-/, "");

  console.log({currentOffice,OID: availableOIDs});

  const filteredOIDs = useMemo(() => {
    // Home Office only → show only home office
    if (searchScope === "home") {
      return availableOIDs.filter(
        (o) => normalizeOID(o.id) === normalizeOID(currentOffice)
      );
    }

    

    // All PGIDs → all offices
    if (filterPGID === "all") {
      return availableOIDs;
    }

    // Specific PGID → only offices of that PGID
    return availableOIDs.filter(
      (o) => String(o.tenantId) === filterPGID
    );
  }, [availableOIDs, filterPGID, searchScope, currentOffice]);




  

  // const loadOffices = async (pgid: string) => {
  //   const id = pgid.replace("P-", "");
  //   const res = await api.get(`/offices?pgid=${id}`);

  //   setAvailableOIDs(
  //     res.data.map((o: any) => ({
  //       id: `O-${o.id}`,
  //       name: o.office_name,
  //     }))
  //   );
  // };

  const loadUserDetails = async (userId: string) => {
    const id = userId.replace("U-", "");

    const [ips, groups] = await Promise.all([
      api.get(`/api/v1/users/${id}/ip-rules`),
      api.get(`/api/v1/users/${id}/groups`)
    ]);

    setSelectedUser(prev => ({
      ...prev!,
      permittedIPs: ips.data,
      groupMemberships: groups.data,
    }));
  };

  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/users/list-with-home-office");
      setUsers(res.data.map(mapApiUserToUI));
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };


  console.log({currentOffice,userHomeOID: users[1]?.homeOffice,});

  // const filteredUsers = useMemo(() => {
  //   console.log("---- FILTERING USERS ----");
  //   console.log("Active PGID:", filterPGID);
  //   console.log("Active OID:", filterOID);

  //   return users
  //     .filter((user) => {
  //       // 1 Home Office only
  //       if (searchScope === "home") {
  //         console.log("check condition",user.homeOffice, currentOffice)
  //         console.log("check condition",user.homeOffice === currentOffice)
  //         return user.homeOffice === currentOffice;
  //       //    return (
  //       //       normalizeOID(user.homeOfficeOID) ===
  //       //       normalizeOID(currentOffice)
  //       //     );
  //       }
  //       // return (user.homeOfficeOID === currentOffice);

  //       // 2 PGID filter
  //       if (filterPGID !== "all" && user.pgid !== filterPGID) {
  //         return false;
  //       }

  //       // 3 OID filter
  //       // if (
  //       //   filterOID !== "all" &&
  //       //   !user.assignedOfficeOIDs.includes(filterOID)
  //       // ) {
  //       //   return false;
  //       // }
  //       if (
  //         filterOID !== "all" &&
  //         !user.assignedOfficeOIDs
  //           .map(normalizeOID)
  //           .includes(normalizeOID(filterOID))
  //       ) {
  //         return false;
  //       }

  //       // 4️⃣ Text search
  //       if (searchText.trim()) {
  //         const s = searchText.toLowerCase();
  //         return (
  //           user.firstName?.toLowerCase().includes(s) ||
  //           user.lastName?.toLowerCase().includes(s) ||
  //           user.username?.toLowerCase().includes(s)
  //         );
  //       }

  //       return true;
  //     })
  //     .sort((a, b) => {
  //       if (sortBy === "name") {
  //         return `${a.lastName}, ${a.firstName}`.localeCompare(
  //           `${b.lastName}, ${b.firstName}`
  //         );
  //       }
  //       return a.username.localeCompare(b.username);
  //     });
  // }, [
  //   users,
  //   searchScope,
  //   filterPGID,
  //   filterOID,
  //   searchText,
  //   sortBy,
  //   currentOffice,
  // ]);

  
  const filteredUsers = useMemo(() => {
    console.log("---- FILTERING USERS ----");
    console.log("Scope:", searchScope);
    console.log("PGID:", filterPGID);
    console.log("OID (office name):", filterOID);
    console.log("Current Office:", currentOffice);

    return users
      .filter((user) => {
        /* ----------------------------------
        1️⃣ Home Office scope
        ---------------------------------- */
        if (searchScope === "home") {
          const match = user.homeOffice === currentOffice;

          console.log("HOME CHECK:", {
            user: user.username,
            userHomeOffice: user.homeOffice,
            currentOffice,
            match,
          });

          return match;
        }

        console.log("PGID CHECK:", {
            user_pgid:String(normalizePGID(user.pgid)),
            filterPGID: String(filterPGID),
          });

        /* ----------------------------------
        2️⃣ PGID filter
        ---------------------------------- */
        if (
          filterPGID !== "all" &&
          String(normalizePGID(user.pgid)) !== String(filterPGID)
        ) {
          return false;
        }

        // console.log("office CHECK:", {
        //     user_offices:String(user.assignedOfficeOIDs ?? normalizeOID([])),
        //     filterOID: String(filterOID),
        //   });

        /* ----------------------------------
        3️⃣ Office (OID) filter — NAME based
        ---------------------------------- */
        if (filterOID !== "all") {
          const normalizedAssignedOIDs = (user.assignedOfficeOIDs ?? []).map(
            normalizeOID
          );

          const normalizedFilterOID = normalizeOID(filterOID);

          const match = normalizedAssignedOIDs.includes(normalizedFilterOID);

          console.log("OID MATCH RESULT:", {
            user: user.username,
            normalizedAssignedOIDs,
            normalizedFilterOID,
            match,
          });

          if (!match) return false;
        }

        /* ----------------------------------
        4️⃣ Text search
        ---------------------------------- */
        if (searchText.trim()) {
          const s = searchText.toLowerCase();
          return (
            user.firstName?.toLowerCase().includes(s) ||
            user.lastName?.toLowerCase().includes(s) ||
            user.username?.toLowerCase().includes(s)
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
  }, [
    users,
    searchScope,
    filterPGID,
    filterOID,
    searchText,
    sortBy,
    currentOffice,
  ]);

  
  console.log("filteredUsers----> ",filteredUsers)



  // Filter and sort users
  // const filteredUsers = mockUsers
  // const filteredUsers = users
  //   .filter((user) => {
  //     if (searchScope === "home" && user.homeOffice !== currentOffice) {
  //       return false;
  //     }

  //     if (searchText.trim()) {
  //       const search = searchText.toLowerCase();
  //       return (
  //         user.firstName?.toLowerCase().includes(search) ||
  //         user.lastName?.toLowerCase().includes(search) ||
  //         user.username?.toLowerCase().includes(search)
  //       );
  //     }

  //     if (filterPGID !== "all" && user.pgid !== filterPGID) {
  //       return false;
  //     }

  //     if (
  //       filterOID !== "all" &&
  //       !user.assignedOfficeOIDs?.includes(filterOID)
  //     ) {
  //       return false;
  //     }

  //     return true;
  //   })
  //   .sort((a, b) => {
  //     if (sortBy === "name") {
  //       return `${a.lastName}, ${a.firstName}`.localeCompare(
  //         `${b.lastName}, ${b.firstName}`
  //       );
  //     }
  //     return a.username.localeCompare(b.username);
  //   });


  const handleAddUser = () => {
    setEditingUser(null);
    setShowAddEditModal(true);
  };

  // const handleEditUser = () => {
  //   if (!selectedUser) return;
  //   setEditingUser(selectedUser);
  //   setShowAddEditModal(true);
  // };

  // const handleEditUser = async () => {
  //   if (!selectedUser) return;

  //   const fullUser = await fetchFullUserDetails(selectedUser);
  //   if (!fullUser) return;

  //   setEditingUser(fullUser);
  //   setShowAddEditModal(true);
  // };
  const handleEditUser = async () => {
    if (!selectedUser) return;

    const backendUser = await fetchFullUserDetails(selectedUser);
    if (!backendUser) return;

    setEditingUser(backendUser);   // BackendUser
    setShowAddEditModal(true);     //  modal opens
  };



  const handleDeleteUser = () => {
    if (!selectedUser) return;
    
    // Check if user has historical data (in real system)
    const hasHistoricalData = true; // Mock

    if (hasHistoricalData) {
      alert(
        "Cannot delete user with historical data. Please deactivate the user instead by editing and setting Active = No."
      );
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete user ${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.username})?`
      )
    ) {
      // Delete logic here
      alert("User deleted successfully");
      setSelectedUser(null);
    }
  };

  // const handleSaveUser = (userData: any) => {
  //   console.log("Saving user:", userData);
  //   setShowAddEditModal(false);
  //   setEditingUser(null);
  //   setSelectedUser(null);
  // };

  const handleSaveUser = async (payload: any) => {
    try {
      if (editingUser) {
        await api.put(
          `/api/v1/users/${editingUser.user_id}`,
          payload
        );
      } else {
        await api.post("/api/v1/users", payload);
      }

      await fetchUsers(); // refresh list
    } finally {
      setShowAddEditModal(false);
      setEditingUser(null);
      setSelectedUser(null);
    }
  };


  // const handleViewDetails = () => {
  //   if (!selectedUser) return;
  //   setShowViewDetailsModal(true);
  // };
  // const handleViewDetails = async () => {
  //   if (!selectedUser) return;

  //   const fullUser = await fetchFullUserDetails(selectedUser);
  //   if (!fullUser) return;

  //   setShowViewDetailsModal(true);
  // };

  const handleViewDetails = async () => {
    if (!selectedUser) return;

    const fullUser = await fetchFullUserDetails(selectedUser);
    if (!fullUser) return;

    setViewUser(fullUser);        // ✅ explicitly set modal user
    setShowViewDetailsModal(true);
  };


  const officeNameById = useMemo(() => {
    const map = new Map<string, string>();
    availableOIDs.forEach(o =>
      map.set(normalizeOID(o.id), o.officeName)
    );
    return map;
  }, [availableOIDs]);


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
                    onChange={(e) => setSearchText(e.target.value)}
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
                        setSearchScope(e.target.value as "all" | "home")
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
                        setSearchScope(e.target.value as "all" | "home")
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
              <div className="mb-2">
                <label className="block text-xs font-bold text-[#1F3A5F] mb-1">
                  Sort By:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "name" | "username")
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] text-xs"
                >
                  <option value="name">Last Name, First Name</option>
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
                  // onChange={(e) => setFilterPGID(e.target.value)}
                  disabled={searchScope === "home"}
                  onChange={(e) => {
                    setFilterPGID(e.target.value);
                    setFilterOID("all"); // reset OID
                  }}
                  

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
                  // onChange={(e) => setFilterOID(e.target.value)}
                  disabled={searchScope === "home"}
                  onChange={(e) => setFilterOID(e.target.value)}
                  className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] text-xs"
                >
                  <option value="all">All OIDs</option>
                  {/* {availableOIDs.map((oid) => ( */}
                  {filteredOIDs.map((oid) => (
                    // <option key={oid.id} value={oid.id}>
                    //   {/* {oid.name} */}
                    //   {oid.officeName}
                    // </option>
                    <option
                      key={oid.id}
                      value={normalizeOID(oid.id)}
                    >
                      {oid.officeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* User List */}
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
                    className={`p-4 border-b border-[#E2E8F0] cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? "bg-[#E8EFF7] border-l-4 border-l-[#3A6EA5]"
                        : "hover:bg-[#F7F9FC]"
                    } ${!user.active ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`font-bold ${
                              user.active
                                ? "text-[#1E293B]"
                                : "text-[#64748B]"
                            }`}
                          >
                            {user.lastName}{", "}{user.firstName}
                          </span>
                          {!user.active && (
                            <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-xs rounded">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#64748B] mb-1">
                          ({user.username})
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {user.homeOffice}
                        </div>
                        {user.lastLogin && (
                          <div className="text-xs text-[#64748B] mt-1">
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
                  disabled={!selectedUser || loadingUserDetails}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#2d5080] transition-colors shadow-sm disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm font-bold">Edit</span>
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={!selectedUser}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] transition-colors shadow-sm disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-bold">Delete</span>
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
                      <h2 className="text-xl font-bold mb-1 text-[#E2E8F0]">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h2>
                      <p className="text-sm text-[#E2E8F0]">
                        @{selectedUser.username} • {selectedUser.email}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                        selectedUser.active
                          ? "bg-[#22C55E] text-white"
                          : "bg-[#EF4444] text-white"
                      }`}
                    >
                      {selectedUser.active ? "ACTIVE" : "INACTIVE"}
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
                            {selectedUser.pgid} - {selectedUser.pgidName}
                          </p>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            Organizational boundary for data access
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
                          <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                            {/* {selectedUser.assignedOfficeOIDs.map((oid, index) => {
                              const officeName = selectedUser.assignedOfficeNames?.[index] ?? "Unknown Office";
                              return (
                              <div
                                key={oid}
                                className="px-2 py-1 bg-[#E8EFF7] border border-[#3A6EA5] rounded text-xs"
                              >
                                <div className="text-[#1E293B] font-bold">
                                  {oid} - {officeName}
                                </div>
                              </div>
                              );
                            })} */}
                            {selectedUser.assignedOfficeOIDs.map((oid) => (
                              <div key={oid} className="px-2 py-1 bg-[#E8EFF7] border rounded text-xs">
                                <div className="font-bold">
                                  {oid} - {officeNameById.get(normalizeOID(oid)) ?? "Unknown Office"}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">
                            User can access {selectedUser.assignedOfficeOIDs.length} office
                            {selectedUser.assignedOfficeOIDs.length !== 1 ? "s" : ""}
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
                            <span className="font-bold">PGID {selectedUser.pgid}</span> access allows viewing all data within{" "}
                            <span className="font-bold">{selectedUser.pgidName}</span>
                          </p>
                          <p className="text-xs text-[#1E293B]">
                            Can search patients and schedule appointments at{" "}
                            <span className="font-bold">
                              {selectedUser.assignedOfficeOIDs.length} assigned office location
                              {selectedUser.assignedOfficeOIDs.length !== 1 ? "s" : ""}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Login Activity */}
                  {/* <div className="mt-4 pt-4 border-t-2 border-[#E2E8F0]">
                    <h3 className="font-bold text-sm text-[#1F3A5F] mb-2 uppercase tracking-wide">
                      Login Activity
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                          LAST LOGIN
                        </label>
                        <p className="text-sm text-[#1E293B]">
                          {selectedUser.lastLogin || "Never"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#64748B] mb-0.5">
                          STATUS
                        </label>
                        <p
                          className={
                            selectedUser.active
                              ? "text-sm text-[#22C55E] font-bold"
                              : "text-sm text-[#EF4444] font-bold"
                          }
                        >
                          {selectedUser.active
                            ? "Active - Can log in"
                            : "Inactive - Cannot log in"}
                        </p>
                      </div>
                    </div>
                  </div> */}
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
                        disabled={!selectedUser || loadingUserDetails}
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
          onClose={() => {
            setShowViewDetailsModal(false);
            setViewUser(null);
          }}
          user={viewUser}
        />

      )}
    </div>
  );
}
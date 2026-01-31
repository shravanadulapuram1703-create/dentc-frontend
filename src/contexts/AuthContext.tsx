import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "../services/api";

/* -------------------- TYPES -------------------- */

interface Office {
  id: string;
  name: string;
  code: string;
  address: string;
  displayName: string;
  is_current: boolean;
}

interface Organization {
  id: string;
  name: string;
  code: string;
  offices: Office[];
  is_current: boolean;
}

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "doctor"
  | "provider"
  | "front_desk"
  | "staff";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
  isActive?: boolean;
  isOrgOwner?: boolean;
  organizationId?: string;
}

interface ActivePatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoggingOut: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;

  organizations: Organization[];

  currentOrganization: string;
  setCurrentOrganization: (orgId: string) => void;

  currentOffice: string;
  setCurrentOffice: (officeId: string) => void;

  activePatient: ActivePatient | null;
  setActivePatient: (patient: ActivePatient | null) => void;

  markFirstLoginComplete: () => void;
}

/* -------------------- CONTEXT -------------------- */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* -------------------- PROVIDER -------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  /* ---------- STATE (RESTORED FROM STORAGE) ---------- */

  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("access_token") !== null
  );

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("me_full");
    return stored ? JSON.parse(stored) : null;
  });

  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const stored = localStorage.getItem("access_ctx");
    return stored ? JSON.parse(stored) : [];
  });

  const [currentOrganization, setCurrentOrganization] = useState(
    localStorage.getItem("current_org") ?? ""
  );

  const [currentOffice, setCurrentOffice] = useState(
    localStorage.getItem("current_office") ?? ""
  );

  const [activePatient, setActivePatient] = useState<ActivePatient | null>(
    null
  );

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /* ---------- PERSIST SELECTIONS ---------- */

  useEffect(() => {
    localStorage.setItem("current_org", currentOrganization);
  }, [currentOrganization]);

  useEffect(() => {
    localStorage.setItem("current_office", currentOffice);
  }, [currentOffice]);

  /* ---------- RESTORE SESSION ON REFRESH ---------- */

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // If already restored from storage → skip API calls
    if (user && organizations.length > 0) {
      setIsAuthenticated(true);
      return;
    }

    (async () => {
      try {
        const [meRes, accessRes] = await Promise.all([
          api.get("/api/v1/auth/me-full"),
          api.get("/api/v1/users/me/access"),
        ]);

        const me = meRes.data;
        const orgs: Organization[] = accessRes.data ?? [];

        const restoredUser: User = {
          id: String(me.user_id),
          email: me.email,
          name: `${me.first_name} ${me.last_name}`.trim(),
          role: me.roles?.[0] ?? "staff",
          isFirstLogin: false,
          isActive: true,
          isOrgOwner: me.is_super_admin ?? false,
          organizationId: String(me.current_organization_id ?? ""),
        };

        setUser(restoredUser);
        setOrganizations(orgs);

        localStorage.setItem("me_full", JSON.stringify(restoredUser));
        localStorage.setItem("access_ctx", JSON.stringify(orgs));

        const activeOrg =
          orgs.find((o) => o.is_current) ?? orgs[0];

        if (activeOrg) {
          setCurrentOrganization(activeOrg.id);

          const office =
            activeOrg.offices?.find((o) => o.is_current) ??
            activeOrg.offices?.[0];

          setCurrentOffice(office?.id ?? "");
        }

        setIsAuthenticated(true);
      } catch {
        localStorage.clear();
        setIsAuthenticated(false);
        setUser(null);
      }
    })();
  }, []);

  /* ---------- LOGIN ---------- */

  const login = async (email: string, password: string) => {
    try {
      const loginRes = await api.post("/api/v1/auth/login", {
        identifier: email,
        password,
      });

      const token = loginRes.data.access_token;

      localStorage.setItem("access_token", token);
      localStorage.setItem("refresh_token", loginRes.data.refresh_token);

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const [meRes, accessRes] = await Promise.all([
        api.get("/api/v1/auth/me-full"),
        api.get("/api/v1/users/me/access"),
      ]);

      const me = meRes.data;
      const orgs: Organization[] = accessRes.data ?? [];

      const newUser: User = {
        id: String(me.user_id),
        email: me.email,
        name: `${me.first_name} ${me.last_name}`.trim(),
        role: me.roles?.[0] ?? "staff",
        isFirstLogin: false,
        isActive: true,
        isOrgOwner: me.is_super_admin ?? false,
        organizationId: String(me.current_organization_id ?? ""),
      };

      setUser(newUser);
      setOrganizations(orgs);

      localStorage.setItem("me_full", JSON.stringify(newUser));
      localStorage.setItem("access_ctx", JSON.stringify(orgs));

      const activeOrg =
        orgs.find((o) => o.is_current) ?? orgs[0];

      if (activeOrg) {
        setCurrentOrganization(activeOrg.id);

        const office =
          activeOrg.offices?.find((o) => o.is_current) ??
          activeOrg.offices?.[0];

        setCurrentOffice(office?.id ?? "");
      }

      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error("Login failed", err);
      return false;
    }
  };

  /* ---------- LOGOUT ---------- */

  const logout = async () => {
    // Set loading state immediately - this triggers the overlay to show
    setIsLoggingOut(true);
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        await api.post("/api/v1/auth/logout", { refresh_token: refresh });
      }
    } catch (err) {
      console.error("Logout API error:", err);
      // Continue with logout even if API fails
    } finally {
      localStorage.clear();
      delete api.defaults.headers.common["Authorization"];

      setIsAuthenticated(false);
      setUser(null);
      setOrganizations([]);
      setCurrentOrganization("");
      setCurrentOffice("");
      setActivePatient(null);
      setIsLoggingOut(false);
    }
  };

  const markFirstLoginComplete = () => {
    if (user?.isFirstLogin) {
      const updated = { ...user, isFirstLogin: false };
      setUser(updated);
      localStorage.setItem("me_full", JSON.stringify(updated));
    }
  };

  /* ---------- LISTEN FOR 401 UNAUTHORIZED EVENTS ---------- */
  
  useEffect(() => {
    const handleUnauthorized = async (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const message = customEvent.detail?.message || "Your session has expired. Please log in again.";
      
      // Show alert to user
      alert(message);
      
      // Call logout to clean up state
      await logout();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoggingOut,
        login,
        logout,
        organizations,
        currentOrganization,
        setCurrentOrganization,
        currentOffice,
        setCurrentOffice,
        activePatient,
        setActivePatient,
        markFirstLoginComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* -------------------- HOOK -------------------- */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

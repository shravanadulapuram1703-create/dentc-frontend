import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { toast } from "sonner";
import api from "../services/api";
import { getMeFull, login as login_ } from "@/api/generated/endpoints/auth/auth";
import type { MeFull } from "@/api/generated/model";
import { mapAuthError, type AuthError } from "@/features/auth/utils/authErrors";
import { clearAuthStorageKeepRemembered } from "@/features/auth/rememberMe";

/* -------------------- TYPES -------------------- */

/**
 * Discriminated result of a login attempt so the UI can show a specific
 * message (invalid credentials vs disabled/locked/rate-limited/network) and
 * react to the forced first-login password change.
 */
export type LoginResult =
  | { ok: true; must_change_password: boolean }
  | { ok: false; error: AuthError };

export interface Office {
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

  login: (identifier: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;

  organizations: Organization[];

  currentOrganization: string;
  setCurrentOrganization: (orgId: string) => void;

  /**
   * The numeric tenant primary key for the active organization, derived from
   * `currentOrganization` (`ORG-<id>`) / the user's `organizationId`. Use THIS
   * for any `/api/v1/tenants/{id}/...` path param — never `Number(currentOrganization)`,
   * which is `NaN` because `currentOrganization` is the display id `ORG-<id>`.
   * `null` when no valid tenant is resolvable.
   */
  tenantId: number | null;

  currentOffice: string;
  setCurrentOffice: (officeId: string) => void;

  activePatient: ActivePatient | null;
  setActivePatient: (patient: ActivePatient | null) => void;

  markFirstLoginComplete: () => void;
}

/* -------------------- MAPPING -------------------- */

/**
 * Build the auth UI state from the backend `MeFull` payload
 * (`{ user, tenant, offices }`). Office/org IDs use the app's canonical
 * `OFF-{id}` / `ORG-{id}` format so downstream consumers (OrganizationSwitcher,
 * currentOffice comparisons, office-id extraction) keep working unchanged.
 */
function buildAuthState(me: MeFull): {
  user: User;
  organizations: Organization[];
} {
  const u = me.user;

  const user: User = {
    id: String(u.id),
    email: u.email,
    name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
    role: (u.role as UserRole) ?? "staff",
    isFirstLogin: false,
    isActive: u.is_active,
    isOrgOwner: u.role === "owner",
    organizationId: String(me.tenant?.id ?? u.tenant_id),
  };

  const organizations: Organization[] = me.tenant
    ? [
        {
          id: `ORG-${me.tenant.id}`,
          name: me.tenant.name,
          code: `PG-${me.tenant.id}`,
          is_current: true,
          offices: (me.offices ?? []).map((o) => ({
            id: `OFF-${o.office_id}`,
            name: o.name ?? "",
            code: String(o.office_id),
            address: "",
            displayName: `${o.name ?? "Office"} [${o.office_id}]`,
            is_current: o.is_primary ?? false,
          })),
        },
      ]
    : [];

  return { user, organizations };
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

  /* ---------- DERIVED: numeric tenant id ---------- */
  // currentOrganization is the display id "ORG-<tenantPk>"; the user's
  // organizationId is the bare numeric PK. Prefer the active org, fall back to
  // the user, and expose a clean number (or null) for /tenants/{id} consumers.
  const tenantId = ((): number | null => {
    const raw = (currentOrganization || "").replace(/^ORG-/i, "") || user?.organizationId || "";
    const n = Number(raw);
    return raw !== "" && Number.isFinite(n) ? n : null;
  })();

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
        const me = await getMeFull();
        const { user: restoredUser, organizations: orgs } = buildAuthState(me);

        setUser(restoredUser);
        setOrganizations(orgs);

        localStorage.setItem("me_full", JSON.stringify(restoredUser));
        localStorage.setItem("access_ctx", JSON.stringify(orgs));

        const activeOrg = orgs.find((o) => o.is_current) ?? orgs[0];

        if (activeOrg) {
          setCurrentOrganization(activeOrg.id);

          const office =
            activeOrg.offices?.find((o) => o.is_current) ??
            activeOrg.offices?.[0];

          setCurrentOffice(office?.id ?? "");
        }

        setIsAuthenticated(true);
      } catch {
        clearAuthStorageKeepRemembered();
        setIsAuthenticated(false);
        setUser(null);
      }
    })();
  }, []);

  /* ---------- LOGIN ---------- */

  const login = async (
    identifier: string,
    password: string,
  ): Promise<LoginResult> => {
    try {
      // Backend LoginRequest expects `username` (accepts username or email).
      const tokens = await login_({ username: identifier, password });

      const token = tokens.access_token;

      localStorage.setItem("access_token", token);
      localStorage.setItem("refresh_token", tokens.refresh_token);

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const me = await getMeFull();
      const { user: newUser, organizations: orgs } = buildAuthState(me);

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
      return {
        ok: true,
        must_change_password: me.user.must_change_password ?? false,
      };
    } catch (err) {
      console.error("Login failed", err);
      return { ok: false, error: mapAuthError(err) };
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
      clearAuthStorageKeepRemembered();
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

      // Modern, non-blocking notice. The axios response interceptor
      // (src/services/api.ts) performs the actual redirect to /login.
      toast.error(message);

      // Call logout to clean up state.
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
        tenantId,
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

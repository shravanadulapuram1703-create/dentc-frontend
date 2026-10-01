import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { officeKeyToId, type OfficeOption } from "@/services/officeLookup";
import {
  deriveOfficeAccess,
  deriveOfficeScopeStatus,
  isOfficeAllowed,
  officeKey,
  resolveInitialOffice,
  type OfficeAccess,
  type OfficeScopeStatus,
} from "./officeScopeModel";
import { setActiveOfficeId } from "./officeHeader";
import { getLastOffice } from "./officeScopeStorage";
import { useOfficeOptions } from "./useOfficeOptions";
import { confirmDiscardUnsaved } from "./useUnsavedGuard";

/**
 * The working-office model every screen reads instead of parsing
 * `currentOffice` itself. AuthContext stays the single owner of the string
 * state and its persistence; this layer derives the numeric id, the office
 * record, the user's access set and the switch behaviour.
 */
export interface OfficeScope extends OfficeAccess {
  status: OfficeScopeStatus;
  /** Numeric working office — null only while resolving or when unassigned. */
  office_id: number | null;
  /** `OFF-<id>` for legacy prop consumers during the migration. */
  office_key: string;
  /** Name / short_id of the working office (async — from the office catalog). */
  office: OfficeOption | null;
  /** Assigned offices, or every tenant office for privileged users. */
  allowed_office_ids: number[];
  /** The full tenant catalog (label table; never filtered). */
  office_options: OfficeOption[];
  office_options_loading: boolean;
  isAssigned(office_id: number): boolean;
  /** Resolves false when the unsaved guard cancelled or the office was refused. */
  switchOffice(office_id: number): Promise<boolean>;
}

const OfficeScopeContext = createContext<OfficeScope | undefined>(undefined);

/** Fired on `window` after a successful switch, for non-React pollers (AppointNow, scheduler overlays). */
export const OFFICE_CHANGED_EVENT = "office:changed";

export function OfficeScopeProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    user,
    organizations,
    currentOrganization,
    currentOffice,
    setCurrentOffice,
  } = useAuth();

  const org = organizations.find((o) => o.id === currentOrganization) ?? organizations[0];
  const orgOffices = org?.offices;

  const access = useMemo(
    () =>
      deriveOfficeAccess({
        role: user?.role,
        offices: orgOffices ?? [],
        permissions: user?.permissions,
        permissions_enforced: user?.permissions_enforced,
      }),
    [user?.role, user?.permissions, user?.permissions_enforced, orgOffices],
  );

  const office_id = officeKeyToId(currentOffice) ?? null;

  const optionsQuery = useOfficeOptions({ enabled: isAuthenticated });
  const office_options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data]);
  const office = useMemo(
    () => (office_id == null ? null : (office_options.find((o) => o.id === office_id) ?? null)),
    [office_options, office_id],
  );

  const allowed_office_ids = useMemo(() => {
    const restricted =
      access.office_assignment_enforced &&
      !access.can_view_all_offices &&
      !access.can_switch_any_office &&
      access.assigned_office_ids.length > 0;
    if (!restricted && office_options.length > 0) return office_options.map((o) => o.id);
    return access.assigned_office_ids;
  }, [access, office_options]);

  // Seed invariant: the working office is never empty when anything can seed it.
  // AuthContext already does this on login/restore; this catches the remaining
  // cases (a stored key that no longer parses, an org loaded after mount).
  const userId = user?.id;
  useEffect(() => {
    if (!isAuthenticated || !userId || office_id != null) return;
    const resolved = resolveInitialOffice([getLastOffice(userId)], access);
    if (resolved != null) setCurrentOffice(officeKey(resolved));
  }, [isAuthenticated, userId, office_id, access, setCurrentOffice]);

  // Keep the outbound `X-Office-ID` header (officeHeader.ts) in step with the
  // working office so every mutation stamps/audits the right office (OFF-SCOPE-3).
  useEffect(() => {
    setActiveOfficeId(office_id);
  }, [office_id]);

  const status = deriveOfficeScopeStatus(office_id, access);

  const isAssigned = useCallback(
    (id: number) => access.assigned_office_ids.includes(id),
    [access.assigned_office_ids],
  );

  const switchOffice = useCallback(
    async (next: number): Promise<boolean> => {
      if (next === office_id) return true;
      if (!isOfficeAllowed(next, access)) {
        toast.error("You are not assigned to that office.");
        return false;
      }
      if (!confirmDiscardUnsaved("Switch office")) return false;
      setCurrentOffice(officeKey(next));
      const name = office_options.find((o) => o.id === next)?.name ?? `office ${next}`;
      if (access.assigned_office_ids.length > 0 && !access.assigned_office_ids.includes(next)) {
        toast.warning(`Covering ${name} — you are not assigned to this office.`);
      } else {
        toast.success(`Now working in ${name}`);
      }
      window.dispatchEvent(new CustomEvent(OFFICE_CHANGED_EVENT, { detail: { office_id: next } }));
      return true;
    },
    [office_id, access, setCurrentOffice, office_options],
  );

  const value = useMemo<OfficeScope>(
    () => ({
      ...access,
      status,
      office_id,
      office_key: office_id != null ? officeKey(office_id) : "",
      office,
      allowed_office_ids,
      office_options,
      office_options_loading: optionsQuery.isLoading,
      isAssigned,
      switchOffice,
    }),
    [access, status, office_id, office, allowed_office_ids, office_options, optionsQuery.isLoading, isAssigned, switchOffice],
  );

  return <OfficeScopeContext.Provider value={value}>{children}</OfficeScopeContext.Provider>;
}

export function useOfficeScope(): OfficeScope {
  const ctx = useContext(OfficeScopeContext);
  if (!ctx) throw new Error("useOfficeScope must be used within OfficeScopeProvider");
  return ctx;
}

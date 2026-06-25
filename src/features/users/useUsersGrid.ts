import { useMemo } from "react";
import { useListUsers } from "@/api/generated/endpoints/users/users";
import {
  useListUserOffices,
  useListOffices,
  useListTenants,
} from "@/api/generated/endpoints/organization/organization";
import {
  useListUserGroupMemberships,
  useListUserGroups,
} from "@/api/generated/endpoints/staff/staff";
import { mapUsersGrid, type UserGridRow } from "./mapUsersGrid";

// Pilot: fetch a single large page of each resource. Proper cursor/page
// handling is a follow-up; size 200 covers current data comfortably.
const LIST_PARAMS = { size: 200 } as const;

export interface UsersGridFilters {
  /** Server-side filter: only users assigned to this office. */
  office_id?: number;
  /** Server-side filter: only users with this role. */
  role?: string;
  /** Server-side free-text search (username / first / last name / email). */
  search?: string;
}

export interface UseUsersGridResult {
  users: UserGridRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Server state for the UserSetup grid, composed from the canonical backend
 * resources via the generated React Query hooks. The user list is filtered
 * server-side by `office_id`/`role` (GET /users supports both); the office /
 * tenant / user-office resources are fetched in full to resolve the
 * home-office, assigned-office and PGID columns client-side.
 */
export function useUsersGrid(filters: UsersGridFilters = {}): UseUsersGridResult {
  const usersParams = {
    ...LIST_PARAMS,
    ...(filters.office_id != null ? { office_id: filters.office_id } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const usersQ = useListUsers(usersParams);
  const userOfficesQ = useListUserOffices(LIST_PARAMS);
  const officesQ = useListOffices(LIST_PARAMS);
  const tenantsQ = useListTenants(LIST_PARAMS);
  const groupMembershipsQ = useListUserGroupMemberships(LIST_PARAMS);
  const groupsQ = useListUserGroups(LIST_PARAMS);

  const users = useMemo(
    () =>
      mapUsersGrid({
        users: usersQ.data?.items ?? [],
        userOffices: userOfficesQ.data?.items ?? [],
        offices: officesQ.data?.items ?? [],
        tenants: tenantsQ.data?.items ?? [],
        userGroupMemberships: groupMembershipsQ.data?.items ?? [],
        userGroups: groupsQ.data?.items ?? [],
      }),
    [
      usersQ.data,
      userOfficesQ.data,
      officesQ.data,
      tenantsQ.data,
      groupMembershipsQ.data,
      groupsQ.data,
    ],
  );

  return {
    users,
    isLoading:
      usersQ.isLoading ||
      userOfficesQ.isLoading ||
      officesQ.isLoading ||
      tenantsQ.isLoading ||
      groupMembershipsQ.isLoading ||
      groupsQ.isLoading,
    isError:
      usersQ.isError ||
      userOfficesQ.isError ||
      officesQ.isError ||
      tenantsQ.isError ||
      groupMembershipsQ.isError ||
      groupsQ.isError,
    refetch: () => {
      void usersQ.refetch();
      void userOfficesQ.refetch();
      void officesQ.refetch();
      void tenantsQ.refetch();
      void groupMembershipsQ.refetch();
      void groupsQ.refetch();
    },
  };
}

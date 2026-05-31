import { useMemo } from "react";
import { useListUsers } from "@/api/generated/endpoints/users/users";
import {
  useListUserOffices,
  useListOffices,
  useListTenants,
} from "@/api/generated/endpoints/organization/organization";
import { mapUsersGrid, type UserGridRow } from "./mapUsersGrid";

// Pilot: fetch a single large page of each resource. Proper cursor/page
// handling is a follow-up; size 200 covers current data comfortably.
const LIST_PARAMS = { size: 200 } as const;

export interface UseUsersGridResult {
  users: UserGridRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Server state for the UserSetup grid, composed from the canonical backend
 * resources via the generated React Query hooks. Replaces the legacy
 * imperative fetch of `/users/list-with-home-office` (which this backend does
 * not implement) with a client-side join — no backend change required.
 */
export function useUsersGrid(): UseUsersGridResult {
  const usersQ = useListUsers(LIST_PARAMS);
  const userOfficesQ = useListUserOffices(LIST_PARAMS);
  const officesQ = useListOffices(LIST_PARAMS);
  const tenantsQ = useListTenants(LIST_PARAMS);

  const users = useMemo(
    () =>
      mapUsersGrid({
        users: usersQ.data?.items ?? [],
        userOffices: userOfficesQ.data?.items ?? [],
        offices: officesQ.data?.items ?? [],
        tenants: tenantsQ.data?.items ?? [],
      }),
    [usersQ.data, userOfficesQ.data, officesQ.data, tenantsQ.data],
  );

  return {
    users,
    isLoading:
      usersQ.isLoading ||
      userOfficesQ.isLoading ||
      officesQ.isLoading ||
      tenantsQ.isLoading,
    isError:
      usersQ.isError ||
      userOfficesQ.isError ||
      officesQ.isError ||
      tenantsQ.isError,
    refetch: () => {
      void usersQ.refetch();
      void userOfficesQ.refetch();
      void officesQ.refetch();
      void tenantsQ.refetch();
    },
  };
}

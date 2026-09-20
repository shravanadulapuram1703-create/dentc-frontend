import { useQuery } from "@tanstack/react-query";
import {
  invalidateOfficeLookupCache,
  listOfficeOptions,
  type OfficeOption,
} from "@/services/officeLookup";
import { queryClient } from "@/shared/config/queryClient";

export const officeOptionsKeys = {
  all: ["offices", "options"] as const,
};

const STALE_MS = 10 * 60 * 1000;

/**
 * The tenant office catalog as a shared React Query entry — the ONE office list
 * hook for switcher groups, badges, pickers and id → name resolution. Never
 * filtered by assignment or `is_active` (filter client-side where needed).
 */
export function useOfficeOptions(options?: { enabled?: boolean }) {
  return useQuery<OfficeOption[]>({
    queryKey: officeOptionsKeys.all,
    queryFn: listOfficeOptions,
    staleTime: STALE_MS,
    enabled: options?.enabled ?? true,
  });
}

/** Call after creating / editing an office in Setup. */
export async function invalidateOfficeOptions(): Promise<void> {
  invalidateOfficeLookupCache();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: officeOptionsKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["reports", "ref", "offices"] }),
  ]);
}

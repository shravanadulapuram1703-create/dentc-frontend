// Reference data for report filter dropdowns (offices + providers) and for
// resolving ids → names inside report tables. Cached generously since these
// lists change rarely.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOfficeOptions } from "@/features/office-scope";
import { listOfficeOptions, type OfficeOption } from "@/services/officeLookup";
import {
  fetchProviderDirectory,
  fetchProvidersForOffice,
  providerDirectoryKeys,
  providerLabelMap,
} from "@/services/providerDirectory";

// Provider display names come from the shared directory (`formatProviderName`) —
// this module no longer keeps its own copy of that logic. Office names come from
// the ONE office catalog (`listOfficeOptions` / `useOfficeOptions`).

const REF_STALE = 10 * 60_000;

export interface RefOption {
  value: string;
  label: string;
}

/** Display label for an office row — accepts the catalog `OfficeOption` or a raw `OfficeRead`. */
export function officeName(o: Pick<OfficeOption, "id" | "name" | "short_id">): string {
  return o.name?.trim() || o.short_id || String(o.id);
}

/**
 * Active offices for the office <select>, from the shared office catalog. The
 * catalog itself is never filtered (badges on historical rows still need
 * deactivated offices), so `is_active` is applied here, client-side.
 */
export function useOffices(): {
  data: OfficeOption[] | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const q = useOfficeOptions();
  const data = useMemo(() => q.data?.filter((o) => o.is_active), [q.data]);
  return { data, isLoading: q.isLoading, isError: q.isError };
}

/**
 * Providers for a given office (or all when office is null), from the shared
 * provider directory so report filters offer the same list as every other screen.
 */
export function useProviders(office: number | null) {
  return useQuery({
    queryKey: [...providerDirectoryKeys.office(office), "reports"],
    staleTime: REF_STALE,
    queryFn: () => fetchProvidersForOffice(office),
  });
}

/**
 * Load a provider id → "Name (ID)" map for enriching report tables. Used inside
 * report `fetch`es (providers list is small; one page covers it).
 */
export async function loadProviderMap(_office: number | null): Promise<Map<string, string>> {
  // Deliberately unscoped: a report row can reference a provider outside the
  // filtered office, and an id is never a useful label.
  const directory = await fetchProviderDirectory();
  return providerLabelMap(directory);
}

/** Load an office id → name map (every office, including inactive — report rows can reference them). */
export async function loadOfficeMap(): Promise<Map<number, string>> {
  const offices = await listOfficeOptions();
  const map = new Map<number, string>();
  for (const o of offices) map.set(o.id, officeName(o));
  return map;
}

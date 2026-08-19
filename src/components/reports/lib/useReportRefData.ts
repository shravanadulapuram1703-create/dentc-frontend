// Reference data for report filter dropdowns (offices + providers) and for
// resolving ids → names inside report tables. Cached generously since these
// lists change rarely.
import { useQuery } from "@tanstack/react-query";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import type { OfficeRead } from "@/api/generated/model";
import {
  fetchProviderDirectory,
  fetchProvidersForOffice,
  providerDirectoryKeys,
} from "@/services/providerDirectory";

// Provider display names come from the shared directory (`formatProviderName`) —
// this module no longer keeps its own copy of that logic.

const REF_STALE = 10 * 60_000;

export interface RefOption {
  value: string;
  label: string;
}

export function officeName(o: OfficeRead): string {
  return o.name?.trim() || o.short_id || String(o.id);
}

/** All offices (active first) for the office <select>. */
export function useOffices() {
  return useQuery({
    queryKey: ["reports", "ref", "offices"],
    staleTime: REF_STALE,
    queryFn: async () => {
      const res = await listOffices({ page: 1, size: 200, is_active: true });
      return res.items;
    },
  });
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
 * Load a provider id → display-name map for enriching report tables. Used inside
 * report `fetch`es (providers list is small; one page covers it).
 */
export async function loadProviderMap(_office: number | null): Promise<Map<string, string>> {
  // Deliberately unscoped: a report row can reference a provider outside the
  // filtered office, and an id is never a useful label.
  const directory = await fetchProviderDirectory();
  return new Map(directory.map((p) => [p.id, p.name]));
}

/** Load an office id → name map. */
export async function loadOfficeMap(): Promise<Map<number, string>> {
  const res = await listOffices({ page: 1, size: 200 });
  const map = new Map<number, string>();
  for (const o of res.items) map.set(o.id, officeName(o));
  return map;
}

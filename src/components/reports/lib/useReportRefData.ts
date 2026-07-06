// Reference data for report filter dropdowns (offices + providers) and for
// resolving ids → names inside report tables. Cached generously since these
// lists change rarely.
import { useQuery } from "@tanstack/react-query";
import { listOffices, listProviders } from "@/api/generated/endpoints/organization/organization";
import type { OfficeRead, ProviderRead } from "@/api/generated/model";

const REF_STALE = 10 * 60_000;

export interface RefOption {
  value: string;
  label: string;
}

/** Provider display name (falls back to first/last, then id). */
export function providerName(p: ProviderRead): string {
  if (p.name?.trim()) return p.name;
  const fl = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return fl || p.id;
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

/** Providers for a given office (or all when office is null). */
export function useProviders(office: number | null) {
  return useQuery({
    queryKey: ["reports", "ref", "providers", office ?? "all"],
    staleTime: REF_STALE,
    queryFn: async () => {
      const res = await listProviders({ page: 1, size: 200, office_id: office ?? null });
      return res.items;
    },
  });
}

/**
 * Load a provider id → display-name map for enriching report tables. Used inside
 * report `fetch`es (providers list is small; one page covers it).
 */
export async function loadProviderMap(office: number | null): Promise<Map<string, string>> {
  const res = await listProviders({ page: 1, size: 200, office_id: office ?? null });
  const map = new Map<string, string>();
  for (const p of res.items) map.set(p.id, providerName(p));
  return map;
}

/** Load an office id → name map. */
export async function loadOfficeMap(): Promise<Map<number, string>> {
  const res = await listOffices({ page: 1, size: 200 });
  const map = new Map<number, string>();
  for (const o of res.items) map.set(o.id, officeName(o));
  return map;
}

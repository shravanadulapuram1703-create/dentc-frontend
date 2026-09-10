import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProviderRead } from '@/api/generated/model';
import {
  fetchOfficeProviderIds,
  fetchProviderRows,
  providerDirectoryKeys,
  providerLabelFor,
  scopeToOffice,
  toProviderOption,
  type ProviderOption,
} from '@/services/providerDirectory';

/** Providers are reference data — refetching them per screen is what made the lists drift. */
const STALE_MS = 5 * 60 * 1000;

export interface ProviderDirectory {
  /** Providers to offer in a picker for this office (active only). */
  providers: ProviderOption[];
  /** Every provider in the tenant, active and inactive — use for label resolution. */
  allProviders: ProviderOption[];
  /** Same scoping as `providers`, as raw rows, for screens that need backend-only fields. */
  providerRows: ProviderRead[];
  /** id → display name, resolved against `allProviders`. */
  providerLabel: (id: string | null | undefined) => string;
  isLoading: boolean;
}

/**
 * The one provider list every screen should render.
 *
 * Pass the office the screen is working in to scope the picker; omit it for a
 * tenant-wide list. Scoping never returns an empty picker — see
 * `src/services/providerDirectory.ts` for why that matters.
 */
export function useProviderDirectory(
  office_id?: number | string | null,
): ProviderDirectory {
  const oid = useMemo(() => {
    if (office_id == null || office_id === '') return null;
    const n = Number(office_id);
    return Number.isFinite(n) ? n : null;
  }, [office_id]);

  const directoryQuery = useQuery({
    queryKey: providerDirectoryKeys.all,
    queryFn: fetchProviderRows,
    staleTime: STALE_MS,
  });

  const assignedQuery = useQuery({
    queryKey: providerDirectoryKeys.office(oid),
    queryFn: () => (oid == null ? Promise.resolve(null) : fetchOfficeProviderIds(oid)),
    enabled: oid != null,
    staleTime: STALE_MS,
  });

  const rows = useMemo(() => directoryQuery.data ?? [], [directoryQuery.data]);
  const allProviders = useMemo(() => rows.map(toProviderOption), [rows]);

  // Scope the ACTIVE set, not the full one: an office whose only assigned provider
  // is deactivated must still fall back to the tenant list rather than show nothing.
  const providerRows = useMemo(
    () => scopeToOffice(rows.filter((p) => p.is_active !== false), oid, assignedQuery.data ?? null),
    [rows, oid, assignedQuery.data],
  );
  const providers = useMemo(() => providerRows.map(toProviderOption), [providerRows]);

  const providerLabel = useMemo(() => providerLabelFor(allProviders), [allProviders]);

  return {
    providers,
    allProviders,
    providerRows,
    providerLabel,
    isLoading: directoryQuery.isLoading || (oid != null && assignedQuery.isLoading),
  };
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProviderRead } from '@/api/generated/model';
import {
  fetchOfficeProviderIds,
  fetchProviderRows,
  formatProviderName,
  providerDirectoryKeys,
  providerLabelFor,
  providerNameFor,
  scopeToOffice,
  toProviderOption,
  type ProviderOption,
} from '@/services/providerDirectory';

/** Providers are reference data — refetching them per screen is what made the lists drift. */
const STALE_MS = 5 * 60 * 1000;

const byName = (a: ProviderRead, b: ProviderRead) =>
  formatProviderName(a).localeCompare(formatProviderName(b), undefined, { sensitivity: 'base' }) ||
  a.id.localeCompare(b.id);

export interface ProviderDirectoryOptions {
  /**
   * Provider ids that must be offered even when the office roster does not list
   * them — the patient's preferred provider / hygienist and whatever is currently
   * selected. The roster (`/offices/{id}/providers/effective`) is genuinely
   * sparse: office 4 lists one test provider while every real provider sits on
   * office 1, so a patient's preferred provider is routinely "out of office" and
   * a picker built from the roster alone can neither show nor default to them.
   */
  pinned?: (string | null | undefined)[];
}

export interface ProviderDirectory {
  /** Providers to offer in a picker for this office (active only, plus any `pinned` ids). */
  providers: ProviderOption[];
  /** Every provider in the tenant, active and inactive — use for label resolution. */
  allProviders: ProviderOption[];
  /** Same scoping as `providers`, as raw rows, for screens that need backend-only fields. */
  providerRows: ProviderRead[];
  /** Every raw row in the tenant (active and inactive) — resolve a selected id here. */
  allProviderRows: ProviderRead[];
  /** id → `Name (ID)` label, resolved against `allProviders`. Use for every on-screen provider. */
  providerLabel: (id: string | null | undefined) => string;
  /** id → bare name (no id) — ONLY for patient-facing text (SMS, letters, printed forms). */
  providerName: (id: string | null | undefined) => string;
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
  options?: ProviderDirectoryOptions,
): ProviderDirectory {
  // Stable key so a caller passing a fresh array literal each render does not
  // rebuild the lists every time.
  const pinnedKey = (options?.pinned ?? []).filter(Boolean).map(String).sort().join('|');
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
  const providerRows = useMemo(() => {
    const scoped = scopeToOffice(rows.filter((p) => p.is_active !== false), oid, assignedQuery.data ?? null);
    if (!pinnedKey) return scoped;
    const want = new Set(pinnedKey.split('|'));
    const have = new Set(scoped.map((p) => String(p.id)));
    // Pinned rows come from the FULL directory (active or not) so a stored id
    // always stays selectable; keep the name-sorted order of the directory.
    const extra = rows.filter((p) => want.has(String(p.id)) && !have.has(String(p.id)));
    return extra.length === 0 ? scoped : [...scoped, ...extra].sort(byName);
  }, [rows, oid, assignedQuery.data, pinnedKey]);
  const providers = useMemo(() => providerRows.map(toProviderOption), [providerRows]);

  const providerLabel = useMemo(() => providerLabelFor(allProviders), [allProviders]);
  const providerName = useMemo(() => providerNameFor(allProviders), [allProviders]);

  return {
    providers,
    allProviders,
    providerRows,
    allProviderRows: rows,
    providerLabel,
    providerName,
    isLoading: directoryQuery.isLoading || (oid != null && assignedQuery.isLoading),
  };
}

import { listProviders } from '@/api/generated/endpoints/organization/organization';
import { listOfficeProviders } from '@/api/generated/endpoints/office-assignment/office-assignment';
import type { ProviderRead } from '@/api/generated/model';

/**
 * Single source of truth for "which providers exist" and "what is a provider called".
 *
 * Before this module every screen rolled its own `listProviders(...)` call with a
 * different filter set, so the same practice showed a different provider list on
 * every screen:
 *
 *   - `fetchProviders(officeId)` (Scheduler/Transactions/Ledger/AddProcedure) filtered
 *     on the `office_id` *scalar*, which is a provider's single home office. Providers
 *     are multi-office, so this returns an EMPTY list for most offices — e.g. office 10
 *     has 0 rows while 92 of the tenant's 97 providers sit on office 1. That is why the
 *     Transactions Entry provider dropdown was empty and the grid rendered raw ids
 *     ("PRV-138") instead of "Dhileep Jinna".
 *   - Setup / Lab Tracking / Procedure Codes called `listProviders({ size: 200 })`
 *     unscoped and saw all 97.
 *   - Payment Plans added `is_active: true` and saw 95.
 *   - Some sorted by name, some took backend order; labels were variously `name`,
 *     `short_id`, `id : name`, or the bare id.
 *
 * The rules this module enforces everywhere:
 *   1. One canonical directory of ALL providers (active and inactive), paged in full.
 *   2. Office scoping resolves through the real many-to-many join
 *      (`GET /offices/{id}/providers`) UNIONed with the legacy `office_id` scalar, and
 *      falls back to the full directory when that union is empty — an unseeded
 *      assignment table must never leave a required picker with nothing to choose.
 *   3. Labels ALWAYS resolve against the full directory, never against the scoped
 *      subset, so a historical transaction posted by an out-of-office or deactivated
 *      provider still renders a human name.
 */

/** Backend caps list endpoints at 200 per page. */
const PAGE_SIZE = 200;

export interface ProviderOption {
  id: string;
  /** Display label — always non-empty. */
  name: string;
  short_id: string | null;
  office_id: number | null;
  role: string | null;
  title: string | null;
  is_active: boolean;
  scheduler_color: string | null;
}

/** Human label for a provider row, tolerating the several ways a name can be stored. */
export function formatProviderName(p: ProviderRead): string {
  const full = (p.name ?? '').trim();
  if (full) return full;
  const composed = [p.last_name, p.first_name].filter(Boolean).join(', ').trim();
  if (composed) return composed;
  return (p.short_id ?? '').trim() || p.id;
}

export function toProviderOption(p: ProviderRead): ProviderOption {
  return {
    id: String(p.id),
    name: formatProviderName(p),
    short_id: p.short_id ?? null,
    office_id: p.office_id ?? null,
    role: p.role ?? null,
    title: p.title ?? null,
    is_active: p.is_active !== false,
    scheduler_color: p.scheduler_color ?? null,
  };
}

/**
 * The one option label for provider `<select>`s. Screens previously rendered
 * `name`, `short_id`, `id : name` or the bare id, so the same person read
 * differently on every screen.
 */
export function providerOptionLabel(p: ProviderOption): string {
  return p.short_id ? `${p.name} (${p.short_id})` : p.name;
}

const byName = (a: ProviderRead, b: ProviderRead) =>
  formatProviderName(a).localeCompare(formatProviderName(b), undefined, { sensitivity: 'base' }) ||
  a.id.localeCompare(b.id);

/**
 * Every provider row in the tenant, active and inactive, sorted by name. Pages
 * through the whole list — a large practice can exceed one 200-row page.
 *
 * Returns raw `ProviderRead`s so screens that need backend-only fields
 * (`dosespot_user_id`, `is_ortho_provider`, …) share this one fetch instead of
 * issuing their own; `fetchProviderDirectory` is the picker-shaped view of it.
 */
export async function fetchProviderRows(): Promise<ProviderRead[]> {
  const first = await listProviders({ page: 1, size: PAGE_SIZE, sort: 'name', order: 'asc' });
  const rows = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listProviders({ page: i + 2, size: PAGE_SIZE, sort: 'name', order: 'asc' })
          .then((r) => r.items ?? [])
          .catch(() => [] as ProviderRead[]),
      ),
    );
    for (const page of rest) rows.push(...page);
  }
  return rows.sort(byName);
}

/** The picker-shaped view of {@link fetchProviderRows}. */
export async function fetchProviderDirectory(): Promise<ProviderOption[]> {
  return (await fetchProviderRows()).map(toProviderOption);
}

/**
 * Provider ids assigned to an office through the office-assignment join.
 * Returns null when the lookup fails so callers can tell "not assigned" from
 * "couldn't ask".
 */
async function fetchOfficeProviderIds(office_id: number): Promise<string[] | null> {
  try {
    const rows = await listOfficeProviders(office_id);
    return (rows ?? []).map((p) => String(p.id));
  } catch {
    return null;
  }
}

/**
 * The providers a given office should offer, from an already-loaded directory.
 * Union of the assignment join and the legacy `office_id` scalar; falls back to the
 * whole directory when the office resolves to nothing.
 */
export function scopeToOffice<T extends { id: string; office_id?: number | null }>(
  directory: T[],
  office_id: number | null | undefined,
  assigned_ids: string[] | null,
): T[] {
  if (office_id == null) return directory;
  const ids = new Set(assigned_ids ?? []);
  const scoped = directory.filter((p) => ids.has(p.id) || p.office_id === office_id);
  return scoped.length > 0 ? scoped : directory;
}

/** Directory + office scoping in one call, for non-React callers. */
export async function fetchProvidersForOffice(
  office_id: number | string | null | undefined,
): Promise<ProviderOption[]> {
  const oid = office_id == null || office_id === '' ? null : Number(office_id);
  const valid = oid != null && Number.isFinite(oid) ? oid : null;
  const [directory, assigned] = await Promise.all([
    fetchProviderDirectory(),
    valid != null ? fetchOfficeProviderIds(valid) : Promise.resolve(null),
  ]);
  return scopeToOffice(directory, valid, assigned);
}

/** Resolve ids to display names against the FULL directory. Unknown ids fall back to the id. */
export function providerLabelFor(
  providers: ProviderOption[],
): (id: string | null | undefined) => string {
  const byId = new Map(providers.map((p) => [p.id, p.name]));
  return (id) => (id ? (byId.get(String(id)) ?? String(id)) : '');
}

/** Shared react-query keys so every screen hits one cache entry. */
export const providerDirectoryKeys = {
  all: ['provider-directory'] as const,
  office: (office_id: number | null) => ['provider-directory', 'office', office_id ?? 'all'] as const,
};

export { fetchOfficeProviderIds };

import { useEffect, useState } from 'react';
import { listUsers } from '@/api/generated/endpoints/users/users';
import type { UserRead } from '@/api/generated/model';

/**
 * Tenant user directory, for turning a `created_by` / `updated_by` id into a
 * name (KAN-75, KAN-78).
 *
 * Several read models — `ProgressNoteRead`, `UserRead` — already carry
 * `*_by_name` companions, and screens should always prefer those. `PatientNoteRead`
 * does not, so its audit columns rendered a raw `User #378`. Until the backend
 * adds the companions there (see docs/patients/), the id is resolved here.
 *
 * The directory is small, tenant-wide, and changes rarely, so it is fetched once
 * and shared: concurrent callers await the same in-flight promise rather than
 * each firing their own paged crawl.
 */

// `size` caps at 200 on list endpoints.
const PAGE_SIZE = 200;

let cache: Map<number, string> | null = null;
let inFlight: Promise<Map<number, string>> | null = null;

/** Best-effort display name for a user (falls back to username, then email). */
export function userDisplayName(u: UserRead): string {
  const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return full || u.username || u.email || `User ${u.id}`;
}

async function fetchDirectory(): Promise<Map<number, string>> {
  const byId = new Map<number, string>();
  const first = await listUsers({ page: 1, size: PAGE_SIZE });
  const collect = (users: UserRead[]) => users.forEach((u) => byId.set(u.id, userDisplayName(u)));

  collect(first.items ?? []);
  for (let page = 2; page <= (first.meta?.pages ?? 1); page++) {
    const next = await listUsers({ page, size: PAGE_SIZE });
    collect(next.items ?? []);
  }
  return byId;
}

/** Load (and memoize) the id → display-name map. */
export function loadUserDirectory(): Promise<Map<number, string>> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = fetchDirectory()
      .then((map) => {
        cache = map;
        return map;
      })
      .finally(() => {
        // Clear the latch either way, so a failed load can be retried.
        inFlight = null;
      });
  }
  return inFlight;
}

/** Drop the memoized directory (call after a user is renamed or added). */
export function invalidateUserDirectory(): void {
  cache = null;
}

/** Resolve a user id to a name, given a directory map. */
export function resolveUserName(
  directory: Map<number, string> | null,
  id?: number | null,
  /** A `*_by_name` value from the API, which always wins when present. */
  nameFromApi?: string | null,
): string {
  if (nameFromApi) return nameFromApi;
  if (id == null) return '—';
  // Before the directory settles, show the id rather than an empty cell, so the
  // column never looks broken mid-load.
  return directory?.get(id) ?? `User #${id}`;
}

/**
 * Subscribe to the user directory. Returns a `resolve(id, nameFromApi?)` helper
 * that degrades to `User #<id>` until the fetch settles, and permanently if it
 * fails — a name lookup must never blank out an audit column.
 */
export function useUserNames(): {
  resolve: (id?: number | null, nameFromApi?: string | null) => string;
  loaded: boolean;
} {
  const [directory, setDirectory] = useState<Map<number, string> | null>(cache);

  useEffect(() => {
    if (directory) return;
    let cancelled = false;
    loadUserDirectory()
      .then((map) => {
        if (!cancelled) setDirectory(map);
      })
      .catch((error) => {
        console.error('Failed to load the user directory:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [directory]);

  return {
    resolve: (id, nameFromApi) => resolveUserName(directory, id, nameFromApi),
    loaded: directory != null,
  };
}

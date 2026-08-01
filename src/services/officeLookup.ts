// Shared office lookup — resolve the app's canonical `OFF-{id}` office key
// (what GlobalNav sets as `currentOffice`) to the office's display name and
// numeric id.
//
// GlobalNav maps `OfficeRead` → `OFF-{id}` and shows `office.name`; screens that
// display "Office" as a read-only field need the same name, so this keeps one
// source of truth instead of each screen re-fetching and re-mapping.

import { listOffices } from "@/api/generated/endpoints/organization/organization";

export interface OfficeOption {
  /** Canonical app key, e.g. "OFF-1" — matches `currentOffice`. */
  key: string;
  /** Numeric backend id (patients.home_office_id). */
  id: number;
  name: string;
  short_id?: string | null;
  office_code?: string | null;
}

/** Extract the numeric office id from "OFF-1" / "1" / "office-108". */
export function officeKeyToId(officeKey?: string | null): number | undefined {
  if (!officeKey) return undefined;
  if (/^\d+$/.test(officeKey)) return parseInt(officeKey, 10);
  const m = officeKey.match(/(\d+)$/);
  return m && m[1] ? parseInt(m[1], 10) : undefined;
}

let cache: Promise<OfficeOption[]> | null = null;

/** All offices (cached for the session), in the canonical shape. */
export function listOfficeOptions(): Promise<OfficeOption[]> {
  if (!cache) {
    cache = listOffices({ size: 200 })
      .then((res) =>
        (res.items ?? []).map((o) => ({
          key: `OFF-${o.id}`,
          id: o.id,
          name: o.name,
          short_id: o.short_id ?? null,
          office_code: o.office_code ?? null,
        })),
      )
      .catch((err) => {
        cache = null; // allow a retry on the next call
        throw err;
      });
  }
  return cache;
}

/**
 * Resolve one office key to its option. Matches on the canonical key first, then
 * falls back to the numeric id so "1" and "OFF-1" both resolve.
 */
export async function resolveOffice(officeKey?: string | null): Promise<OfficeOption | null> {
  const id = officeKeyToId(officeKey);
  if (id == null) return null;
  const offices = await listOfficeOptions();
  return offices.find((o) => o.key === officeKey) ?? offices.find((o) => o.id === id) ?? null;
}

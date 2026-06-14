// Carrier data access for Insurance Setup.
//
// The dental/medical split is now a SERVER-SIDE filter: the list endpoint
// (`GET /api/v1/insurance-carriers`) accepts `carrier_type` ("True" = Dental,
// "False" = Medical) and paginates stably (devreport INS-1 / INS-8 resolved).
// We page through the filtered set once (size=200) and cache it for a short TTL
// per carrier_type so client-side search/sort over the full set stays snappy.
// Any mutation calls invalidate() so the next load is fresh.

import { listInsuranceCarriers } from "@/api/generated/endpoints/insurance/insurance";
import type { InsuranceCarrierRead } from "@/api/generated/model";

const PAGE_SIZE = 200; // backend max
const TTL_MS = 60_000;

const cache = new Map<string, { at: number; data: InsuranceCarrierRead[] }>();
const inflight = new Map<string, Promise<InsuranceCarrierRead[]>>();

/** Invalidate cached carrier lists (call after create/update/delete). */
export function invalidateCarriers(): void {
  cache.clear();
  inflight.clear();
}

async function fetchAllPages(carrierType: string): Promise<InsuranceCarrierRead[]> {
  const first = await listInsuranceCarriers({
    carrier_type: carrierType,
    size: PAGE_SIZE,
    page: 1,
    sort: "name",
    order: "asc",
  });
  const all: InsuranceCarrierRead[] = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;

  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listInsuranceCarriers({
          carrier_type: carrierType,
          size: PAGE_SIZE,
          page: i + 2,
          sort: "name",
          order: "asc",
        }),
      ),
    );
    for (const res of rest) all.push(...(res.items ?? []));
  }
  return all;
}

/**
 * Return every carrier of the given `carrier_type` ("True"/"False"), cached for
 * {@link TTL_MS}. Concurrent callers share a single in-flight request per type.
 */
export async function fetchCarriersByType(
  carrierType: string,
  force = false,
): Promise<InsuranceCarrierRead[]> {
  const hit = cache.get(carrierType);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const pending = inflight.get(carrierType);
  if (!force && pending) return pending;

  const p = fetchAllPages(carrierType)
    .then((data) => {
      cache.set(carrierType, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      inflight.delete(carrierType);
    });

  inflight.set(carrierType, p);
  return p;
}

// Referral Setup — thin service over the generated Orval client.
//
// Wraps /api/v1/referrals (tag: Patients). Snake_case bodies pass through
// unchanged, per project convention. `size` maxes at 200, so listAllReferrals
// pages through the full set for the always-loaded search rail.

import {
  listReferrals,
  getReferral,
  createReferral,
  updateReferral,
  deleteReferral,
} from "@/api/generated/endpoints/patients/patients";
import type { ReferralRead, ReferralCreate, ReferralUpdate } from "@/api/generated/model";

const PAGE_SIZE = 200;

/** Fetch every referral source, paging past the 200/row server cap. */
export async function listAllReferrals(): Promise<ReferralRead[]> {
  const first = await listReferrals({ page: 1, size: PAGE_SIZE, sort: "last_name", order: "asc" });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;

  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listReferrals({ page: i + 2, size: PAGE_SIZE, sort: "last_name", order: "asc" }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items;
}

export function getReferralById(id: number): Promise<ReferralRead> {
  return getReferral(id);
}

export function createReferralSource(body: ReferralCreate): Promise<ReferralRead> {
  return createReferral(body);
}

export function updateReferralSource(id: number, body: ReferralUpdate): Promise<ReferralRead> {
  return updateReferral(id, body);
}

export function deleteReferralSource(id: number): Promise<void> {
  return deleteReferral(id);
}

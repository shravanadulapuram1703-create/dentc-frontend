/**
 * Office → Users assignment — office-scoped data access.
 *
 * Uses the dedicated office-user endpoints the backend shipped for gap #27
 * (mirrors the other catalogs but keyed by `user_ids`):
 *   GET    /api/v1/offices/{office_id}/users                       → denormalized UserRead[]
 *   PUT    /api/v1/offices/{office_id}/users   { user_ids: [...] } → atomic bulk reconcile
 *   POST   /api/v1/offices/{office_id}/users/copy-from/{source}    → server-side copy (union)
 *
 * The previous client-side glue (N POST/DELETE diff, manual join, copy emulation,
 * defensive office_id filter) is gone — the backend now does all of it. The master
 * list of selectable users still comes from the tenant-wide `GET /api/v1/users`.
 */
import { listUsers } from "@/api/generated/endpoints/users/users";
import {
  listOfficeUsers,
  setOfficeUsers,
  copyOfficeUsersFrom,
} from "@/api/generated/endpoints/office-assignment/office-assignment";
import type { UserRead } from "@/api/generated/model";

const PAGE_SIZE = 200; // backend max page size on list endpoints

/** Loaded snapshot for one office's user assignment. */
export type OfficeUserAssignment = {
  office_id: number;
  /** Every user in the tenant (the master list driving both panes). */
  users: UserRead[];
  /** user_ids currently assigned to this office (denormalized from the API). */
  assigned_user_ids: number[];
};

/** Page through the tenant-wide user list until every user is collected. */
async function fetchAllUsers(): Promise<UserRead[]> {
  const first = await listUsers({ page: 1, size: PAGE_SIZE });
  const all = [...first.items];
  for (let page = 2; page <= (first.meta?.pages ?? 1); page++) {
    const next = await listUsers({ page, size: PAGE_SIZE });
    all.push(...next.items);
  }
  return all;
}

/** Load the full assignment snapshot for an office. */
export async function loadOfficeUserAssignment(officeId: number): Promise<OfficeUserAssignment> {
  const [users, assigned] = await Promise.all([fetchAllUsers(), listOfficeUsers(officeId)]);
  return {
    office_id: officeId,
    users,
    assigned_user_ids: assigned.map((u) => u.id),
  };
}

/**
 * Persist the assignment as an atomic bulk set. The backend `PUT` reconciles
 * (adds/removes links to match the desired set) and returns the new assigned
 * users — no client-side diffing or per-row calls.
 */
export async function saveOfficeUserAssignment(
  officeId: number,
  desiredUserIds: number[],
): Promise<number[]> {
  const assigned = await setOfficeUsers(officeId, { user_ids: desiredUserIds });
  return assigned.map((u) => u.id);
}

/**
 * Server-side "Copy Users From": unions the source office's assigned users into
 * this office and persists immediately, returning the new assigned set.
 */
export async function copyOfficeUsers(officeId: number, sourceOfficeId: number): Promise<number[]> {
  const assigned = await copyOfficeUsersFrom(officeId, sourceOfficeId);
  return assigned.map((u) => u.id);
}

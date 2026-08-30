// Duplicate-plan validation on Group Number.
//
// Two layers guard against duplicate master data, both driven from this module
// so Setup → Insurance → Plans and the patient Add New Ins Plan modal behave
// identically:
//
//   1. ADVISORY, while typing — `PossiblePlanMatches` lists partial matches from
//      four characters so staff can adopt an existing plan (see PlanFormFields).
//   2. BLOCKING, on save — `findDuplicatePlansByGroup` below re-checks for an
//      EXACT group-number collision and the host refuses to save until the user
//      resolves it. This catches the case the advisory layer can't: a dismissed
//      panel, a pasted value, or a group typed before the search settled.
//
// The exact check uses the server-side `group_number` filter (an equality
// filter), so it is precise and cheap — unlike the partial search, which has to
// over-fetch through free-text `search` (devreport INS-PT-14).

import { listInsurancePlans } from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead } from "@/api/generated/model";
import { ensureCarrierRecords, ensureEmployerNames } from "./lookupService";

/**
 * Plans that already use EXACTLY this group number.
 *
 * Returns `[]` for a blank group — a plan with no group number can't collide,
 * and the legacy screen only validates a populated field. `excludePlanId` keeps
 * the plan being edited from flagging itself.
 *
 * Carrier and employer names are resolved before returning so the caller can
 * render them straight away.
 */
export async function findDuplicatePlansByGroup(
  groupNumber: string,
  excludePlanId: number | null = null,
): Promise<InsurancePlanRead[]> {
  const group = groupNumber.trim();
  if (!group) return [];

  const res = await listInsurancePlans({
    group_number: group,
    is_active: true,
    size: 25,
    sort: "id",
    order: "asc",
  });

  // The filter is server-side equality, but compare again so a case-insensitive
  // or whitespace-padded backend match can't slip a non-identical group through.
  const needle = group.toLowerCase();
  const hits = (res.items ?? []).filter(
    (p) => p.id !== excludePlanId && (p.group_number ?? "").trim().toLowerCase() === needle,
  );
  if (hits.length === 0) return [];

  await Promise.all([
    ensureCarrierRecords(hits.map((p) => p.carrier_id)),
    ensureEmployerNames(hits.map((p) => p.employer_id).filter((x): x is number => x != null)),
  ]);
  return hits;
}

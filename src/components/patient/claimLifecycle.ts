// Claim lifecycle helpers shared by the ledger (Create Claim / claim rows) and
// the claim screen (Save as Draft / Delete / View-Create Secondary…Quaternary).
//
// Backend facts this module works around (see
// docs/account-ledger/claim_lifecycle_backend_devreport.md):
//
//   * `DELETE /insurance-claims/{id}` is a SOFT delete: it only flips
//     `is_active` to false and leaves `status` as it was ("draft"), so the
//     claim keeps coming back from `GET /insurance-claims` and used to render
//     in the ledger as "Pri Claim - Draft". A closed claim ALSO carries
//     `is_active=false` (with `close_date` set), so "deleted" is derived as
//     inactive-and-not-closed (CLM-LC-1).
//   * Deleting a claim does not release its procedures — their `claim_id`
//     stays set, so they never return to "unbilled" (CLM-LC-2). The frontend
//     unlinks them before the DELETE.
//   * A procedure has ONE `claim_id` and the claim-detail endpoint resolves
//     procedures by it, so a secondary/tertiary claim has no procedures of its
//     own and no server-side link to the primary (CLM-LC-3). The family is
//     linked through the `claim_number`: the primary's number plus a
//     "-S" / "-T" / "-Q" suffix, which is unique and derivable both ways.

import {
  createInsuranceClaim,
  deleteInsuranceClaim,
  listInsuranceClaims,
} from "@/api/generated/endpoints/billing/billing";
import { updatePatientProcedure } from "@/api/generated/endpoints/clinical/clinical";
import type {
  ClaimDetailClaimRead,
  ClaimDetailCoverageRead,
  ClaimDetailProcedureRead,
  ClaimDetailResponse,
  InsuranceClaimRead,
} from "@/api/generated/model";
import { listPatientInsurance } from "@/api/generated/endpoints/patients/patients";
import { loadSlot, loadSlotFromRecord } from "@/features/patient-insurance/patientInsuranceService";
import {
  findSlotRecord,
  slotFor,
  type InsCategory,
  type InsOrder,
  type SlotData,
} from "@/features/patient-insurance/insuranceModel";

export type ClaimOrder = InsOrder;

export const CLAIM_ORDERS: ClaimOrder[] = ["primary", "secondary", "tertiary", "quaternary"];

/** Title word per billing order — "Secondary Dental Insurance Claim". */
export const ORDER_TITLE: Record<ClaimOrder, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  quaternary: "Quaternary",
};

/** `claim_number` suffix that ties a subsequent claim to its primary. */
const ORDER_SUFFIX: Record<ClaimOrder, string> = {
  primary: "",
  secondary: "-S",
  tertiary: "-T",
  quaternary: "-Q",
};

type AnyClaim = Pick<InsuranceClaimRead, "billing_order" | "claim_type" | "status" | "is_active" | "close_date" | "submitted_date">;

export function claimOrder(c: Pick<AnyClaim, "billing_order">): ClaimOrder {
  const v = (c.billing_order || "primary").trim().toLowerCase();
  if (v === "secondary" || v === "s") return "secondary";
  if (v === "tertiary" || v === "t") return "tertiary";
  if (v === "quaternary" || v === "q") return "quaternary";
  return "primary";
}

/** Dental vs Medical, from `claim_type` ("dental" / "medical"). */
export function claimCategory(c: Pick<AnyClaim, "claim_type">): InsCategory {
  return (c.claim_type || "").trim().toLowerCase().startsWith("med") ? "M" : "D";
}

/**
 * True when the claim has been soft-deleted. The backend has no `is_deleted`
 * flag: DELETE clears `is_active`, but so does closing a claim — the closed
 * one keeps `close_date` / status "closed" and must stay on the ledger.
 */
export function isDeletedClaim(c: AnyClaim): boolean {
  if (c.is_active !== false) return false;
  const status = (c.status || "").trim().toLowerCase();
  return status !== "closed" && !c.close_date;
}

/** A claim that has not been sent yet — the only state Save as Draft applies to. */
export function isDraftClaim(c: Pick<AnyClaim, "status" | "submitted_date">): boolean {
  const status = (c.status || "").trim().toLowerCase();
  return !c.submitted_date && (status === "" || status === "draft" || status === "created" || status === "new");
}

export function baseClaimNumber(claimNumber: string | null | undefined): string {
  return (claimNumber || "").replace(/-[STQ]$/i, "");
}

export function relatedClaimNumber(baseNumber: string, order: ClaimOrder): string {
  return `${baseClaimNumber(baseNumber)}${ORDER_SUFFIX[order]}`;
}

export type ClaimFamily = Partial<Record<ClaimOrder, InsuranceClaimRead>>;

/**
 * Every live claim (primary + subsequent) sharing this claim's base number.
 * Deleted claims are ignored so a deleted secondary can be re-created.
 */
export async function loadClaimFamily(
  patientId: number,
  claimNumber: string | null | undefined,
): Promise<ClaimFamily> {
  const base = baseClaimNumber(claimNumber);
  if (!base) return {};
  const res = await listInsuranceClaims({ patient_id: patientId, size: 200 });
  const family: ClaimFamily = {};
  for (const c of res.items ?? []) {
    if (isDeletedClaim(c) || baseClaimNumber(c.claim_number) !== base) continue;
    const order = claimOrder(c);
    // A suffix-less number is the primary; a suffixed one must agree with its
    // billing_order, otherwise it is a different claim that happens to match.
    const expected = relatedClaimNumber(base, order);
    if (c.claim_number !== expected) continue;
    if (!family[order]) family[order] = c;
  }
  return family;
}

/**
 * The patient's insurance on file for a given category × order — plan,
 * carrier, employer and subscriber joined — or a record-less SlotData when
 * that slot is empty.
 */
export function resolveInsuranceForOrder(
  patientId: number,
  category: InsCategory,
  order: ClaimOrder,
): Promise<SlotData> {
  return loadSlot(patientId, slotFor(category, order));
}

/**
 * Every tier the patient has on file for a category, joined like
 * `resolveInsuranceForOrder` but with ONE patient-insurance list call.
 */
export async function resolveInsuranceSlots(
  patientId: number,
  category: InsCategory,
): Promise<Partial<Record<ClaimOrder, SlotData>>> {
  const res = await listPatientInsurance({ patient_id: patientId, size: 50 });
  const records = res.items ?? [];
  const out: Partial<Record<ClaimOrder, SlotData>> = {};
  await Promise.all(
    CLAIM_ORDERS.map(async (order) => {
      const record = findSlotRecord(records, slotFor(category, order));
      if (record) out[order] = await loadSlotFromRecord(record);
    }),
  );
  return out;
}

function money(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Create the secondary / tertiary / quaternary claim for an existing primary:
 * same patient, office, category and dates; `billing_order` = the new tier;
 * carrier/plan from the patient's insurance slot for that tier; number =
 * primary number + tier suffix so the family can be found again.
 *
 * `est_insurance` comes from the coverage rows' secondary estimate when the
 * primary claim already carries them, otherwise 0 — the backend has no
 * secondary-estimate computation (CLM-LC-4).
 */
export async function createSubsequentClaim(args: {
  primary: InsuranceClaimRead | ClaimDetailClaimRead;
  order: Exclude<ClaimOrder, "primary">;
  coverage?: ClaimDetailCoverageRead[];
  fallbackOfficeId?: number | null;
}): Promise<{ id: string; slot: SlotData }> {
  const { primary, order, coverage = [], fallbackOfficeId = null } = args;
  const slot = await resolveInsuranceForOrder(primary.patient_id, claimCategory(primary), order);
  if (!slot.record) {
    throw new Error(`No ${ORDER_TITLE[order].toLowerCase()} insurance is on file for this patient.`);
  }
  const est = coverage.reduce((sum, cv) => {
    const tierEst =
      order === "secondary" ? cv.sec_estimated : order === "tertiary" ? cv.ter_estimated : null;
    return sum + money(tierEst);
  }, 0);
  const id = crypto.randomUUID();
  await createInsuranceClaim({
    id,
    patient_id: primary.patient_id,
    office_id: primary.office_id ?? fallbackOfficeId,
    claim_number: relatedClaimNumber(primary.claim_number, order),
    claim_type: primary.claim_type || "dental",
    billing_order: order,
    status: "draft",
    date_of_service_from: primary.date_of_service_from ?? null,
    date_of_service_to: primary.date_of_service_to ?? null,
    total_billed: primary.total_billed,
    est_insurance: est.toFixed(2),
    ins_plan_id: slot.record.ins_plan_id ?? null,
    carrier_id: slot.plan?.carrier_id ?? null,
    billing_provider_id: primary.billing_provider_id ?? null,
    treating_provider_id: primary.treating_provider_id ?? null,
  });
  return { id, slot };
}

/** True when an insurance payment has already been posted against the claim. */
export function claimHasPostedPayments(detail: ClaimDetailResponse): boolean {
  if (money(detail.claim.total_paid) > 0) return true;
  if (detail.payments.length > 0) return true;
  return detail.coverage.some(
    (cv) =>
      money(cv.prim_ins_paid) > 0 ||
      money(cv.sec_ins_paid) > 0 ||
      money(cv.ter_ins_paid) > 0 ||
      money(cv.prim_ins_adjust) > 0 ||
      money(cv.sec_ins_adjust) > 0,
  );
}

/**
 * Remove a claim from the ledger for good: release every procedure that was
 * billed on it (so the charges are claim-eligible again), then DELETE the
 * claim. Returns how many procedures could not be released.
 */
export async function deleteClaimPermanently(
  detail: ClaimDetailResponse,
  procedures: ClaimDetailProcedureRead[] = detail.procedures,
): Promise<{ unlinkFailures: number }> {
  const claimId = detail.claim.id;
  const owned = procedures.filter((p) => p.claim_id === claimId);
  const results = await Promise.allSettled(
    owned.map((p) =>
      updatePatientProcedure(p.id, {
        claim_id: null,
        billing_status: "not_billed",
      }),
    ),
  );
  await deleteInsuranceClaim(claimId);
  return { unlinkFailures: results.filter((r) => r.status === "rejected").length };
}

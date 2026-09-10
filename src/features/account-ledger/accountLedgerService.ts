// Ledger — data loaders. Wraps the generated Orval client only (no raw axios)
// and passes snake_case params through unchanged.

import {
  getPatientAccountLedger,
  listInsuranceClaims,
  listPatientPaymentPlans,
  listPatientInsPaymentPlans,
  listPatientSecInsPaymentPlans,
} from '@/api/generated/endpoints/billing/billing';
import { getPatient, listPatients } from '@/api/generated/endpoints/patients/patients';
import { listPatientProcedures } from '@/api/generated/endpoints/clinical/clinical';
import { listOffices } from '@/api/generated/endpoints/organization/organization';
import { listUsers } from '@/api/generated/endpoints/users/users';
import type {
  AccountLedgerRow,
  InsuranceClaimRead,
  OfficeRead,
  UserRead,
  PatientRead,
  PatientPaymentPlanRead,
  PatientInsPaymentPlanRead,
  PatientSecInsPaymentPlanRead,
} from '@/api/generated/model';

/** The backend's per-request row ceiling on the account-ledger feed. */
const FEED_SIZE = 500;

/** `GET /patient-procedures` caps `size` at 200; page up to the feed ceiling. */
const PROC_PAGE = 200;
const PROC_MAX_PAGES = Math.ceil(FEED_SIZE / PROC_PAGE);

export type LedgerScope = 'patient' | 'account';

/** One patient on the account (responsible-party / family group). */
export interface AccountMember {
  patient_id: number;
  name: string; // "Last, First (Preferred)"
}

export function memberName(p: PatientRead): string {
  const base = `${p.last_name ?? ''}, ${p.first_name ?? ''}`.replace(/^, |, $/, '');
  return p.preferred_name ? `${base} (${p.preferred_name})` : base || String(p.id);
}

/**
 * Resolve the patients whose transactions belong in the feed.
 *
 * - `patient` scope -> just the selected patient.
 * - `account` scope -> every patient sharing this patient's
 *   `responsible_party_id` (the legacy "account"), self always included.
 *
 * `responsible_party_id` is a legacy STRING id that often has no patient row of
 * its own, so the group is resolved with `GET /patients?responsible_party_id=`
 * rather than by fetching the guarantor.
 */
export async function loadAccountMembers(
  patientId: number,
  scope: LedgerScope,
): Promise<AccountMember[]> {
  const self = await getPatient(patientId);
  const me: AccountMember = { patient_id: patientId, name: memberName(self) };
  if (scope === 'patient' || !self.responsible_party_id) return [me];

  try {
    const res = await listPatients({
      responsible_party_id: self.responsible_party_id,
      size: 200,
    });
    const members = (res.items ?? []).map((p) => ({
      patient_id: p.id,
      name: memberName(p),
    }));
    if (!members.some((m) => m.patient_id === patientId)) members.unshift(me);
    return members.length ? members : [me];
  } catch {
    return [me];
  }
}

export interface FeedFilters {
  date_from: string | null;
  date_to: string | null;
}

/** One member's slice of the raw feed. */
export interface MemberFeed {
  member: AccountMember;
  rows: AccountLedgerRow[];
  claims: InsuranceClaimRead[];
  /** Procedure ids flagged `hold_claim` — the ledger's "H" indicator (AL-17). */
  held: Set<string>;
  truncated: boolean; // more rows exist than the size cap returned (AL-2)
}

export interface LedgerFeed {
  feeds: MemberFeed[];
  offices: OfficeRead[];
  users: UserRead[];
}

/**
 * Procedure ids the office has placed on Hold Claim.
 *
 * `AccountLedgerRow` carries no `hold_claim`, and `GET /patient-procedures` has
 * no `hold_claim` filter (gap AL-17), so the flag is joined client-side off the
 * procedure list. Held procedures are usually a handful, but the whole list has
 * to be walked to find them.
 */
export async function loadHeldProcedureIds(patientId: number): Promise<Set<string>> {
  const held = new Set<string>();
  try {
    for (let page = 1; page <= PROC_MAX_PAGES; page += 1) {
      const res = await listPatientProcedures({
        patient_id: patientId,
        is_void: false,
        page,
        size: PROC_PAGE,
      });
      const items = res.items ?? [];
      for (const p of items) if (p.hold_claim) held.add(p.id);
      if (items.length < PROC_PAGE) break;
    }
  } catch {
    // A missing hold map only costs the "H" indicator; never blank the grid.
  }
  return held;
}

/**
 * Fetch the denormalised ledger feed for every account member, plus the claim
 * transactions, the Hold-Claim map and the office/user lookup tables.
 *
 * The type filter is deliberately NOT pushed to the server: claims are merged
 * in client-side, so all four kinds have to be filtered in one place for the
 * Grand Total and the running balance to agree.
 */
export async function loadLedgerFeed(
  members: AccountMember[],
  filters: FeedFilters,
): Promise<LedgerFeed> {
  const params = {
    date_from: filters.date_from,
    date_to: filters.date_to,
    sort_by: 'date' as const,
    order: 'asc' as const,
    page: 1,
    size: FEED_SIZE,
  };

  const [feeds, officeRes, userRes] = await Promise.all([
    Promise.all(
      members.map(async (member): Promise<MemberFeed> => {
        const [ledger, claims, held] = await Promise.all([
          getPatientAccountLedger(member.patient_id, params).catch(() => null),
          listInsuranceClaims({ patient_id: member.patient_id, size: 200 }).catch(
            () => ({ items: [] as InsuranceClaimRead[] }),
          ),
          loadHeldProcedureIds(member.patient_id),
        ]);
        return {
          member,
          rows: ledger?.rows ?? [],
          claims: claims.items ?? [],
          held,
          truncated: (ledger?.total ?? 0) > (ledger?.rows?.length ?? 0),
        };
      }),
    ),
    listOffices({ size: 200 }).catch(() => ({ items: [] as OfficeRead[] })),
    listUsers({ size: 200 }).catch(() => ({ items: [] as UserRead[] })),
  ]);

  return { feeds, offices: officeRes.items ?? [], users: userRes.items ?? [] };
}

export interface PaymentPlans {
  regular: PatientPaymentPlanRead | null; // Regular - Patient Payment Plan
  orthoIns: PatientInsPaymentPlanRead | null; // Ortho - Insurance Payment Plan
  secIns: PatientSecInsPaymentPlanRead | null; // (secondary insurance — backend nearest match)
}

/**
 * Fetch the CONTRACTS-tab payment plans. The backend exposes three distinct
 * plan resources; the legacy screen's "Ortho - Patient Payment Plan" panel has
 * no clean backend counterpart (see gap report AL-3).
 */
export async function loadPaymentPlans(patientId: number): Promise<PaymentPlans> {
  const [regRes, insRes, secRes] = await Promise.all([
    listPatientPaymentPlans({ patient_id: patientId, size: 50 }).catch(
      () => ({ items: [] as PatientPaymentPlanRead[] }),
    ),
    listPatientInsPaymentPlans({ patient_id: patientId, size: 50 }).catch(
      () => ({ items: [] as PatientInsPaymentPlanRead[] }),
    ),
    listPatientSecInsPaymentPlans({ patient_id: patientId, size: 50 }).catch(
      () => ({ items: [] as PatientSecInsPaymentPlanRead[] }),
    ),
  ]);

  const firstActive = <T extends { is_active?: boolean }>(items: T[]): T | null =>
    items.find((i) => i.is_active !== false) ?? items[0] ?? null;

  return {
    regular: firstActive(regRes.items ?? []),
    orthoIns: (insRes.items ?? [])[0] ?? null,
    secIns: (secRes.items ?? [])[0] ?? null,
  };
}

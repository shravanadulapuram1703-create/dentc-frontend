// Account Ledger — data loaders. Wraps the generated Orval client only (no raw
// axios) and passes snake_case bodies/params through unchanged.

import { listPatientProcedures } from '@/api/generated/endpoints/clinical/clinical';
import {
  listPatientPayments,
  listPatientAdjustments,
  listPatientPaymentPlans,
  listPatientInsPaymentPlans,
  listPatientSecInsPaymentPlans,
} from '@/api/generated/endpoints/billing/billing';
import { listOffices } from '@/api/generated/endpoints/organization/organization';
import { listUsers } from '@/api/generated/endpoints/users/users';
import { loadProcedureCodes, codeDescription } from '@/components/setup/insurance/procedureCodeService';
import type {
  PatientProcedureRead,
  PatientPaymentRead,
  PatientAdjustmentRead,
  OfficeRead,
  UserRead,
  PatientPaymentPlanRead,
  PatientInsPaymentPlanRead,
  PatientSecInsPaymentPlanRead,
} from '@/api/generated/model';

export { codeDescription };

export interface AccountLedgerData {
  procs: PatientProcedureRead[];
  pays: PatientPaymentRead[];
  adjs: PatientAdjustmentRead[];
  offices: OfficeRead[];
  users: UserRead[];
}

/**
 * Fetch the full ledger source data for a patient: every non-void procedure,
 * payment and adjustment (across all dates), plus the office and user lookup
 * tables needed to resolve the Office and User columns. Each list call is
 * independently fault-tolerant so one failing resource can't blank the grid.
 */
export async function loadAccountLedgerData(patientId: number): Promise<AccountLedgerData> {
  // Warm the procedure-code cache so codeDescription() resolves synchronously.
  await loadProcedureCodes();

  const [procRes, payRes, adjRes, officeRes, userRes] = await Promise.all([
    listPatientProcedures({ patient_id: patientId, is_void: false, size: 200 }).catch(
      () => ({ items: [] as PatientProcedureRead[] }),
    ),
    listPatientPayments({ patient_id: patientId, is_void: false, size: 200 }).catch(
      () => ({ items: [] as PatientPaymentRead[] }),
    ),
    listPatientAdjustments({ patient_id: patientId, size: 200 }).catch(
      () => ({ items: [] as PatientAdjustmentRead[] }),
    ),
    listOffices({ size: 200 }).catch(() => ({ items: [] as OfficeRead[] })),
    listUsers({ size: 200 }).catch(() => ({ items: [] as UserRead[] })),
  ]);

  return {
    procs: procRes.items ?? [],
    pays: payRes.items ?? [],
    adjs: (adjRes.items ?? []).filter((a) => !a.is_void),
    offices: officeRes.items ?? [],
    users: userRes.items ?? [],
  };
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

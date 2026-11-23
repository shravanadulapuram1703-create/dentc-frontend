/**
 * Office delete / reactivate + the "what is still attached" impact check shown
 * before a delete. Wraps the generated client.
 *
 * `DELETE /api/v1/offices/{id}` is a SOFT delete on the backend — it sets
 * `is_active = false` (same as Status → Inactive) and runs no dependency check
 * (OFF-QA-15 in docs/setup/offices/office_setup_new_office_qa_backend_devreport.md).
 * Patients, appointments, ledger rows etc. keep pointing at the office, so the
 * impact is computed here and shown to the user before they confirm.
 */
import { deleteOffice, updateOffice } from "@/api/generated/endpoints/organization/organization";
import { listAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { listPatients } from "@/api/generated/endpoints/patients/patients";
import {
  listOfficeProviders,
  listOfficeUsers,
} from "@/api/generated/endpoints/office-assignment/office-assignment";
import { listOperatories } from "@/api/generated/endpoints/organization/organization";
import { todayIsoDate } from "@/utils/datetime";

/** Counts of records still tied to the office. `null` = the lookup failed. */
export type OfficeDeleteImpact = {
  future_appointments: number | null;
  home_patients: number | null;
  assigned_users: number | null;
  assigned_providers: number | null;
  active_operatories: number | null;
};

const settle = async (p: Promise<number>): Promise<number | null> => {
  try {
    return await p;
  } catch {
    return null;
  }
};

export async function fetchOfficeDeleteImpact(office_id: number): Promise<OfficeDeleteImpact> {
  const [future_appointments, home_patients, assigned_users, assigned_providers, active_operatories] =
    await Promise.all([
      settle(
        listAppointments({ office_id, date_from: todayIsoDate(), size: 1 }).then((r) => r.meta.total),
      ),
      settle(listPatients({ home_office_id: office_id, is_active: true, size: 1 }).then((r) => r.meta.total)),
      settle(listOfficeUsers(office_id).then((r) => r.length)),
      settle(listOfficeProviders(office_id).then((r) => r.length)),
      settle(listOperatories({ office_id, is_active: true, size: 1 }).then((r) => r.meta.total)),
    ]);
  return { future_appointments, home_patients, assigned_users, assigned_providers, active_operatories };
}

/** Soft delete (backend sets `is_active = false`). */
export function deleteOfficeById(office_id: number): Promise<void> {
  return deleteOffice(office_id);
}

/** Undo a delete — the office comes back as active. */
export async function reactivateOffice(office_id: number): Promise<void> {
  await updateOffice(office_id, { is_active: true });
}

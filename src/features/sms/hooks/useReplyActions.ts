// Staff-side actions for the three patient responses (YES / NO / STOP).
//
// In production the backend webhook (gap SMS-2) applies these automatically
// the moment Twilio delivers the reply. Until it ships — and for replies the
// webhook could not match — staff can apply the same outcome from the
// details pane. Both paths write the same fields, so the audit trail is
// identical:
//
//   confirm  → PATCH /appointments/{id}/status { status: "confirmed" }
//   decline  → PATCH /appointments/{id}/status { status: "cancelled",
//               cancellation_reason: "Patient declined via SMS", add_to_call_list: true }
//   opt_out  → PATCH /patients/{id} { no_auto_sms: true }

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateAppointmentStatus } from "@/api/generated/endpoints/appointments/appointments";
import { updatePatient } from "@/api/generated/endpoints/patients/patients";

export const DECLINE_REASON = "Patient declined via SMS";

export function useReplyActions(patient_id: number) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"confirm" | "decline" | "opt_out" | null>(null);

  const invalidate = useCallback(
    (fragment: string) =>
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? "").includes(fragment) }),
    [qc],
  );

  const run = useCallback(
    async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>, ok: string) => {
      setBusy(kind);
      try {
        await fn();
        toast.success(ok);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const confirmAppointment = useCallback(
    (appointment_id: string) =>
      run(
        "confirm",
        async () => {
          await updateAppointmentStatus(appointment_id, { status: "confirmed" });
          await invalidate("/appointments");
        },
        "Appointment marked confirmed",
      ),
    [run, invalidate],
  );

  const declineAppointment = useCallback(
    (appointment_id: string) =>
      run(
        "decline",
        async () => {
          await updateAppointmentStatus(appointment_id, {
            status: "cancelled",
            cancellation_reason: DECLINE_REASON,
            add_to_call_list: true,
          });
          await invalidate("/appointments");
        },
        "Appointment cancelled and patient added to the call list",
      ),
    [run, invalidate],
  );

  const optOutPatient = useCallback(
    () =>
      run(
        "opt_out",
        async () => {
          await updatePatient(patient_id, { no_auto_sms: true });
          await invalidate("/patients");
        },
        "No Auto SMS turned on — automated texts will stop",
      ),
    [run, invalidate, patient_id],
  );

  return { busy, confirmAppointment, declineAppointment, optOutPatient };
}

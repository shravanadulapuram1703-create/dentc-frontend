// Appointment Report — appointments over a date range, using the denormalized
// scheduler feed (listSchedulerAppointments) which carries patient/provider/
// operatory NAMES. That feed takes only date + office, so provider & status are
// filtered client-side.
import { CalendarCheck } from "lucide-react";
import { listSchedulerAppointments } from "@/api/generated/endpoints/appointments/appointments";
import type { AppointmentSchedulerRead } from "@/api/generated/model";
import { fetchArchivedAppointmentIds } from "@/services/schedulerApi";
import { fmtDate, fmtTime, distribution } from "./helpers";
import type { ReportDefinition } from "../types";

type Row = AppointmentSchedulerRead;

/** Human status combining the free-form `status` with the boolean flags. */
function derivedStatus(r: Row): string {
  if (r.is_cancelled) return "Cancelled";
  if (r.is_missed) return "Missed";
  if (r.is_blocked) return "Blocked";
  return (r.status || "Scheduled").replace(/_/g, " ");
}

function matchesStatus(r: Row, value: string): boolean {
  switch (value) {
    case "cancelled":
      return Boolean(r.is_cancelled);
    case "missed":
      return Boolean(r.is_missed);
    case "blocked":
      return Boolean(r.is_blocked);
    case "scheduled":
      return !r.is_cancelled && !r.is_missed && !r.is_blocked;
    default:
      return derivedStatus(r).toLowerCase().includes(value.toLowerCase());
  }
}

export const appointmentReport: ReportDefinition<Row> = {
  id: "appointments",
  title: "Appointment Report",
  description: "Scheduled appointments over a period, by office and provider.",
  category: "Appointment",
  icon: CalendarCheck,
  filters: ["dateRange", "office", "provider", "status"],
  defaultPreset: "this_week",
  statusOptions: [
    { value: "scheduled", label: "Active (scheduled)" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "missed", label: "Missed" },
    { value: "blocked", label: "Blocked" },
  ],
  columns: [
    { key: "date", header: "Date", accessor: (r) => r.date, format: (r) => fmtDate(r.date) },
    { key: "time", header: "Time", accessor: (r) => r.start_time, format: (r) => fmtTime(r.start_time) },
    { key: "patient", header: "Patient", accessor: (r) => r.patient_name ?? (r.patient_id ? `#${r.patient_id}` : "—") },
    { key: "provider", header: "Provider", accessor: (r) => r.provider_name ?? r.provider_id ?? "" },
    { key: "operatory", header: "Operatory", accessor: (r) => r.operatory_name ?? "" },
    { key: "procedure", header: "Procedure", accessor: (r) => r.procedure_label ?? "" },
    { key: "duration", header: "Min", accessor: (r) => r.duration, align: "right" },
    { key: "status", header: "Status", accessor: (r) => derivedStatus(r) },
  ],
  fetch: async (f) => {
    // The feed still returns soft-deleted appointments and carries no
    // is_archived flag, so subtract the archived ids (gap SCHED-DEL-1).
    const [feed, archivedIds] = await Promise.all([
      listSchedulerAppointments({
        date_from: f.range.from,
        date_to: f.range.to,
        office_id: f.office,
      }),
      fetchArchivedAppointmentIds(f.range.from, f.range.to, f.office ?? undefined),
    ]);
    let rows = feed.filter((r) => !archivedIds.has(r.id));
    if (f.provider) rows = rows.filter((r) => r.provider_id === f.provider);
    if (f.status) rows = rows.filter((r) => matchesStatus(r, f.status));

    const active = rows.filter((r) => !r.is_cancelled && !r.is_blocked && !r.is_missed).length;
    const cancelled = rows.filter((r) => r.is_cancelled).length;
    const missed = rows.filter((r) => r.is_missed).length;

    return {
      rows,
      truncated: false,
      summary: [
        { label: "Appointments", value: rows.length.toLocaleString(), tone: "blue" },
        { label: "Active", value: active.toLocaleString(), tone: "teal" },
        { label: "Cancelled", value: cancelled.toLocaleString(), tone: "amber" },
        { label: "Missed", value: missed.toLocaleString(), tone: "red" },
      ],
      chart: { kind: "pie", title: "By status", data: distribution(rows, derivedStatus) },
    };
  },
};

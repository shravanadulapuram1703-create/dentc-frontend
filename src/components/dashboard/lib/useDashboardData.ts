// Shared data hooks for the Dashboard widgets. Widgets that call these with the
// same office id share a single deduped React Query cache entry, so the KPI,
// Schedule, and Patient Activity widgets together cost ONE scheduler request.
import { useListSchedulerAppointments } from "@/api/generated/endpoints/appointments/appointments";
import type { AppointmentSchedulerRead } from "@/api/generated/model";
import { officeFilter } from "@/features/office-scope";
import { officeIdNum } from "../../../services/schedulerApi";
import { todayISO } from "./dashboardUtils";

/** "OFF-1" / "1" -> 1 (undefined when unset). Re-exported for widget params. */
export function toOfficeId(currentOffice?: string): number | undefined {
  return officeIdNum(currentOffice);
}

/**
 * Today's denormalized appointment feed for the current office. One fetch,
 * shared across every widget that derives from today's appointments.
 *
 * The office reaches the request through `officeFilter` — `{ office_id }` when
 * scoped, `{}` when tenant-wide — never `office_id: null`, which would poison
 * the Orval query key (`[url, params]`) while axios drops it from the URL anyway.
 */
export function useTodayScheduler(currentOffice?: string) {
  const office_id = officeIdNum(currentOffice);
  const date = todayISO();
  const query = useListSchedulerAppointments(
    { date_from: date, date_to: date, ...officeFilter(office_id) },
    { query: { staleTime: 60_000 } },
  );
  const rows: AppointmentSchedulerRead[] = query.data ?? [];
  return { ...query, rows, date, office_id };
}

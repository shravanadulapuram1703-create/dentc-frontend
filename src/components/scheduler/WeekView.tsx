import type { Appointment } from "../../services/schedulerApi";

interface WeekViewProps {
  /** Any date within the week to render (week runs Sun–Sat). */
  selectedDate: Date;
  /** Appointments already fetched for (at least) this week, office/filter scoped. */
  appointments: Appointment[];
  /** Jump to the day view for a specific date. */
  onSelectDay: (date: Date) => void;
  /** Open the edit modal for an appointment. */
  onEditAppointment: (appointment: Appointment) => void;
  /** Map a procedure-type name to its Tailwind color classes. */
  getColor: (procedureTypeName: string) => string;
}

const fmtYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekly overview: 7 day-columns, each listing that day's appointments
 *  sorted by start time. Reads the same appointments the page already fetched
 *  for the visible range — no extra requests. */
export default function WeekView({
  selectedDate,
  appointments,
  onSelectDay,
  onEditAppointment,
  getColor,
}: WeekViewProps) {
  // Build the 7 days of the week containing selectedDate (Sunday first).
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayYMD = fmtYMD(new Date());

  // Group appointments by date string for O(1) per-day lookup.
  const byDate = new Map<string, Appointment[]>();
  for (const a of appointments) {
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date)!.push(a);
  }
  for (const list of byDate.values()) {
    list.sort((x, y) => x.start_time.localeCompare(y.start_time));
  }

  return (
    <div className="grid grid-cols-7 min-h-full bg-white">
      {days.map((day) => {
        const ymd = fmtYMD(day);
        const dayAppts = byDate.get(ymd) ?? [];
        const isToday = ymd === todayYMD;
        return (
          <div key={ymd} className="border-r border-[#E2E8F0] last:border-r-0 min-h-[200px]">
            <button
              onClick={() => onSelectDay(day)}
              className={`w-full sticky top-0 z-10 px-2 py-2 border-b-2 border-[#16293B] text-left transition-colors ${
                isToday
                  ? "bg-[#3A6EA5] text-white"
                  : "bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white hover:from-[#2d5080] hover:to-[#3A6EA5]"
              }`}
              title="Open day view"
            >
              <div className="text-xs font-semibold opacity-90">
                {DAY_LABELS[day.getDay()]}
              </div>
              <div className="text-sm font-bold">{day.getDate()}</div>
            </button>

            <div className="p-1.5 space-y-1">
              {dayAppts.length === 0 ? (
                <div className="text-[11px] text-[#94A3B8] px-1 py-2">No appointments</div>
              ) : (
                dayAppts.map((appt) => (
                  <button
                    key={appt.id}
                    onClick={() => onEditAppointment(appt)}
                    className={`w-full text-left border-l-4 rounded px-2 py-1 overflow-hidden ${getColor(
                      appt.procedure_label,
                    )}`}
                    title={`${appt.start_time} ${appt.patient_name} — ${appt.procedure_label}`}
                  >
                    <div className="text-[11px] font-semibold truncate">
                      {appt.start_time} {appt.patient_name}
                    </div>
                    <div className="text-[11px] truncate opacity-80">
                      {appt.procedure_label}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

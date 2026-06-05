import type { Appointment } from "../../services/schedulerApi";

interface MonthViewProps {
  /** Any date within the month to render. */
  selectedDate: Date;
  /** Appointments already fetched for (at least) this month, office/filter scoped. */
  appointments: Appointment[];
  /** Jump to the day view for a specific date. */
  onSelectDay: (date: Date) => void;
  /** Map a procedure-type name to its Tailwind color classes. */
  getColor: (procedureTypeName: string) => string;
}

const fmtYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 3;

/** Month calendar grid: a cell per day showing the first few appointments and
 *  a "+N more" overflow. Clicking a day opens its day view. Uses the
 *  already-fetched appointments for the month range. */
export default function MonthView({
  selectedDate,
  appointments,
  onSelectDay,
  getColor,
}: MonthViewProps) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // Grid starts on the Sunday on/before the 1st and spans whole weeks.
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const cells: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    cells.push(new Date(d));
  }

  const todayYMD = fmtYMD(new Date());

  // Group appointments by date string and sort each day by start time.
  const byDate = new Map<string, Appointment[]>();
  for (const a of appointments) {
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date)!.push(a);
  }
  for (const list of byDate.values()) {
    list.sort((x, y) => x.start_time.localeCompare(y.start_time));
  }

  return (
    <div className="bg-white min-h-full">
      {/* Weekday header */}
      <div className="grid grid-cols-7 sticky top-0 z-10 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-xs font-bold border-r border-[#16293B] last:border-r-0 text-center"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const ymd = fmtYMD(day);
          const inMonth = day.getMonth() === month;
          const isToday = ymd === todayYMD;
          const dayAppts = byDate.get(ymd) ?? [];
          const visible = dayAppts.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayAppts.length - visible.length;

          return (
            <button
              key={ymd}
              onClick={() => onSelectDay(day)}
              className={`text-left border-b border-r border-[#E2E8F0] min-h-[96px] p-1.5 align-top transition-colors hover:bg-[#F7F9FC] ${
                inMonth ? "bg-white" : "bg-[#F8FAFC]"
              }`}
              title="Open day view"
            >
              <div
                className={`text-xs font-semibold mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday
                    ? "bg-[#3A6EA5] text-white"
                    : inMonth
                    ? "text-[#1E293B]"
                    : "text-[#94A3B8]"
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {visible.map((appt) => (
                  <div
                    key={appt.id}
                    className={`text-[10px] leading-tight truncate border-l-2 rounded px-1 ${getColor(
                      appt.procedure_label,
                    )}`}
                    title={`${appt.start_time} ${appt.patient_name} — ${appt.procedure_label}`}
                  >
                    {appt.start_time} {appt.patient_name}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[10px] text-[#64748B] px-1 font-medium">
                    +{overflow} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

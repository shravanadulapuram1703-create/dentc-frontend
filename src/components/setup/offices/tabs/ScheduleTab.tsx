import { useState, useEffect, useCallback } from "react";
import { Clock, Copy, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../../styles/theme";
import {
  fetchOfficeSchedule,
  saveOfficeSchedule,
  type OfficeScheduleDayUi,
} from "../../../../services/officeScheduleApi";

/**
 * Office → Schedule tab. A weekly office-hours grid (Day | Day Start | Day Stop
 * | Lunch Start | Lunch Stop) backed by the office-setup schedule endpoints.
 *
 * day_of_week is an integer 0..6 where 0=Monday … 6=Sunday. The grid renders
 * the seven rows in that order. Times round-trip as "HH:MM:SS" on the wire and
 * "HH:MM" in the <input type="time"> controls (converted in officeScheduleApi).
 * A row with no start/stop (or "Closed" ticked) is saved as is_closed=true with
 * null times.
 */

type UiDay = {
  dayOfWeek: number;
  label: string;
  start: string;
  stop: string;
  lunchStart: string;
  lunchStop: string;
  closed: boolean;
};

/** Stable UI enum: the seven weekday rows in display order, 0=Monday … 6=Sunday. */
const DAY_ROWS: { dayOfWeek: number; label: string }[] = [
  { dayOfWeek: 0, label: "Monday" },
  { dayOfWeek: 1, label: "Tuesday" },
  { dayOfWeek: 2, label: "Wednesday" },
  { dayOfWeek: 3, label: "Thursday" },
  { dayOfWeek: 4, label: "Friday" },
  { dayOfWeek: 5, label: "Saturday" },
  { dayOfWeek: 6, label: "Sunday" },
];

/** Build the full 7-day UI set from the (already 7-row) API rows. */
function buildDays(rows: OfficeScheduleDayUi[]): UiDay[] {
  const byDow = new Map(rows.map((r) => [r.day_of_week, r]));
  return DAY_ROWS.map(({ dayOfWeek, label }) => {
    const row = byDow.get(dayOfWeek);
    if (!row) {
      return {
        dayOfWeek,
        label,
        start: "",
        stop: "",
        lunchStart: "",
        lunchStop: "",
        closed: true,
      };
    }
    return {
      dayOfWeek,
      label,
      start: row.start_time ?? "",
      stop: row.end_time ?? "",
      lunchStart: row.lunch_start ?? "",
      lunchStop: row.lunch_end ?? "",
      closed: Boolean(row.is_closed),
    };
  });
}

function toApi(days: UiDay[]): OfficeScheduleDayUi[] {
  return days.map((d) => {
    const closed = d.closed || !d.start || !d.stop;
    return {
      day_of_week: d.dayOfWeek,
      is_closed: closed,
      start_time: closed ? null : d.start,
      end_time: closed ? null : d.stop,
      lunch_start: closed || !d.lunchStart ? null : d.lunchStart,
      lunch_end: closed || !d.lunchStop ? null : d.lunchStop,
    };
  });
}

type ScheduleTabProps = {
  officeId: number;
};

export default function ScheduleTab({ officeId }: ScheduleTabProps) {
  const [days, setDays] = useState<UiDay[]>(() => buildDays([]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchOfficeSchedule(officeId);
      setDays(buildDays(rows));
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Failed to load schedule";
      toast.error("Could not load schedule", { description: msg });
      setDays(buildDays([]));
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateDay = (dayOfWeek: number, field: keyof UiDay, value: string | boolean) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const next: UiDay = { ...d, [field]: value };
        // Toggling closed clears the row's times so a blank row == closed.
        if (field === "closed" && value === true) {
          next.start = "";
          next.stop = "";
          next.lunchStart = "";
          next.lunchStop = "";
        }
        return next;
      })
    );
  };

  const copyMonday = () => {
    setDays((prev) => {
      const monday = prev.find((d) => d.dayOfWeek === 0);
      if (!monday) return prev;
      const weekdays = [1, 2, 3, 4]; // Tue..Fri
      return prev.map((d) =>
        weekdays.includes(d.dayOfWeek)
          ? {
              ...d,
              start: monday.start,
              stop: monday.stop,
              lunchStart: monday.lunchStart,
              lunchStop: monday.lunchStop,
              closed: monday.closed,
            }
          : d
      );
    });
    toast.success("Copied Monday hours to weekdays");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOfficeSchedule(officeId, toApi(days));
      toast.success("Schedule saved", { description: "Office hours updated successfully." });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Request failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading schedule…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {saving && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      {/* Guidelines */}
      <div className="flex items-start gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-bold">Office Schedule Guidelines:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Defines working hours for the office</li>
            <li>Scheduler blocks bookings outside these hours</li>
            <li>Lunch time blocks availability</li>
            <li>Mark a day "Closed" (or leave it blank) for non-working days</li>
          </ul>
        </div>
      </div>

      {/* Copy Monday Helper */}
      <div className="flex justify-end">
        <button
          onClick={copyMonday}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] text-[#1E293B] border-2 border-[#E2E8F0] rounded-lg hover:bg-[#E2E8F0] text-sm font-bold transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy Monday to Weekdays
        </button>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg border-2 border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Day</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Day Start</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Day Stop</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Lunch Start</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Lunch Stop</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Closed</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day, index) => (
                <tr
                  key={day.dayOfWeek}
                  className={`border-b border-[#E2E8F0] transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-bold text-[#1E293B] whitespace-nowrap">
                    {day.label}
                  </td>
                  {(["start", "stop", "lunchStart", "lunchStop"] as const).map((field) => (
                    <td key={field} className="px-4 py-3">
                      <input
                        type="time"
                        value={day[field]}
                        disabled={day.closed}
                        onChange={(e) => updateDay(day.dayOfWeek, field, e.target.value)}
                        className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                          day.closed
                            ? "border-[#E2E8F0] bg-[#F7F9FC] text-[#94A3B8] cursor-not-allowed"
                            : "border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.closed}
                        onChange={(e) => updateDay(day.dayOfWeek, "closed", e.target.checked)}
                        className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                      />
                      <span className="text-xs font-bold text-[#64748B]">Closed</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className={`${components.buttonPrimary} inline-flex items-center gap-2 ${
            saving ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Save className="w-4 h-4" />
          Save Schedule
        </button>
      </div>
    </div>
  );
}

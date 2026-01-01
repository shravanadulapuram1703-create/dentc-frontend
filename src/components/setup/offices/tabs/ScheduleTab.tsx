import { Clock, Copy } from "lucide-react";
import { type Office } from "../../../../data/officeData";

interface ScheduleTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
}

type DayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const DAYS: { key: DayName; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function ScheduleTab({
  formData,
  updateFormData,
}: ScheduleTabProps) {
  const schedule = formData.schedule || {};

  const updateDay = (day: DayName, field: string, value: string | boolean) => {
    updateFormData({
      schedule: {
        ...schedule,
        [day]: {
          ...schedule[day],
          [field]: value,
        },
      } as any,
    });
  };

  const copyMonday = () => {
    const monday = schedule.monday;
    if (!monday) return;

    const newSchedule = { ...schedule };
    ["tuesday", "wednesday", "thursday", "friday"].forEach((day) => {
      newSchedule[day as DayName] = { ...monday };
    });

    updateFormData({ schedule: newSchedule as any });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Office Schedule Guidelines:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Defines working hours for the office</li>
            <li>Scheduler blocks bookings outside these hours</li>
            <li>Lunch time blocks availability</li>
            <li>Use "Closed" for non-working days</li>
          </ul>
        </div>
      </div>

      {/* Copy Monday Helper */}
      <div className="flex justify-end">
        <button
          onClick={copyMonday}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold"
        >
          <Copy className="w-4 h-4" />
          Copy Monday to Weekdays
        </button>
      </div>

      {/* Days Schedule */}
      <div className="space-y-4">
        {DAYS.map((day) => {
          const daySchedule = schedule[day.key] || {
            start: "",
            end: "",
            lunchStart: "",
            lunchEnd: "",
            closed: false,
          };

          return (
            <div
              key={day.key}
              className="p-4 bg-white border-2 border-slate-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900">{day.label}</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={daySchedule.closed}
                    onChange={(e) =>
                      updateDay(day.key, "closed", e.target.checked)
                    }
                    className="w-4 h-4 text-red-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    Closed
                  </span>
                </label>
              </div>

              {!daySchedule.closed && (
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Day Start
                    </label>
                    <input
                      type="time"
                      value={daySchedule.start}
                      onChange={(e) =>
                        updateDay(day.key, "start", e.target.value)
                      }
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Day End
                    </label>
                    <input
                      type="time"
                      value={daySchedule.end}
                      onChange={(e) => updateDay(day.key, "end", e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Lunch Start
                    </label>
                    <input
                      type="time"
                      value={daySchedule.lunchStart}
                      onChange={(e) =>
                        updateDay(day.key, "lunchStart", e.target.value)
                      }
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Lunch End
                    </label>
                    <input
                      type="time"
                      value={daySchedule.lunchEnd}
                      onChange={(e) =>
                        updateDay(day.key, "lunchEnd", e.target.value)
                      }
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {daySchedule.closed && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 font-medium">
                    Office closed on {day.label}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

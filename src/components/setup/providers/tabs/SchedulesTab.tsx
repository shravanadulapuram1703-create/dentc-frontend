import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Copy, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import {
  getProviderSchedule,
  setProviderSchedule,
} from "@/api/generated/endpoints/provider-setup/provider-setup";
// Provider schedules use the provider-setup day shape (it carries `effective_from`
// and a per-office scope); the office-setup screens use the generic ScheduleDayInput.
import type {
  OfficeRead,
  ProviderScheduleDayRead,
  ScheduleDayInput,
} from "@/api/generated/model";

interface SchedulesTabProps {
  providerId: string;
}

/** 0=Mon … 6=Sun, matching the backend's ScheduleDayInput.day_of_week. */
const DAY_ROWS: { dow: number; label: string }[] = [
  { dow: 0, label: "Monday" },
  { dow: 1, label: "Tuesday" },
  { dow: 2, label: "Wednesday" },
  { dow: 3, label: "Thursday" },
  { dow: 4, label: "Friday" },
  { dow: 5, label: "Saturday" },
  { dow: 6, label: "Sunday" },
];

type UiDay = {
  dow: number;
  start: string;
  stop: string;
  lunchStart: string;
  lunchStop: string;
  closed: boolean;
};

/** A schedule scope: a weekly grid + effective-from for one office (or all offices). */
type Scope = { effectiveFrom: string; days: UiDay[] };

const ALL = "all"; // scope key for office_id = null (applies to every office)

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");
const blankWeek = (): UiDay[] =>
  DAY_ROWS.map((d) => ({ dow: d.dow, start: "", stop: "", lunchStart: "", lunchStop: "", closed: true }));

function rowsToScope(rows: ProviderScheduleDayRead[]): Scope {
  const byDow = new Map(rows.map((r) => [r.day_of_week, r]));
  const effectiveFrom = rows.find((r) => r.effective_from)?.effective_from ?? "";
  const days = DAY_ROWS.map(({ dow }) => {
    const r = byDow.get(dow);
    return {
      dow,
      start: hhmm(r?.start_time),
      stop: hhmm(r?.end_time),
      lunchStart: hhmm(r?.lunch_start),
      lunchStop: hhmm(r?.lunch_end),
      closed: r ? Boolean(r.is_closed) : true,
    };
  });
  return { effectiveFrom: effectiveFrom ? effectiveFrom.slice(0, 10) : "", days };
}

export default function SchedulesTab({ providerId }: SchedulesTabProps) {
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  // scopeKey ("all" | office_id) -> Scope. Holds every scope loaded/edited so the
  // full-replace PUT preserves scopes the user didn't touch.
  const [scopes, setScopes] = useState<Map<string, Scope>>(new Map());
  const [scopeKey, setScopeKey] = useState<string>(ALL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offRes, rows] = await Promise.all([
        listOffices({ size: 200 }),
        getProviderSchedule(providerId),
      ]);
      setOffices(offRes.items ?? []);
      // Group rows by scope (office_id ?? "all").
      const grouped = new Map<string, ProviderScheduleDayRead[]>();
      for (const r of rows) {
        const key = r.office_id == null ? ALL : String(r.office_id);
        (grouped.get(key) ?? grouped.set(key, []).get(key)!).push(r);
      }
      const next = new Map<string, Scope>();
      for (const [key, rs] of grouped) next.set(key, rowsToScope(rs));
      if (!next.has(ALL)) next.set(ALL, { effectiveFrom: "", days: blankWeek() });
      setScopes(next);
      setScopeKey(ALL);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = scopes.get(scopeKey) ?? { effectiveFrom: "", days: blankWeek() };

  const setCurrent = (updater: (s: Scope) => Scope) =>
    setScopes((prev) => {
      const next = new Map(prev);
      next.set(scopeKey, updater(prev.get(scopeKey) ?? { effectiveFrom: "", days: blankWeek() }));
      return next;
    });

  const updateDay = (dow: number, field: keyof UiDay, value: string | boolean) =>
    setCurrent((s) => ({
      ...s,
      days: s.days.map((d) => {
        if (d.dow !== dow) return d;
        const nd: UiDay = { ...d, [field]: value };
        if (field === "closed" && value === true) {
          nd.start = nd.stop = nd.lunchStart = nd.lunchStop = "";
        }
        return nd;
      }),
    }));

  const copyMonday = () =>
    setCurrent((s) => {
      const mon = s.days.find((d) => d.dow === 0);
      if (!mon) return s;
      return {
        ...s,
        days: s.days.map((d) =>
          [1, 2, 3, 4].includes(d.dow)
            ? { ...d, start: mon.start, stop: mon.stop, lunchStart: mon.lunchStart, lunchStop: mon.lunchStop, closed: mon.closed }
            : d,
        ),
      };
    });

  const officeName = useCallback(
    (id: string) => (id === ALL ? "All Offices" : offices.find((o) => String(o.id) === id)?.name ?? `Office ${id}`),
    [offices],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // Flatten every scope into one ScheduleDayInput[] (the PUT replaces the full set).
      const days: ScheduleDayInput[] = [];
      for (const [key, scope] of scopes) {
        const officeId = key === ALL ? null : Number(key);
        for (const d of scope.days) {
          const closed = d.closed || !d.start || !d.stop;
          // Skip fully-empty rows for non-default scopes to avoid persisting noise.
          if (key !== ALL && closed && !d.start && !d.stop) continue;
          days.push({
            day_of_week: d.dow,
            is_closed: closed,
            start_time: closed ? null : d.start,
            end_time: closed ? null : d.stop,
            lunch_start: closed || !d.lunchStart ? null : d.lunchStart,
            lunch_end: closed || !d.lunchStop ? null : d.lunchStop,
            effective_from: scope.effectiveFrom || null,
            office_id: officeId,
          });
        }
      }
      await setProviderSchedule(providerId, { days });
      toast.success("Schedule saved");
      await load();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save schedule",
      });
    } finally {
      setSaving(false);
    }
  };

  // Scope dropdown: All Offices + every office (so a per-office override can be added).
  const scopeOptions = useMemo(
    () => [{ key: ALL, label: "All Offices (default)" }, ...offices.map((o) => ({ key: String(o.id), label: `${o.name} (${o.id})` }))],
    [offices],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load schedule</p>
        <p className="text-xs text-[#64748B] max-w-md">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading schedule…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {saving && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">
          Provider working hours by day. Pick a scope to set hours for all offices (default) or override
          a specific office. Effective-from applies to the selected scope. Saving replaces the provider's
          full schedule.
        </p>
      </div>

      {/* Scope + effective-from */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Scope</label>
          <select
            value={scopeKey}
            onChange={(e) => {
              const k = e.target.value;
              setScopes((prev) => (prev.has(k) ? prev : new Map(prev).set(k, { effectiveFrom: "", days: blankWeek() })));
              setScopeKey(k);
            }}
            className="px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
          >
            {scopeOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Effective From</label>
          <input
            type="date"
            value={current.effectiveFrom}
            onChange={(e) => setCurrent((s) => ({ ...s, effectiveFrom: e.target.value }))}
            className="px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
          />
        </div>
        <button
          onClick={copyMonday}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] text-[#1E293B] border-2 border-[#E2E8F0] rounded-lg hover:bg-[#E2E8F0] text-sm font-bold transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy Monday to Weekdays
        </button>
      </div>

      <p className="text-xs text-[#64748B] font-bold">Editing scope: {officeName(scopeKey)}</p>

      {/* Grid */}
      <div className="bg-white rounded-lg border-2 border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Day", "Day Start", "Day Stop", "Lunch Start", "Lunch Stop", "Closed"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.days.map((day, index) => (
                <tr
                  key={day.dow}
                  className={`border-b border-[#E2E8F0] ${index % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"}`}
                >
                  <td className="px-4 py-3 text-sm font-bold text-[#1E293B] whitespace-nowrap">
                    {DAY_ROWS[index]?.label ?? ""}
                  </td>
                  {(["start", "stop", "lunchStart", "lunchStop"] as const).map((field) => (
                    <td key={field} className="px-4 py-3">
                      <input
                        type="time"
                        value={day[field]}
                        disabled={day.closed}
                        onChange={(e) => updateDay(day.dow, field, e.target.value)}
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
                        onChange={(e) => updateDay(day.dow, "closed", e.target.checked)}
                        className="w-4 h-4"
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

      <div className="flex justify-end">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Save Schedule
        </button>
      </div>
    </div>
  );
}

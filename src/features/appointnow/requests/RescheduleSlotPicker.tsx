// RescheduleSlotPicker — every open time for a day, shown inside the inbox's
// "Reschedule before booking" panel so staff pick a free slot instead of
// guessing a time and bouncing off the 409 slot_conflict dialog.
//
// Uses the same availability engine as the public page (office hours, provider
// schedules, holidays, booked appointments, live holds), queried ONCE PER
// OPERATORY so each slot carries its chair: a reschedule without a chair keeps
// the request's original operatory server-side, which may be the busy one.
// Offices with no operatories fall back to one unfiltered query.

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getBookingTransport } from "../bookingService";
import type { AvailableSlot, PublicOperatory } from "../transport/types";
import { addDaysIso, formatDateLong, formatTime12, todayIso } from "../public/bookingUtils";

interface ChairSlots {
  operatory_id: string | null;
  operatory_name: string;
  slots: AvailableSlot[];
}

/** Public chairs per office code (stable for the session — fetched once). */
const operatoriesCache = new Map<string, Promise<PublicOperatory[]>>();

function loadOperatories(office_code: string): Promise<PublicOperatory[]> {
  let p = operatoriesCache.get(office_code);
  if (!p) {
    p = getBookingTransport()
      .getOfficeInfo(office_code)
      .then((info) => info.operatories ?? [])
      .catch((e: unknown) => {
        operatoriesCache.delete(office_code);
        throw e;
      });
    operatoriesCache.set(office_code, p);
  }
  return p;
}

export default function RescheduleSlotPicker({
  office_code,
  date,
  duration_minutes,
  selected,
  onDateChange,
  onSelect,
}: {
  office_code: string;
  date: string;
  duration_minutes: number;
  /** The slot currently picked (highlighted). */
  selected: AvailableSlot | null;
  onDateChange: (date: string) => void;
  onSelect: (slot: AvailableSlot) => void;
}) {
  const [chairs, setChairs] = useState<ChairSlots[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const transport = getBookingTransport();
    (async () => {
      const operatories = await loadOperatories(office_code);
      if (operatories.length === 0) {
        const slots = await transport.getAvailability({ office_code, date, duration_minutes });
        return [{ operatory_id: null, operatory_name: "Any operatory", slots }];
      }
      return Promise.all(
        operatories.map(async (op) => ({
          operatory_id: op.id,
          operatory_name: op.name,
          slots: await transport.getAvailability({
            office_code,
            date,
            duration_minutes,
            operatory_id: op.id,
          }),
        })),
      );
    })()
      .then((rows) => {
        if (!cancelled) setChairs(rows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setChairs([]);
        setError(e instanceof Error ? e.message : "Could not load open times.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [office_code, date, duration_minutes]);

  const today = todayIso();
  const total = chairs.reduce((n, c) => n + c.slots.length, 0);
  const isSelected = (s: AvailableSlot) =>
    selected != null &&
    selected.date === s.date &&
    selected.start_time === s.start_time &&
    (selected.operatory_id ?? null) === (s.operatory_id ?? null);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3" data-testid="appointnow-reschedule-slots">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onDateChange(addDaysIso(date, -1))}
          disabled={date <= today}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center text-sm font-semibold text-slate-800">
          Available times · {formatDateLong(date)}
          {!loading && !error && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              {total} open {total === 1 ? "slot" : "slots"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDateChange(addDaysIso(date, 1))}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding open times…
        </div>
      ) : error ? (
        <p className="py-4 text-center text-sm text-red-600">{error}</p>
      ) : total === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">
          No open times on this day. Try another date, or enter a time below.
        </p>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {chairs
            .filter((c) => c.slots.length > 0)
            .map((c) => (
              <div key={c.operatory_id ?? "any"}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {c.operatory_name}
                  <span className="ml-1.5 font-normal normal-case text-slate-400">
                    ({c.slots.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.slots.map((s) => {
                    const active = isSelected(s);
                    return (
                      <button
                        key={s.start_time}
                        type="button"
                        onClick={() => onSelect(s)}
                        title={s.provider_name ? `With ${s.provider_name}` : undefined}
                        className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                          active
                            ? "border-[#3A6EA5] bg-[#3A6EA5] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-[#3A6EA5] hover:text-[#3A6EA5]"
                        }`}
                      >
                        {formatTime12(s.start_time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Office Setup → Schedule data access — office-scoped wrappers over the
 * generated client (NO raw axios).
 *
 * Backend contract (office-setup endpoints):
 *   GET /api/v1/offices/{officeId}/schedule
 *     -> OfficeScheduleDayRead[] (array of day rows; missing days may be absent)
 *   PUT /api/v1/offices/{officeId}/schedule
 *     body ScheduleReplace { days: ScheduleDayInput[] } (1..7) — full replace
 *     -> OfficeScheduleDayRead[]
 *
 * day_of_week is an integer 0..6 where 0=Monday … 6=Sunday.
 * Times are "HH:MM:SS" strings (or null). The UI grid uses <input type="time">
 * ("HH:MM"); seconds are stripped on load and ":00" is appended on save.
 */
import {
  getOfficeSchedule,
  setOfficeSchedule,
} from "@/api/generated/endpoints/office-setup/office-setup";
import type {
  OfficeScheduleDayRead,
  ScheduleDayInput,
  ScheduleReplace,
} from "@/api/generated/model";

/**
 * One day of the office schedule as consumed by the UI. Times are "HH:MM"
 * strings (no seconds) or null. `is_closed` true (or null times) marks a
 * non-working day. `day_of_week` is 0=Monday … 6=Sunday.
 */
export type OfficeScheduleDayUi = {
  day_of_week: number;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
};

/** The seven day_of_week indices, Monday(0) … Sunday(6). */
export const DAY_OF_WEEK_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

/** Strip seconds: "HH:MM:SS" / "HH:MM:SS.ffffff" -> "HH:MM"; null/"" -> null. */
function toUiTime(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return value.slice(0, 5);
}

/** Append seconds for the API: "HH:MM" -> "HH:MM:00"; empty/null -> null. */
function toApiTime(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  // Already has seconds — leave as-is; otherwise normalize "HH:MM" to "HH:MM:00".
  return value.length >= 8 ? value : `${value.slice(0, 5)}:00`;
}

/**
 * GET the office schedule and map it into the fixed 7 UI rows (Mon..Sun).
 * Any day_of_week not returned by the backend defaults to closed with null
 * times.
 */
export async function fetchOfficeSchedule(
  officeId: number
): Promise<OfficeScheduleDayUi[]> {
  const rows = await getOfficeSchedule(officeId);
  const byDow = new Map<number, OfficeScheduleDayRead>();
  for (const row of rows ?? []) {
    byDow.set(row.day_of_week, row);
  }

  return DAY_OF_WEEK_VALUES.map((dow) => {
    const row = byDow.get(dow);
    if (!row) {
      return {
        day_of_week: dow,
        is_closed: true,
        start_time: null,
        end_time: null,
        lunch_start: null,
        lunch_end: null,
      };
    }
    return {
      day_of_week: dow,
      is_closed: Boolean(row.is_closed),
      start_time: toUiTime(row.start_time),
      end_time: toUiTime(row.end_time),
      lunch_start: toUiTime(row.lunch_start),
      lunch_end: toUiTime(row.lunch_end),
    };
  });
}

/**
 * PUT the full 7-day schedule (idempotent replace). Builds ScheduleReplace from
 * all 7 UI rows, converting "HH:MM" inputs to "HH:MM:SS" and treating empty
 * inputs as null. Returns the persisted rows.
 */
export async function saveOfficeSchedule(
  officeId: number,
  days: OfficeScheduleDayUi[]
): Promise<OfficeScheduleDayRead[]> {
  const inputDays: ScheduleDayInput[] = days.map((d) => ({
    day_of_week: d.day_of_week,
    is_closed: d.is_closed,
    start_time: d.is_closed ? null : toApiTime(d.start_time),
    end_time: d.is_closed ? null : toApiTime(d.end_time),
    lunch_start: d.is_closed ? null : toApiTime(d.lunch_start),
    lunch_end: d.is_closed ? null : toApiTime(d.lunch_end),
  }));

  const body: ScheduleReplace = { days: inputDays };
  return setOfficeSchedule(officeId, body);
}

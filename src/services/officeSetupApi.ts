/**
 * Office Setup data access — office-scoped Holidays wrappers.
 *
 * Backed by the deployed DentC Backend office-holiday endpoints, wrapping the
 * generated Orval client (no raw axios). The office holiday family mirrors the
 * account holiday family and reuses the same payload/response models
 * (AccountHoliday*, HolidayBulkDelete, FederalHolidaysImport, HolidayRangeCreate):
 *   GET    /api/v1/offices/{officeId}/holidays
 *   POST   /api/v1/offices/{officeId}/holidays
 *   PATCH  /api/v1/offices/{officeId}/holidays/{holidayId}
 *   DELETE /api/v1/offices/{officeId}/holidays/{holidayId}
 *   POST   /api/v1/offices/{officeId}/holidays/bulk-delete   body { ids }
 *   POST   /api/v1/offices/{officeId}/holidays/federal       body { year }
 *   POST   /api/v1/offices/{officeId}/holidays/range         body { from_date, to_date, name }
 *
 * The exported function names/signatures are kept stable so `tabs/HolidaysTab.tsx`
 * is unchanged.
 */
import {
  listOfficeHolidays,
  createOfficeHoliday as genCreateOfficeHoliday,
  updateOfficeHoliday as genUpdateOfficeHoliday,
  deleteOfficeHoliday as genDeleteOfficeHoliday,
  bulkDeleteOfficeHolidays as genBulkDeleteOfficeHolidays,
  importOfficeFederalHolidays as genImportOfficeFederalHolidays,
  createOfficeHolidayRange as genCreateOfficeHolidayRange,
} from "@/api/generated/endpoints/office-setup/office-setup";
import type { AccountHolidayRead } from "@/api/generated/model";

/** Row shape consumed by HolidaysTab (snake_case, mirrors the account family). */
export type OfficeHolidayApiRow = {
  id: string;
  office_id?: string;
  holiday_date: string;
  holiday_name: string;
  status: string;
  holiday_type: string;
  is_recurring: boolean;
};

function mapRow(h: AccountHolidayRead): OfficeHolidayApiRow {
  return {
    id: String(h.id),
    holiday_date: String(h.holiday_date ?? ""),
    holiday_name: String(h.holiday_name ?? ""),
    status: String(h.status ?? ""),
    holiday_type: String(h.holiday_type ?? ""),
    is_recurring: Boolean(h.is_recurring),
  };
}

export async function fetchOfficeHolidays(officeId: number): Promise<OfficeHolidayApiRow[]> {
  const rows = await listOfficeHolidays(officeId);
  return (rows ?? []).map(mapRow);
}

export async function createOfficeHoliday(
  officeId: number,
  body: { holiday_date: string; holiday_name: string; status: string; holiday_type: string; is_recurring: boolean }
) {
  return genCreateOfficeHoliday(officeId, body);
}

export async function updateOfficeHoliday(
  officeId: number,
  holidayId: string,
  body: Partial<{
    holiday_date: string;
    holiday_name: string;
    status: string;
    holiday_type: string;
    is_recurring: boolean;
  }>
) {
  return genUpdateOfficeHoliday(officeId, Number(holidayId), body as never);
}

export async function deleteOfficeHoliday(officeId: number, holidayId: string) {
  await genDeleteOfficeHoliday(officeId, Number(holidayId));
}

export async function bulkDeleteOfficeHolidays(officeId: number, ids: string[]) {
  await genBulkDeleteOfficeHolidays(officeId, { ids: ids.map((i) => Number(i)) });
}

export async function importOfficeFederalHolidays(officeId: number, year: number) {
  return genImportOfficeFederalHolidays(officeId, { year } as never);
}

export async function addOfficeHolidayRange(
  officeId: number,
  body: { fromDate: string; toDate: string; name: string }
) {
  return genCreateOfficeHolidayRange(officeId, {
    from_date: body.fromDate,
    to_date: body.toDate,
    name: body.name,
  } as never);
}

/**
 * Phone Number Assignment model (Account Setup → Communications).
 *
 * Row shape + helpers shared by the editor and the tab's load/save path.
 * Field names are the backend's snake_case (`PhoneAssignmentInput`).
 */
import type { OfficeRead } from '@/api/generated/model/officeRead';
import type { OfficePhoneAssignmentRead } from '@/api/generated/model/officePhoneAssignmentRead';
import type { PhoneAssignmentInput } from '@/api/generated/model/phoneAssignmentInput';
import { toE164 } from '@/features/sms/phone';

export type PhoneAssignmentType = 'OFFICE_SPECIFIC' | 'MULTI_OFFICE_SHARED';

/** `''` assignment_type = office has no phone assignment (row is omitted from the PUT). */
export type PhoneAssignmentRow = {
  office_id: number;
  office_name: string;
  assignment_type: PhoneAssignmentType | '';
  phone_number: string;
  is_model_office: boolean;
};

export const ASSIGNMENT_TYPE_LABEL: Record<PhoneAssignmentType, string> = {
  OFFICE_SPECIFIC: 'Office-specific number',
  MULTI_OFFICE_SHARED: 'Multi-office shared number',
};

/** Twilio toll-free verification allows at most this many office-specific numbers. */
export const MAX_OFFICE_SPECIFIC = 5;

/** Labels for `SmsSenderResolution.source`. */
export const SENDER_SOURCE_LABEL: Record<string, string> = {
  office_specific: 'Office-specific number',
  multi_office_shared: 'Multi-office shared number',
  tenant_default: 'Tenant default',
  platform_default: 'Platform default',
  none: 'No sender configured',
};

export function isAssignmentType(value: string): value is PhoneAssignmentType {
  return value === 'OFFICE_SPECIFIC' || value === 'MULTI_OFFICE_SHARED';
}

/**
 * One editable row per office (sorted by name), merged with the persisted
 * assignments. Assignments whose office is missing from the office list (e.g.
 * an inactive office) are kept so a PUT never silently drops them.
 */
export function buildPhoneAssignmentRows(
  offices: OfficeRead[],
  assignments: OfficePhoneAssignmentRead[],
): PhoneAssignmentRow[] {
  const byOffice = new Map<number, OfficePhoneAssignmentRead>();
  for (const a of assignments) byOffice.set(a.office_id, a);

  const rows: PhoneAssignmentRow[] = [...offices]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((o) => {
      const a = byOffice.get(o.id);
      byOffice.delete(o.id);
      return {
        office_id: o.id,
        office_name: o.name,
        assignment_type: a && isAssignmentType(a.assignment_type) ? a.assignment_type : '',
        phone_number: a?.phone_number ?? '',
        is_model_office: Boolean(a?.is_model_office),
      };
    });

  for (const a of byOffice.values()) {
    rows.push({
      office_id: a.office_id,
      office_name: `Office #${a.office_id}`,
      assignment_type: isAssignmentType(a.assignment_type) ? a.assignment_type : '',
      phone_number: a.phone_number ?? '',
      is_model_office: Boolean(a.is_model_office),
    });
  }
  return rows;
}

/** Full replacement payload for `PUT /tenants/{id}/phone-assignments`. */
export function toPhoneAssignmentInputs(rows: PhoneAssignmentRow[]): PhoneAssignmentInput[] {
  return rows
    .filter((r) => r.assignment_type !== '')
    .map((r) => ({
      office_id: r.office_id,
      assignment_type: r.assignment_type,
      phone_number: toE164(r.phone_number),
      is_model_office: r.is_model_office,
    }));
}

/** Returns a user-facing error, or `null` when the rows can be saved. */
export function validatePhoneAssignmentRows(rows: PhoneAssignmentRow[]): string | null {
  const assigned = rows.filter((r) => r.assignment_type !== '');
  const missing = assigned.filter((r) => !toE164(r.phone_number));
  if (missing.length > 0) {
    return `Enter a valid Twilio number in E.164 format (+1…) for: ${missing.map((r) => r.office_name).join(', ')}`;
  }
  const specific = assigned.filter((r) => r.assignment_type === 'OFFICE_SPECIFIC');
  if (specific.length > MAX_OFFICE_SPECIFIC) {
    return `Maximum ${MAX_OFFICE_SPECIFIC} offices allowed for Office-Specific Number (Twilio toll-free limit)`;
  }
  return null;
}

/**
 * Phone Number Assignment editor (Account Setup → Communications).
 *
 * One row per office. Each row picks an `assignment_type` and the Twilio
 * number (`phone_number`, stored in E.164) the office sends SMS from, plus the
 * `is_model_office` flag. The "Resolved sender" column mirrors what the SMS
 * gateway will actually use (`GET /api/v1/sms/sender?office_id=`), so the user
 * can see fallbacks (tenant/platform default) and gaps ("none") at a glance.
 *
 * Row shape + load/save helpers live in phoneAssignmentModel.ts.
 */
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { SmsSenderResolution } from '@/api/generated/model/smsSenderResolution';
import { formatPhone, toE164 } from '@/features/sms/phone';
import {
  ASSIGNMENT_TYPE_LABEL,
  MAX_OFFICE_SPECIFIC,
  SENDER_SOURCE_LABEL,
  isAssignmentType,
  type PhoneAssignmentRow,
} from './phoneAssignmentModel';

type PhoneAssignmentEditorProps = {
  rows: PhoneAssignmentRow[];
  onChange: (rows: PhoneAssignmentRow[]) => void;
  isEditMode: boolean;
  /** `office_id` → resolution from `GET /sms/sender`. */
  senderByOffice: Record<number, SmsSenderResolution | undefined>;
  sendersLoading: boolean;
};

export function PhoneAssignmentEditor({
  rows,
  onChange,
  isEditMode,
  senderByOffice,
  sendersLoading,
}: PhoneAssignmentEditorProps) {
  const officeSpecificCount = rows.filter((r) => r.assignment_type === 'OFFICE_SPECIFIC').length;
  const sharedNumber =
    rows.find((r) => r.assignment_type === 'MULTI_OFFICE_SHARED' && toE164(r.phone_number))?.phone_number ?? '';

  const patchRow = (office_id: number, patch: Partial<PhoneAssignmentRow>) => {
    onChange(rows.map((r) => (r.office_id === office_id ? { ...r, ...patch } : r)));
  };

  const changeType = (row: PhoneAssignmentRow, value: string) => {
    const assignment_type: PhoneAssignmentRow['assignment_type'] = isAssignmentType(value) ? value : '';
    const patch: Partial<PhoneAssignmentRow> = { assignment_type };
    // Convenience: a newly-shared office inherits the shared number already in use.
    if (assignment_type === 'MULTI_OFFICE_SHARED' && !row.phone_number.trim() && sharedNumber) {
      patch.phone_number = sharedNumber;
    }
    patchRow(row.office_id, patch);
  };

  const normalizeNumber = (row: PhoneAssignmentRow) => {
    const e164 = toE164(row.phone_number);
    if (e164 && e164 !== row.phone_number) patchRow(row.office_id, { phone_number: e164 });
  };

  const inputClass = (invalid: boolean) =>
    `w-full px-2 py-1.5 border-2 rounded text-sm ${
      isEditMode
        ? invalid
          ? 'border-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
          : 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
        : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
    }`;

  return (
    <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]" data-testid="phone-assignment-editor">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-xs text-blue-900">
          <span className="font-bold">Twilio &ldquo;From&rdquo; number per office.</span> Enter numbers in E.164 format
          (e.g. <span className="font-mono">+14125551234</span>). Offices without an assignment fall back to the tenant
          or platform default. Maximum {MAX_OFFICE_SPECIFIC} offices for Office-Specific Number (Twilio toll-free
          limit). Office-specific: {officeSpecificCount}/{MAX_OFFICE_SPECIFIC}.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full text-sm bg-white border-2 border-[#CBD5E1] rounded-lg"
          data-testid="phone-assignment-table"
        >
          <thead>
            <tr className="bg-[#EEF2F7] text-xs font-bold text-[#1E293B] text-left">
              <th className="px-3 py-2">Office</th>
              <th className="px-3 py-2">Assignment</th>
              <th className="px-3 py-2">Twilio number (E.164)</th>
              <th className="px-3 py-2 text-center">Model office</th>
              <th className="px-3 py-2">
                Resolved sender
                {sendersLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin text-[#3A6EA5]" />}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-xs text-[#64748B]">
                  No offices found
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const assigned = row.assignment_type !== '';
              const e164 = toE164(row.phone_number);
              const invalid = assigned && !e164;
              const sender = senderByOffice[row.office_id];
              return (
                <tr
                  key={row.office_id}
                  className="border-t border-[#E2E8F0] align-middle"
                  data-testid={`phone-assignment-row-${row.office_id}`}
                >
                  <td className="px-3 py-2">
                    <div className="font-bold text-xs text-[#1E293B]">{row.office_name}</div>
                    <div className="text-[11px] text-[#94A3B8]">ID {row.office_id}</div>
                  </td>
                  <td className="px-3 py-2 min-w-[200px]">
                    {isEditMode ? (
                      <select
                        value={row.assignment_type}
                        onChange={(e) => changeType(row, e.target.value)}
                        className={inputClass(false)}
                        aria-label={`Assignment type for ${row.office_name}`}
                      >
                        <option value="">Not assigned</option>
                        <option value="OFFICE_SPECIFIC">{ASSIGNMENT_TYPE_LABEL.OFFICE_SPECIFIC}</option>
                        <option value="MULTI_OFFICE_SHARED">{ASSIGNMENT_TYPE_LABEL.MULTI_OFFICE_SHARED}</option>
                      </select>
                    ) : (
                      <span className={`text-xs ${assigned ? 'text-[#1E293B] font-bold' : 'text-[#94A3B8]'}`}>
                        {row.assignment_type !== '' ? ASSIGNMENT_TYPE_LABEL[row.assignment_type] : 'Not assigned'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 min-w-[180px]">
                    {isEditMode ? (
                      <>
                        <input
                          type="tel"
                          value={row.phone_number}
                          onChange={(e) => patchRow(row.office_id, { phone_number: e.target.value })}
                          onBlur={() => normalizeNumber(row)}
                          disabled={!assigned}
                          placeholder="+14125551234"
                          className={`${inputClass(invalid)} font-mono disabled:bg-[#F7F9FC] disabled:text-[#94A3B8]`}
                          aria-label={`Twilio number for ${row.office_name}`}
                          aria-invalid={invalid}
                        />
                        {invalid && (
                          <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Valid E.164 number required
                          </p>
                        )}
                      </>
                    ) : e164 ? (
                      <div>
                        <div className="text-xs font-bold text-[#1E293B]">{formatPhone(e164)}</div>
                        <div className="text-[11px] font-mono text-[#64748B]">{e164}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">&mdash;</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_model_office}
                      disabled={!isEditMode || !assigned}
                      onChange={(e) => patchRow(row.office_id, { is_model_office: e.target.checked })}
                      className="w-4 h-4 accent-[#3A6EA5]"
                      aria-label={`Model office: ${row.office_name}`}
                    />
                  </td>
                  <td className="px-3 py-2 min-w-[200px]">
                    {sender ? (
                      sender.from_phone || sender.messaging_service_sid ? (
                        <div className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-mono text-[#1E293B]">
                              {sender.from_phone ?? sender.messaging_service_sid}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {SENDER_SOURCE_LABEL[sender.source] ?? sender.source}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          {SENDER_SOURCE_LABEL[sender.source] ?? sender.source}
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-[#94A3B8]">{sendersLoading ? 'Resolving…' : '—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isEditMode && (
        <p className="text-[11px] text-[#64748B] mt-2">
          Saving replaces the tenant&rsquo;s full assignment list. The Resolved sender column refreshes after save.
        </p>
      )}
    </div>
  );
}

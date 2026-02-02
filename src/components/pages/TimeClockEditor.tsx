/**
 * ==================================================================================
 * TIME CLOCK EDITOR
 * ==================================================================================
 * 
 * PURPOSE:
 * - Administrative correction interface
 * - Edit existing time entries
 * - Add/remove time segments (breaks, split shifts)
 * - Maintain audit trail
 * 
 * ACCESS:
 * - Utilities → User Functions → TimeClockEditor
 * - Restricted to Admin/Manager roles
 * 
 * FUNCTIONALITY:
 * - Select employee
 * - Select date
 * - Edit multiple time segments
 * - Add new lines (breaks)
 * - Delete lines
 * - Validate all entries
 * - Save with audit metadata
 * 
 * ==================================================================================
 */

import { useState } from 'react';
import { Save, X, Plus, Trash2, AlertCircle, Calendar, User } from 'lucide-react';
import {
  TimeClockEntry,
  TimeClockValidationError,
  validateTimeClockEntry,
  calculateTotalMinutes,
  formatMinutesAsTime,
  getCurrentDate,
  MOCK_TIME_CLOCK_ENTRIES,
  MOCK_USERS,
  User as UserType,
} from '../../data/timeClockData';

interface TimeEntryRow {
  tempId: string;
  clockIn: string;
  clockOut: string;
  officeInId: string;
  officeInName: string;
  officeOutId: string;
  officeOutName: string;
  errors: TimeClockValidationError[];
}

export default function TimeClockEditor() {
  // Selection state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate());
  const [isLoaded, setIsLoaded] = useState(false);

  // Entry rows
  const [rows, setRows] = useState<TimeEntryRow[]>([]);
  const [originalEntries, setOriginalEntries] = useState<TimeClockEntry[]>([]);

  // Current admin user (hardcoded for demo)
  const currentAdminId = 'ADMIN-001';
  const currentAdminName = 'Office Manager';

  // Load entries for selected employee + date
  const handleLoadEntries = () => {
    if (!selectedUserId || !selectedDate) {
      alert('Please select an employee and date');
      return;
    }

    // Filter mock data
    const entries = MOCK_TIME_CLOCK_ENTRIES.filter(
      (e) => e.userId === selectedUserId && e.date === selectedDate
    );

    setOriginalEntries(entries);

    // Convert to editable rows
    const editableRows: TimeEntryRow[] = entries.map((entry) => ({
      tempId: entry.entryId,
      clockIn: entry.clockInTime,
      clockOut: entry.clockOutTime || '',
      officeInId: entry.officeInId,
      officeInName: entry.officeInName,
      officeOutId: entry.officeOutId || entry.officeInId,
      officeOutName: entry.officeOutName || entry.officeInName,
      errors: [],
    }));

    // If no entries, add one blank row
    if (editableRows.length === 0) {
      editableRows.push(createBlankRow());
    }

    setRows(editableRows);
    setIsLoaded(true);
  };

  // Create blank row
  const createBlankRow = (): TimeEntryRow => ({
    tempId: `TEMP-${Date.now()}-${Math.random()}`,
    clockIn: '',
    clockOut: '',
    officeInId: 'OFF-101',
    officeInName: 'Excel Dental - Wexford',
    officeOutId: 'OFF-101',
    officeOutName: 'Excel Dental - Wexford',
    errors: [],
  });

  // Add line
  const handleAddLine = () => {
    setRows([...rows, createBlankRow()]);
  };

  // Delete line
  const handleDeleteLine = (tempId: string) => {
    if (rows.length === 1) {
      alert('Cannot delete the last row. At least one time entry is required.');
      return;
    }

    setRows(rows.filter((r) => r.tempId !== tempId));
  };

  // Update row field
  const updateRow = (tempId: string, field: keyof TimeEntryRow, value: any) => {
    setRows(
      rows.map((r) =>
        r.tempId === tempId
          ? { ...r, [field]: value, errors: [] } // Clear errors on edit
          : r
      )
    );
  };

  // Validate all rows
  const validateAllRows = (): boolean => {
    let hasErrors = false;

    const updatedRows = rows.map((row) => {
      const errors = validateTimeClockEntry(
        row.clockIn,
        row.clockOut || null,
        selectedDate
      );

      if (errors.length > 0) {
        hasErrors = true;
      }

      return { ...row, errors };
    });

    setRows(updatedRows);
    return !hasErrors;
  };

  // Save
  const handleSave = () => {
    // Validate
    if (!validateAllRows()) {
      alert('Please fix validation errors before saving');
      return;
    }

    // Check if any changes were made
    const hasChanges = rows.some((row, index) => {
      const original = originalEntries[index];
      return (
        !original ||
        row.clockIn !== original.clockInTime ||
        row.clockOut !== (original.clockOutTime || '')
      );
    });

    if (!hasChanges && rows.length === originalEntries.length) {
      alert('No changes detected');
      return;
    }

    // Build updated entries
    const updatedEntries: TimeClockEntry[] = rows.map((row, index) => {
      const original = originalEntries[index];
      const isEdited =
        original &&
        (row.clockIn !== original.clockInTime ||
          row.clockOut !== (original.clockOutTime || ''));

      return {
        entryId: original?.entryId || `TCE-${Date.now()}-${index}`,
        userId: selectedUserId,
        userName:
          MOCK_USERS.find((u) => u.userId === selectedUserId)?.userName || '',
        date: selectedDate,
        clockInTime: row.clockIn,
        clockOutTime: row.clockOut || null,
        officeInId: row.officeInId,
        officeInName: row.officeInName,
        officeOutId: row.officeOutId,
        officeOutName: row.officeOutName,
        totalMinutes: row.clockOut
          ? calculateTotalMinutes(row.clockIn, row.clockOut, selectedDate)
          : null,
        isEdited: isEdited || (original?.isEdited || false),
        editedBy: isEdited ? currentAdminId : original?.editedBy,
        editedByName: isEdited ? currentAdminName : original?.editedByName,
        editedAt: isEdited ? new Date().toISOString() : original?.editedAt,
        originalClockIn: isEdited
          ? original?.clockInTime
          : original?.originalClockIn,
        originalClockOut: isEdited
          ? original?.clockOutTime
          : original?.originalClockOut,
        createdAt: original?.createdAt || new Date().toISOString(),
      };
    });

    console.log('Saving time clock entries:', updatedEntries);
    alert('Time entries saved successfully!\n\n(Check console for details)');

    // Reload
    handleLoadEntries();
  };

  // Cancel
  const handleCancel = () => {
    if (confirm('Discard all changes?')) {
      handleLoadEntries(); // Reload original data
    }
  };

  // Calculate total
  const calculateTotal = (): number => {
    let total = 0;
    rows.forEach((row) => {
      if (row.clockIn && row.clockOut) {
        const minutes = calculateTotalMinutes(
          row.clockIn,
          row.clockOut,
          selectedDate
        );
        total += minutes || 0;
      }
    });
    return total;
  };

  const totalMinutes = calculateTotal();

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 border-b-2 border-[#16293B]">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">
            Time Clock Editor
          </h1>
          <p className="text-sm text-blue-200 mt-1">
            Administrative correction interface
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Selection Panel */}
          <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
              Select Employee & Date
            </h2>

            <div className="grid grid-cols-3 gap-4">
              {/* Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <User className="w-3 h-3 inline mr-1" />
                  Employee
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Select Employee --</option>
                  {MOCK_USERS.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.userName} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Load Button */}
              <div className="flex items-end">
                <button
                  onClick={handleLoadEntries}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700"
                >
                  Load Entries
                </button>
              </div>
            </div>
          </div>

          {/* Editor Panel */}
          {isLoaded && (
            <div className="bg-white border-2 border-slate-300 rounded-lg">
              {/* Header */}
              <div className="bg-[#E8EFF7] px-4 py-2 border-b-2 border-slate-300 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Edit Time Entries
                </h2>
                <button
                  onClick={handleAddLine}
                  className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Line
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold uppercase w-8">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock In Time
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock In Office
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock Out Time
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock Out Office
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase">
                        Total
                      </th>
                      <th className="px-3 py-2 text-center font-bold uppercase w-16">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row, index) => {
                      const totalMinutes =
                        row.clockIn && row.clockOut
                          ? calculateTotalMinutes(
                              row.clockIn,
                              row.clockOut,
                              selectedDate
                            )
                          : null;

                      return (
                        <tr
                          key={row.tempId}
                          className={`${
                            row.errors.length > 0 ? 'bg-red-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Line Number */}
                          <td className="px-3 py-2 font-bold text-slate-600">
                            {index + 1}
                          </td>

                          {/* Clock In Time */}
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              step="1"
                              value={row.clockIn}
                              onChange={(e) =>
                                updateRow(row.tempId, 'clockIn', e.target.value)
                              }
                              className={`w-32 px-2 py-1 text-xs border rounded ${
                                row.errors.some((e) => e.field === 'clockIn')
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-slate-300'
                              }`}
                            />
                          </td>

                          {/* Clock In Office */}
                          <td className="px-3 py-2">
                            <select
                              value={row.officeInId}
                              onChange={(e) => {
                                const office = e.target.value;
                                const officeName =
                                  e.target.selectedOptions[0].text;
                                updateRow(row.tempId, 'officeInId', office);
                                updateRow(
                                  row.tempId,
                                  'officeInName',
                                  officeName
                                );
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                            >
                              <option value="OFF-101">
                                Excel Dental - Wexford
                              </option>
                              <option value="OFF-102">
                                Excel Dental - Green Tree
                              </option>
                            </select>
                          </td>

                          {/* Clock Out Time */}
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              step="1"
                              value={row.clockOut}
                              onChange={(e) =>
                                updateRow(row.tempId, 'clockOut', e.target.value)
                              }
                              className={`w-32 px-2 py-1 text-xs border rounded ${
                                row.errors.some((e) => e.field === 'clockOut')
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-slate-300'
                              }`}
                            />
                          </td>

                          {/* Clock Out Office */}
                          <td className="px-3 py-2">
                            <select
                              value={row.officeOutId}
                              onChange={(e) => {
                                const office = e.target.value;
                                const officeName =
                                  e.target.selectedOptions[0].text;
                                updateRow(row.tempId, 'officeOutId', office);
                                updateRow(
                                  row.tempId,
                                  'officeOutName',
                                  officeName
                                );
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                            >
                              <option value="OFF-101">
                                Excel Dental - Wexford
                              </option>
                              <option value="OFF-102">
                                Excel Dental - Green Tree
                              </option>
                            </select>
                          </td>

                          {/* Total */}
                          <td className="px-3 py-2 text-right font-bold">
                            {totalMinutes !== null
                              ? formatMinutesAsTime(totalMinutes)
                              : '--:--:--'}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleDeleteLine(row.tempId)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="bg-blue-50 font-bold">
                      <td colSpan={5} className="px-3 py-2 text-right uppercase">
                        Total Hours:
                      </td>
                      <td className="px-3 py-2 text-right text-blue-900">
                        {formatMinutesAsTime(totalMinutes)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Validation Errors */}
              {rows.some((r) => r.errors.length > 0) && (
                <div className="p-4 bg-red-50 border-t-2 border-red-300">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-red-800 mb-1">
                        Validation Errors:
                      </div>
                      <ul className="text-xs text-red-700 space-y-1">
                        {rows.map((row, index) =>
                          row.errors.map((error, errIdx) => (
                            <li key={`${row.tempId}-${errIdx}`}>
                              Line {index + 1}: {error.message}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 bg-slate-500 text-white rounded font-semibold text-sm hover:bg-slate-600 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

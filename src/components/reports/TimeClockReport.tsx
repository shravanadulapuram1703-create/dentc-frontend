/**
 * ==================================================================================
 * TIME CLOCK REPORT
 * ==================================================================================
 * 
 * PURPOSE:
 * - Read-only reporting of time clock data
 * - Multiple report formats (Detail / Summary / Employee Total)
 * - Office-aware filtering
 * - Multi-employee selection
 * - Date range filtering
 * 
 * ACCESS:
 * - Reports → Management Reports → Time Clock Report
 * 
 * REPORT FORMATS:
 * 1. Detail: Every clock entry (one row per entry)
 * 2. Summary: Grouped by employee + date (daily totals)
 * 3. Employee Total Only: Grouped by employee (period totals)
 * 
 * ==================================================================================
 */

import { useState } from 'react';
import { FileText, Download, Calendar, User, Building } from 'lucide-react';
import {
  TimeClockEntry,
  TimeClockSummary,
  formatMinutesAsTime,
  minutesToDecimalHours,
  MOCK_TIME_CLOCK_ENTRIES,
  MOCK_USERS,
} from '../../data/timeClockData';

type ReportFormat = 'detail' | 'summary' | 'employee-total';

export default function TimeClockReport() {
  // Filters
  const [reportFormat, setReportFormat] = useState<ReportFormat>('detail');
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('2026-01-20');
  const [endDate, setEndDate] = useState('2026-01-27');
  const [groupByOffice, setGroupByOffice] = useState(false);

  // Generate report data
  const getFilteredEntries = (): TimeClockEntry[] => {
    return MOCK_TIME_CLOCK_ENTRIES.filter((entry) => {
      // Date filter
      if (entry.date < startDate || entry.date > endDate) {
        return false;
      }

      // Office filter
      if (
        selectedOfficeIds.length > 0 &&
        !selectedOfficeIds.includes(entry.officeInId)
      ) {
        return false;
      }

      // User filter
      if (
        selectedUserIds.length > 0 &&
        !selectedUserIds.includes(entry.userId)
      ) {
        return false;
      }

      return true;
    });
  };

  // Build summary data (group by employee + date)
  const buildSummaryData = (): TimeClockSummary[] => {
    const entries = getFilteredEntries();
    const grouped: { [key: string]: TimeClockEntry[] } = {};

    // Group by userId + date
    entries.forEach((entry) => {
      const key = `${entry.userId}|${entry.date}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    // Build summaries
    const summaries: TimeClockSummary[] = [];
    Object.keys(grouped).forEach((key) => {
      const [userId, date] = key.split('|');
      const dayEntries = grouped[key];
      const totalMinutes = dayEntries.reduce(
        (sum, e) => sum + (e.totalMinutes || 0),
        0
      );

      summaries.push({
        userId,
        userName: dayEntries[0].userName,
        date,
        entries: dayEntries,
        totalMinutes,
        totalHoursFormatted: formatMinutesAsTime(totalMinutes),
        totalHoursDecimal: minutesToDecimalHours(totalMinutes),
      });
    });

    return summaries.sort((a, b) => {
      if (a.userName !== b.userName) {
        return a.userName.localeCompare(b.userName);
      }
      return a.date.localeCompare(b.date);
    });
  };

  // Build employee total data (group by employee only)
  const buildEmployeeTotalData = (): {
    userId: string;
    userName: string;
    totalMinutes: number;
    totalHoursFormatted: string;
    totalHoursDecimal: number;
    dayCount: number;
  }[] => {
    const entries = getFilteredEntries();
    const grouped: { [userId: string]: TimeClockEntry[] } = {};

    entries.forEach((entry) => {
      if (!grouped[entry.userId]) {
        grouped[entry.userId] = [];
      }
      grouped[entry.userId].push(entry);
    });

    const totals = Object.keys(grouped).map((userId) => {
      const userEntries = grouped[userId];
      const totalMinutes = userEntries.reduce(
        (sum, e) => sum + (e.totalMinutes || 0),
        0
      );

      // Count unique days
      const uniqueDates = new Set(userEntries.map((e) => e.date));

      return {
        userId,
        userName: userEntries[0].userName,
        totalMinutes,
        totalHoursFormatted: formatMinutesAsTime(totalMinutes),
        totalHoursDecimal: minutesToDecimalHours(totalMinutes),
        dayCount: uniqueDates.size,
      };
    });

    return totals.sort((a, b) => a.userName.localeCompare(b.userName));
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredEntries = getFilteredEntries();
  const summaryData = buildSummaryData();
  const employeeTotalData = buildEmployeeTotalData();

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 border-b-2 border-[#16293B]">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">
            Time Clock Report
          </h1>
          <p className="text-sm text-blue-200 mt-1">
            Employee time tracking and payroll reporting
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Filters */}
          <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
              Report Filters
            </h2>

            <div className="grid grid-cols-4 gap-4">
              {/* Report Format */}
              <div className="col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Report Format
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReportFormat('detail')}
                    className={`flex-1 px-4 py-2 rounded border-2 text-sm font-semibold transition-colors ${
                      reportFormat === 'detail'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Detail
                  </button>
                  <button
                    onClick={() => setReportFormat('summary')}
                    className={`flex-1 px-4 py-2 rounded border-2 text-sm font-semibold transition-colors ${
                      reportFormat === 'summary'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Summary (By Day)
                  </button>
                  <button
                    onClick={() => setReportFormat('employee-total')}
                    className={`flex-1 px-4 py-2 rounded border-2 text-sm font-semibold transition-colors ${
                      reportFormat === 'employee-total'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Employee Total Only
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              {/* Group by Office */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Options
                </label>
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={groupByOffice}
                    onChange={(e) => setGroupByOffice(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Group by Office</span>
                </label>
              </div>

              {/* Employee Selection */}
              <div className="col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <User className="w-3 h-3 inline mr-1" />
                  Employees (Multi-select)
                </label>
                <div className="grid grid-cols-3 gap-2 p-3 border border-slate-300 rounded bg-slate-50 max-h-32 overflow-y-auto">
                  {MOCK_USERS.map((user) => (
                    <label
                      key={user.userId}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.userId)}
                        onChange={() => toggleUserSelection(user.userId)}
                        className="w-4 h-4"
                      />
                      <span>{user.userName}</span>
                    </label>
                  ))}
                </div>
                {selectedUserIds.length === 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    No filters - showing all employees
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Report Output */}
          <div className="bg-white border-2 border-slate-300 rounded-lg">
            <div className="bg-[#E8EFF7] px-4 py-2 border-b-2 border-slate-300 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">
                Report Results ({filteredEntries.length} entries)
              </h2>
              <button className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 flex items-center gap-1">
                <Download className="w-3 h-3" />
                Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              {/* DETAIL FORMAT */}
              {reportFormat === 'detail' && (
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Employee
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock In
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock In Office
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock Out
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Clock Out Office
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase">
                        Total (HH:MM)
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase">
                        Total (Decimal)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.entryId} className="hover:bg-slate-50">
                        <td className="px-3 py-2">{entry.userName}</td>
                        <td className="px-3 py-2">{entry.date}</td>
                        <td className="px-3 py-2">{entry.clockInTime}</td>
                        <td className="px-3 py-2 text-xs">
                          {entry.officeInName}
                        </td>
                        <td className="px-3 py-2">
                          {entry.clockOutTime || '(Active)'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {entry.officeOutName || '–'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatMinutesAsTime(entry.totalMinutes)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {entry.totalMinutes !== null
                            ? minutesToDecimalHours(entry.totalMinutes).toFixed(2)
                            : '--'}
                        </td>
                      </tr>
                    ))}
                    {filteredEntries.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No time clock entries found for the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* SUMMARY FORMAT */}
              {reportFormat === 'summary' && (
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Employee
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Date
                      </th>
                      <th className="px-3 py-2 text-center font-bold uppercase">
                        # Segments
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase">
                        Total (HH:MM)
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase">
                        Total (Decimal)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {summaryData.map((summary, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-3 py-2">{summary.userName}</td>
                        <td className="px-3 py-2">{summary.date}</td>
                        <td className="px-3 py-2 text-center">
                          {summary.entries.length}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {summary.totalHoursFormatted}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {summary.totalHoursDecimal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {summaryData.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No time clock data found for the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* EMPLOYEE TOTAL FORMAT */}
              {reportFormat === 'employee-total' && (
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold uppercase">
                        Employee
                      </th>
                      <th className="px-3 py-2 text-center font-bold uppercase">
                        Days Worked
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase">
                        Total Hours (HH:MM)
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase">
                        Total Hours (Decimal)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {employeeTotalData.map((employee) => (
                      <tr key={employee.userId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-semibold">
                          {employee.userName}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {employee.dayCount}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-900">
                          {employee.totalHoursFormatted}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-900">
                          {employee.totalHoursDecimal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {employeeTotalData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No employee data found for the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

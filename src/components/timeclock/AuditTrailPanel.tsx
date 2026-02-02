/**
 * ==================================================================================
 * AUDIT TRAIL PANEL
 * ==================================================================================
 * 
 * PURPOSE:
 * - Display edit history for time clock entries
 * - Show original vs edited values
 * - Track who made changes and when
 * - Support compliance and payroll accuracy
 * 
 * USAGE:
 * - Embedded in TimeClockEditor
 * - Expandable detail view
 * - Export capability for audits
 * 
 * ==================================================================================
 */

import { Clock, User, Calendar, Info } from 'lucide-react';
import { TimeClockEntry } from '../../data/timeClockData';

interface AuditTrailPanelProps {
  entries: TimeClockEntry[];
}

export default function AuditTrailPanel({ entries }: AuditTrailPanelProps) {
  const editedEntries = entries.filter((e) => e.isEdited);

  if (editedEntries.length === 0) {
    return (
      <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 text-center">
        <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600">
          No edits found for the selected time period
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-slate-300 rounded-lg">
      <div className="bg-orange-100 px-4 py-2 border-b-2 border-orange-300">
        <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wide">
          Audit Trail - Edited Entries
        </h3>
        <p className="text-xs text-orange-700 mt-1">
          {editedEntries.length} entry/entries have been modified
        </p>
      </div>

      <div className="divide-y divide-slate-200">
        {editedEntries.map((entry) => (
          <div key={entry.entryId} className="p-4">
            {/* Entry Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {entry.userName}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {entry.date}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-600">Edited by</div>
                <div className="text-xs font-semibold text-orange-700">
                  {entry.editedByName || 'Unknown'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {entry.editedAt
                    ? new Date(entry.editedAt).toLocaleString()
                    : '–'}
                </div>
              </div>
            </div>

            {/* Changes Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded p-3">
              {/* Original Clock In */}
              {entry.originalClockIn && (
                <div>
                  <div className="text-[10px] text-slate-600 uppercase mb-1">
                    Original Clock In
                  </div>
                  <div className="text-sm font-mono text-red-700 line-through">
                    {entry.originalClockIn}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Changed to:{' '}
                    <span className="font-mono text-green-700">
                      {entry.clockInTime}
                    </span>
                  </div>
                </div>
              )}

              {/* Original Clock Out */}
              {entry.originalClockOut && (
                <div>
                  <div className="text-[10px] text-slate-600 uppercase mb-1">
                    Original Clock Out
                  </div>
                  <div className="text-sm font-mono text-red-700 line-through">
                    {entry.originalClockOut}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Changed to:{' '}
                    <span className="font-mono text-green-700">
                      {entry.clockOutTime || '(None)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {entry.notes && (
              <div className="mt-3 text-xs">
                <div className="text-slate-600 font-semibold mb-1">Notes:</div>
                <div className="text-slate-700 italic bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                  {entry.notes}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

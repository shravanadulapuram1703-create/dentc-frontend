/**
 * ==================================================================================
 * TODAY'S HOURS PANEL
 * ==================================================================================
 * 
 * PURPOSE:
 * - Self-service clock IN/OUT interface
 * - Accessible via clock icon in GlobalNav
 * - Shows current user's hours for today only
 * 
 * FUNCTIONALITY:
 * - Display clock in/out times
 * - Calculate total hours in real-time
 * - Toggle between IN/OUT button states
 * - Office-aware (uses current office from context)
 * 
 * BUSINESS RULES:
 * - Only one active clock-in at a time
 * - Cross-office clocking allowed
 * - Total hours displayed as HH:MM:SS
 * 
 * ==================================================================================
 */

import { useState, useEffect } from 'react';
import { X, Clock, LogIn, LogOut } from 'lucide-react';
import {
  TimeClockEntry,
  getCurrentTime,
  getCurrentDate,
  calculateTotalMinutes,
  formatMinutesAsTime,
  MOCK_TIME_CLOCK_ENTRIES,
} from '../../data/timeClockData';

interface TodaysHoursPanelProps {
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentOfficeId: string;
  currentOfficeName: string;
}

export default function TodaysHoursPanel({
  onClose,
  currentUserId,
  currentUserName,
  currentOfficeId,
  currentOfficeName,
}: TodaysHoursPanelProps) {
  const today = getCurrentDate();

  // Mock data - filter today's entries for current user
  const [entries, setEntries] = useState<TimeClockEntry[]>(
    MOCK_TIME_CLOCK_ENTRIES.filter(
      (e) => e.userId === currentUserId && e.date === today
    )
  );

  // Current active entry (clocked in but not out)
  const activeEntry = entries.find((e) => e.clockOutTime === null);

  // Current time (updates every second)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate total minutes for today (including active entry)
  const calculateTotalMinutesToday = (): number => {
    let total = 0;

    entries.forEach((entry) => {
      if (entry.clockOutTime) {
        // Completed entry
        total += entry.totalMinutes || 0;
      } else {
        // Active entry - calculate from clock in to now
        const now = getCurrentTime();
        const minutes = calculateTotalMinutes(entry.clockInTime, now, today);
        total += minutes || 0;
      }
    });

    return total;
  };

  // Handle clock IN
  const handleClockIn = () => {
    if (activeEntry) {
      alert('You are already clocked in!');
      return;
    }

    const newEntry: TimeClockEntry = {
      entryId: `TCE-${Date.now()}`,
      userId: currentUserId,
      userName: currentUserName,
      date: today,
      clockInTime: getCurrentTime(),
      clockOutTime: null,
      officeInId: currentOfficeId,
      officeInName: currentOfficeName,
      officeOutId: null,
      officeOutName: null,
      totalMinutes: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
    };

    setEntries([...entries, newEntry]);
    console.log('Clocked IN:', newEntry);
  };

  // Handle clock OUT
  const handleClockOut = () => {
    if (!activeEntry) {
      alert('You are not currently clocked in!');
      return;
    }

    const clockOutTime = getCurrentTime();
    const totalMinutes = calculateTotalMinutes(
      activeEntry.clockInTime,
      clockOutTime,
      today
    );

    const updatedEntry: TimeClockEntry = {
      ...activeEntry,
      clockOutTime,
      officeOutId: currentOfficeId,
      officeOutName: currentOfficeName,
      totalMinutes,
    };

    setEntries(entries.map((e) => (e.entryId === activeEntry.entryId ? updatedEntry : e)));
    console.log('Clocked OUT:', updatedEntry);
  };

  const totalMinutesToday = calculateTotalMinutesToday();
  const totalHoursFormatted = formatMinutesAsTime(totalMinutesToday);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border-2 border-slate-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-3 rounded-t-lg flex items-center justify-between border-b-2 border-[#16293B]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Today's Hours
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* User & Office Info */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="text-xs text-slate-600 mb-1">Employee</div>
            <div className="text-sm font-bold text-slate-900">{currentUserName}</div>
            <div className="text-xs text-slate-600 mt-2 mb-1">Current Office</div>
            <div className="text-sm font-semibold text-blue-700">
              {currentOfficeName}
            </div>
            <div className="text-xs text-slate-600 mt-2 mb-1">Date</div>
            <div className="text-sm font-semibold text-slate-900">
              {new Date(today).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* Clock Status */}
          {activeEntry ? (
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-300">
              <div className="flex items-center gap-2 mb-3">
                <LogIn className="w-5 h-5 text-green-700" />
                <span className="text-sm font-bold text-green-900 uppercase">
                  Currently Clocked IN
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-green-700 mb-1">Clock In Time</div>
                  <div className="font-bold text-green-900">
                    {activeEntry.clockInTime}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-green-700 mb-1">Clock In Office</div>
                  <div className="font-semibold text-green-900 text-xs">
                    {activeEntry.officeInName}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-green-700 mb-1">Current Time</div>
                <div className="text-2xl font-bold text-green-900 font-mono">
                  {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
              <LogOut className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm text-slate-600">
                You are currently clocked OUT
              </div>
            </div>
          )}

          {/* Total Hours Today */}
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
            <div className="text-xs text-blue-700 mb-1 uppercase font-bold">
              Total Hours Today
            </div>
            <div className="text-3xl font-bold text-blue-900 font-mono">
              {totalHoursFormatted}
            </div>
            {entries.length > 1 && (
              <div className="text-xs text-blue-700 mt-2">
                {entries.length} time {entries.length === 1 ? 'segment' : 'segments'} recorded
              </div>
            )}
          </div>

          {/* Time Entries List */}
          {entries.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                <div className="text-xs font-bold text-slate-700 uppercase">
                  Time Segments
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {entries.map((entry, index) => (
                  <div key={entry.entryId} className="px-3 py-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-700">
                          Segment {index + 1}:
                        </span>{' '}
                        <span className="text-slate-900">{entry.clockInTime}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="text-slate-900">
                          {entry.clockOutTime || 'Active'}
                        </span>
                      </div>
                      {entry.totalMinutes !== null && (
                        <span className="font-bold text-blue-700">
                          {formatMinutesAsTime(entry.totalMinutes)}
                        </span>
                      )}
                    </div>
                    {entry.officeInId !== entry.officeOutId &&
                      entry.officeOutId && (
                        <div className="text-[10px] text-orange-600 mt-1">
                          ⚠️ Cross-office: {entry.officeInName} → {entry.officeOutName}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {activeEntry ? (
              <button
                onClick={handleClockOut}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                CLOCK OUT
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                CLOCK IN
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

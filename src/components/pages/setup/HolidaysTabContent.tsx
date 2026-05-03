import { useState } from 'react';
import { Calendar, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import { components } from '../../../styles/theme';

export function HolidaysTabContent() {
  const [holidays, setHolidays] = useState([
    { id: '1', date: '2026-01-01', name: "New Year's Day", status: 'CLOSED', type: 'Federal', isRecurring: false },
    { id: '2', date: '2026-05-25', name: 'Memorial Day', status: 'CLOSED', type: 'Federal', isRecurring: false },
    { id: '3', date: '2026-07-04', name: 'Independence Day', status: 'CLOSED', type: 'Federal', isRecurring: false },
    { id: '4', date: '2026-12-24', name: 'Christmas Eve', status: 'CLOSED', type: 'Custom', isRecurring: true },
    { id: '5', date: '2026-12-25', name: 'Christmas Day', status: 'CLOSED', type: 'Federal', isRecurring: false },
  ]);
  
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFederalModal, setShowFederalModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState<any>(null);
  const [federalYear, setFederalYear] = useState(new Date().getFullYear());
  
  // Form state for add/edit
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSelectAll = () => {
    if (selectedHolidays.length === holidays.length) {
      setSelectedHolidays([]);
    } else {
      setSelectedHolidays(holidays.map(h => h.id));
    }
  };

  const handleSelectHoliday = (id: string) => {
    if (selectedHolidays.includes(id)) {
      setSelectedHolidays(selectedHolidays.filter(hid => hid !== id));
    } else {
      setSelectedHolidays([...selectedHolidays, id]);
    }
  };

  const handleAddHoliday = () => {
    if (!holidayName || !holidayDate) {
      toast.error('Holiday name and date are required');
      return;
    }

    const newHoliday = {
      id: Date.now().toString(),
      date: holidayDate,
      name: holidayName,
      status: 'CLOSED' as const,
      type: 'Custom' as const,
      isRecurring,
    };

    setHolidays([...holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
    setShowAddModal(false);
    setHolidayName('');
    setHolidayDate('');
    setIsRecurring(false);
    toast.success('Holiday added successfully');
  };

  const handleEditHoliday = () => {
    if (!currentHoliday) return;

    const updatedHolidays = holidays.map(h =>
      h.id === currentHoliday.id
        ? { ...h, name: holidayName, date: holidayDate, isRecurring }
        : h
    );

    setHolidays(updatedHolidays.sort((a, b) => a.date.localeCompare(b.date)));
    setShowEditModal(false);
    setCurrentHoliday(null);
    toast.success('Holiday updated successfully');
  };

  const handleDeleteHoliday = (id: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      setHolidays(holidays.filter(h => h.id !== id));
      toast.success('Holiday deleted successfully');
    }
  };

  const handleBulkDelete = () => {
    if (selectedHolidays.length === 0) {
      toast.error('Please select holidays to delete');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedHolidays.length} holiday(s)?`)) {
      setHolidays(holidays.filter(h => !selectedHolidays.includes(h.id)));
      setSelectedHolidays([]);
      toast.success(`${selectedHolidays.length} holiday(s) deleted successfully`);
    }
  };

  const handleAddFederalHolidays = () => {
    const federalHolidays = [
      { date: `${federalYear}-01-01`, name: "New Year's Day" },
      { date: `${federalYear}-01-20`, name: 'Martin Luther King Jr. Day' },
      { date: `${federalYear}-02-17`, name: "Presidents' Day" },
      { date: `${federalYear}-05-26`, name: 'Memorial Day' },
      { date: `${federalYear}-07-04`, name: 'Independence Day' },
      { date: `${federalYear}-09-01`, name: 'Labor Day' },
      { date: `${federalYear}-10-13`, name: 'Columbus Day' },
      { date: `${federalYear}-11-11`, name: 'Veterans Day' },
      { date: `${federalYear}-11-27`, name: 'Thanksgiving Day' },
      { date: `${federalYear}-12-25`, name: 'Christmas Day' },
    ];

    const existingDates = new Set(holidays.map(h => h.date));
    const newHolidays = federalHolidays
      .filter(fh => !existingDates.has(fh.date))
      .map(fh => ({
        id: Date.now().toString() + Math.random(),
        date: fh.date,
        name: fh.name,
        status: 'CLOSED' as const,
        type: 'Federal' as const,
        isRecurring: false,
      }));

    if (newHolidays.length === 0) {
      toast.info('All federal holidays for this year are already added');
    } else {
      setHolidays([...holidays, ...newHolidays].sort((a, b) => a.date.localeCompare(b.date)));
      toast.success(`${newHolidays.length} federal holiday(s) added successfully`);
    }

    setShowFederalModal(false);
  };

  const handleRangeSelect = () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both from and to dates');
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    if (start > end) {
      toast.error('From date must be before to date');
      return;
    }

    setShowRangeModal(true);
  };

  const confirmRangeAdd = () => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }

    const existingDates = new Set(holidays.map(h => h.date));
    const newHolidays = dates
      .filter(date => !existingDates.has(date))
      .map(date => ({
        id: Date.now().toString() + Math.random(),
        date,
        name: `Holiday - ${date}`,
        status: 'CLOSED' as const,
        type: 'Custom' as const,
        isRecurring: false,
      }));

    setHolidays([...holidays, ...newHolidays].sort((a, b) => a.date.localeCompare(b.date)));
    setShowRangeModal(false);
    setFromDate('');
    setToDate('');
    toast.success(`${newHolidays.length} holiday(s) added from date range`);
  };

  const openEditModal = (holiday: any) => {
    setCurrentHoliday(holiday);
    setHolidayName(holiday.name);
    setHolidayDate(holiday.date);
    setIsRecurring(holiday.isRecurring);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
              />
            </div>
            <button
              onClick={handleRangeSelect}
              className="mt-5 px-4 py-2 bg-[#3A6EA5] text-white text-sm font-bold rounded-lg hover:bg-[#2C5282] transition-colors"
            >
              Select Range
            </button>
          </div>

          <button
            onClick={() => setShowFederalModal(true)}
            className="px-4 py-2 bg-[#0D9488] text-white text-sm font-bold rounded-lg hover:bg-[#0F766E] transition-colors inline-flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Add Federal Holidays
          </button>
        </div>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-lg border-2 border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedHolidays.length === holidays.length && holidays.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Holiday Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday, index) => (
                <tr
                  key={holiday.id}
                  className={`border-b border-[#E2E8F0] hover:bg-[#F7F9FC] transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedHolidays.includes(holiday.id)}
                      onChange={() => handleSelectHoliday(holiday.id)}
                      className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1E293B] font-bold">
                    {new Date(holiday.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1E293B]">
                    <div className="flex items-center gap-2">
                      {holiday.name}
                      {holiday.isRecurring && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded">
                          Recurring
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1E293B]">
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded">
                      Office Closed
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1E293B]">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded ${
                        holiday.type === 'Federal'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {holiday.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(holiday)}
                        className="p-1.5 text-[#3A6EA5] hover:bg-[#E8EFF7] rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="p-1.5 text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#64748B]">
                    No holidays configured. Add federal holidays or create custom holidays.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <button
            onClick={() => {
              setHolidayName('');
              setHolidayDate('');
              setIsRecurring(false);
              setShowAddModal(true);
            }}
            className={components.buttonPrimary + ' inline-flex items-center gap-2'}
          >
            <Calendar className="w-4 h-4" />
            Add New Holiday
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedHolidays.length === 0}
            className={`${components.buttonOutline} inline-flex items-center gap-2 ${
              selectedHolidays.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <X className="w-4 h-4" />
            Delete Selected ({selectedHolidays.length})
          </button>
        </div>

        <div className="text-xs text-[#64748B] font-bold">
          Total Holidays: {holidays.length}
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-[#3A6EA5] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-bold">Add New Holiday</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Holiday Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., Office Party Day"
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Holiday Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                />
                <label className="text-xs font-bold text-[#1E293B]">
                  Recurring Yearly
                </label>
              </div>
            </div>
            <div className="bg-[#F7F9FC] px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className={components.buttonOutline}
              >
                Cancel
              </button>
              <button
                onClick={handleAddHoliday}
                className={components.buttonPrimary}
              >
                Add Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {showEditModal && currentHoliday && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-[#3A6EA5] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-bold">Edit Holiday</h3>
            </div>
            <div className="p-6 space-y-4">
              {currentHoliday.type === 'Federal' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-blue-800">
                    Federal Holiday - Date cannot be changed
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Holiday Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Holiday Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  disabled={currentHoliday.type === 'Federal'}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    currentHoliday.type === 'Federal'
                      ? 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                      : 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                  }`}
                />
              </div>
              {currentHoliday.type !== 'Federal' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                  />
                  <label className="text-xs font-bold text-[#1E293B]">
                    Recurring Yearly
                  </label>
                </div>
              )}
            </div>
            <div className="bg-[#F7F9FC] px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setCurrentHoliday(null);
                }}
                className={components.buttonOutline}
              >
                Cancel
              </button>
              <button
                onClick={handleEditHoliday}
                className={components.buttonPrimary}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Federal Holidays Modal */}
      {showFederalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-[#0D9488] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-bold">Add Federal Holidays</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Year
                </label>
                <select
                  value={federalYear}
                  onChange={(e) => setFederalYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                >
                  {[2026, 2027, 2028, 2029, 2030].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-800">
                  This will add all U.S. federal holidays for {federalYear}. Non-federal holidays must be added manually.
                </p>
              </div>
            </div>
            <div className="bg-[#F7F9FC] px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setShowFederalModal(false)}
                className={components.buttonOutline}
              >
                Cancel
              </button>
              <button
                onClick={handleAddFederalHolidays}
                className={components.buttonPrimary}
              >
                Add Holidays
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Range Confirmation Modal */}
      {showRangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-[#3A6EA5] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-bold">Confirm Date Range</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#1E293B]">
                Add holidays from <span className="font-bold">{fromDate}</span> to{' '}
                <span className="font-bold">{toDate}</span>?
              </p>
            </div>
            <div className="bg-[#F7F9FC] px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setShowRangeModal(false)}
                className={components.buttonOutline}
              >
                Cancel
              </button>
              <button
                onClick={confirmRangeAdd}
                className={components.buttonPrimary}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

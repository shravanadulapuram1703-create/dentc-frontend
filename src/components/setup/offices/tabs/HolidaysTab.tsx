import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Edit, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { components } from '../../../../styles/theme';
import type { LookupOption } from '../../../../services/accountSetupTransform';
import {
  fetchOfficeHolidays,
  createOfficeHoliday,
  updateOfficeHoliday,
  deleteOfficeHoliday,
  bulkDeleteOfficeHolidays,
  importOfficeFederalHolidays,
  addOfficeHolidayRange,
  type OfficeHolidayApiRow,
} from '../../../../services/officeSetupApi';

/**
 * Office → Holidays tab. A per-office replica of the Account Info Holidays screen
 * (`src/components/pages/setup/HolidaysTabContent.tsx`).
 *
 * ⚠️ The office-scoped holiday endpoints this consumes DO NOT EXIST yet
 * (backend gap #15). This component is built and ready, but is kept gated behind
 * `TabNotAvailable` in `OfficeSetup.tsx` (flag `OFFICE_HOLIDAYS_BACKEND_READY`)
 * so it never issues calls to non-existent routes in production. Flip the flag
 * once the backend lands the gap #15 endpoints.
 */

export type UiOfficeHoliday = {
  id: string;
  date: string;
  name: string;
  status: string;
  type: string;
  isRecurring: boolean;
};

function mapRowToUi(row: OfficeHolidayApiRow): UiOfficeHoliday {
  return {
    id: row.id,
    date: row.holiday_date,
    name: row.holiday_name,
    status: row.status,
    type: row.holiday_type,
    isRecurring: Boolean(row.is_recurring),
  };
}

function statusBadgeLabel(status: string, statusOptions: LookupOption[]) {
  const found = statusOptions.find((o) => o.value === status);
  return found?.label ?? status.replace(/_/g, ' ');
}

/** Status badge colors: Open = green, Half Day = light green, Closed = red. */
function statusBadgeClass(status: string) {
  switch (String(status).toUpperCase()) {
    case 'OPEN':
      return 'bg-green-100 text-green-700';
    case 'HALF_DAY':
      return 'bg-green-50 text-green-600';
    case 'CLOSED':
    default:
      return 'bg-red-100 text-red-700';
  }
}

type HolidaysTabProps = {
  officeId: number;
  holidayStatusOptions: LookupOption[];
  holidayTypeOptions: LookupOption[];
};

export default function HolidaysTab({
  officeId,
  holidayStatusOptions,
  holidayTypeOptions,
}: HolidaysTabProps) {
  const [holidays, setHolidays] = useState<UiOfficeHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFederalModal, setShowFederalModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState<UiOfficeHoliday | null>(null);
  const [federalYear, setFederalYear] = useState(new Date().getFullYear());

  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [addStatus, setAddStatus] = useState('CLOSED');
  const [addType, setAddType] = useState('Custom');
  const [editStatus, setEditStatus] = useState('CLOSED');
  const [editType, setEditType] = useState('Custom');

  const yearChoices = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => y - 2 + i);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchOfficeHolidays(officeId);
      setHolidays(rows.map(mapRowToUi).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load holidays";
      toast.error("Could not load holidays", { description: msg });
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSelectAll = () => {
    if (selectedHolidays.length === holidays.length) {
      setSelectedHolidays([]);
    } else {
      setSelectedHolidays(holidays.map((h) => h.id));
    }
  };

  const handleSelectHoliday = (id: string) => {
    if (selectedHolidays.includes(id)) {
      setSelectedHolidays(selectedHolidays.filter((hid) => hid !== id));
    } else {
      setSelectedHolidays([...selectedHolidays, id]);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayName || !holidayDate) {
      toast.error('Holiday name and date are required');
      return;
    }
    setMutating(true);
    try {
      await createOfficeHoliday(officeId, {
        holiday_date: holidayDate,
        holiday_name: holidayName,
        status: addStatus,
        holiday_type: addType,
        is_recurring: isRecurring,
      });
      await reload();
      setShowAddModal(false);
      setHolidayName('');
      setHolidayDate('');
      setIsRecurring(false);
      setAddStatus(holidayStatusOptions[0]?.value ?? 'CLOSED');
      setAddType(holidayTypeOptions[0]?.value ?? 'Custom');
      toast.success('Holiday added successfully');
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Add holiday failed", { description: msg });
    } finally {
      setMutating(false);
    }
  };

  const handleEditHoliday = async () => {
    if (!currentHoliday) return;
    setMutating(true);
    try {
      await updateOfficeHoliday(officeId, currentHoliday.id, {
        holiday_name: holidayName,
        holiday_date: currentHoliday.type?.toLowerCase() === 'federal' ? currentHoliday.date : holidayDate,
        status: editStatus,
        holiday_type: editType,
        is_recurring: currentHoliday.type?.toLowerCase() === 'federal' ? currentHoliday.isRecurring : isRecurring,
      });
      await reload();
      setShowEditModal(false);
      setCurrentHoliday(null);
      toast.success('Holiday updated successfully');
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Update failed", { description: msg });
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    setMutating(true);
    try {
      await deleteOfficeHoliday(officeId, id);
      await reload();
      toast.success('Holiday deleted successfully');
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Delete failed", { description: msg });
    } finally {
      setMutating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedHolidays.length === 0) {
      toast.error('Please select holidays to delete');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedHolidays.length} holiday(s)?`)) return;
    setMutating(true);
    try {
      await bulkDeleteOfficeHolidays(officeId, selectedHolidays);
      await reload();
      setSelectedHolidays([]);
      toast.success(`${selectedHolidays.length} holiday(s) deleted successfully`);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Bulk delete failed", { description: msg });
    } finally {
      setMutating(false);
    }
  };

  const handleAddFederalHolidays = async () => {
    setMutating(true);
    try {
      await importOfficeFederalHolidays(officeId, federalYear);
      await reload();
      setShowFederalModal(false);
      toast.success('Federal holidays imported');
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Import failed", { description: msg });
    } finally {
      setMutating(false);
    }
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

  const confirmRangeAdd = async () => {
    setMutating(true);
    try {
      const rangeName = `Closure ${fromDate}–${toDate}`;
      await addOfficeHolidayRange(officeId, { fromDate, toDate, name: rangeName });
      await reload();
      setShowRangeModal(false);
      setFromDate('');
      setToDate('');
      toast.success('Date range holidays added');
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Range add failed", { description: msg });
    } finally {
      setMutating(false);
    }
  };

  const openEditModal = (holiday: UiOfficeHoliday) => {
    setCurrentHoliday(holiday);
    setHolidayName(holiday.name);
    setHolidayDate(holiday.date);
    setIsRecurring(holiday.isRecurring);
    setEditStatus(holiday.status);
    setEditType(holiday.type);
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setHolidayName('');
    setHolidayDate('');
    setIsRecurring(false);
    setAddStatus(holidayStatusOptions[0]?.value ?? 'CLOSED');
    setAddType(holidayTypeOptions[0]?.value ?? 'Custom');
    setShowAddModal(true);
  };

  if (loading && holidays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading holidays…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {mutating && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}
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
                    <span className={`px-2 py-1 text-xs font-bold rounded ${statusBadgeClass(holiday.status)}`}>
                      {statusBadgeLabel(holiday.status, holidayStatusOptions)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1E293B]">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded ${
                        holiday.type?.toLowerCase() === 'federal'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {holidayTypeOptions.find((o) => o.value === holiday.type)?.label ?? holiday.type}
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
                        onClick={() => void handleDeleteHoliday(holiday.id)}
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
          <button onClick={openAddModal} className={components.buttonPrimary + ' inline-flex items-center gap-2'}>
            <Calendar className="w-4 h-4" />
            Add New Holiday
          </button>
          <button
            onClick={() => void handleBulkDelete()}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">Status</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
                  >
                    {holidayStatusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">Type</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
                  >
                    {holidayTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
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
                onClick={() => void handleAddHoliday()}
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
              {currentHoliday.type?.toLowerCase() === 'federal' && (
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
                  >
                    {holidayStatusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
                  >
                    {holidayTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {currentHoliday.type?.toLowerCase() !== 'federal' && (
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
                onClick={() => void handleEditHoliday()}
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
                  onChange={(e) => setFederalYear(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                >
                  {yearChoices.map((year) => (
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
                onClick={() => void handleAddFederalHolidays()}
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
                onClick={() => void confirmRangeAdd()}
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

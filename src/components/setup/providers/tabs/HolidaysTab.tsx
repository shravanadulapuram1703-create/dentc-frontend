import { useCallback, useEffect, useState } from "react";
import { Calendar, Edit, Trash2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  listProviderHolidays,
  createProviderHoliday,
  updateProviderHoliday,
  deleteProviderHoliday,
} from "@/api/generated/endpoints/provider-setup/provider-setup";
import type { ProviderHolidayRead } from "@/api/generated/model";
import { accountSetupLookups } from "../../../../services/accountSetupApi";
import type { LookupOption } from "../../../../services/accountSetupTransform";

interface HolidaysTabProps {
  providerId: string;
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

type Draft = {
  id: number | null;
  holiday_date: string;
  holiday_name: string;
  status: string;
  holiday_type: string;
  is_recurring: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  holiday_date: "",
  holiday_name: "",
  status: "CLOSED",
  holiday_type: "Custom",
  is_recurring: false,
});

/** Provider-scoped time off — CRUD on /providers/{id}/holidays. */
export default function HolidaysTab({ providerId }: HolidaysTabProps) {
  const [rows, setRows] = useState<ProviderHolidayRead[]>([]);
  const [statusOptions, setStatusOptions] = useState<LookupOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rowsRes, statuses, types] = await Promise.all([
        listProviderHolidays(providerId),
        statusOptions.length ? Promise.resolve(statusOptions) : accountSetupLookups.holidayStatuses(),
        typeOptions.length ? Promise.resolve(typeOptions) : accountSetupLookups.holidayTypes(),
      ]);
      setRows([...(rowsRes ?? [])].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
      if (!statusOptions.length) setStatusOptions(statuses);
      if (!typeOptions.length) setTypeOptions(types);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load holidays");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () =>
    setDraft({ ...emptyDraft(), status: statusOptions[0]?.value ?? "CLOSED", holiday_type: typeOptions[0]?.value ?? "Custom" });

  const openEdit = (r: ProviderHolidayRead) =>
    setDraft({
      id: r.id,
      holiday_date: r.holiday_date.slice(0, 10),
      holiday_name: r.holiday_name,
      status: r.status ?? "CLOSED",
      holiday_type: r.holiday_type ?? "Custom",
      is_recurring: r.is_recurring,
    });

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.holiday_name.trim() || !draft.holiday_date) {
      toast.error("Holiday name and date are required");
      return;
    }
    setSaving(true);
    try {
      if (draft.id == null) {
        await createProviderHoliday(providerId, {
          holiday_date: draft.holiday_date,
          holiday_name: draft.holiday_name.trim(),
          status: draft.status || null,
          holiday_type: draft.holiday_type || null,
          is_recurring: draft.is_recurring,
        });
        toast.success("Holiday added");
      } else {
        await updateProviderHoliday(providerId, draft.id, {
          holiday_date: draft.holiday_date,
          holiday_name: draft.holiday_name.trim(),
          status: draft.status || null,
          holiday_type: draft.holiday_type || null,
          is_recurring: draft.is_recurring,
        });
        toast.success("Holiday updated");
      }
      setDraft(null);
      await load();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: ProviderHolidayRead) => {
    if (!confirm(`Delete holiday "${r.holiday_name}"?`)) return;
    setBusyId(r.id);
    try {
      await deleteProviderHoliday(providerId, r.id);
      toast.success("Holiday deleted");
      await load();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load holidays</p>
        <p className="text-xs text-[#64748B] max-w-md">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Provider Holidays</h3>
          <p className="text-xs text-[#64748B]">Time off / non-working days specific to this provider.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Holiday
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-[#64748B]">
          <Loader2 className="w-7 h-7 animate-spin text-[#3A6EA5]" />
          <span className="text-sm font-bold">Loading holidays…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-sm text-[#64748B] font-bold">
          No holidays for this provider yet.
        </div>
      ) : (
        <div className="overflow-auto border border-[#E2E8F0] rounded-lg">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Date", "Holiday", "Status", "Type", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#F7F9FC] transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                    {new Date(r.holiday_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1E293B]">
                    {r.holiday_name}
                    {r.is_recurring && (
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded">
                        Recurring
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">
                    {statusOptions.find((o) => o.value === r.status)?.label ?? r.status ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">
                    {typeOptions.find((o) => o.value === r.holiday_type)?.label ?? r.holiday_type ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-[#E8EFF7]" title="Edit">
                        <Edit className="w-4 h-4 text-[#3A6EA5]" />
                      </button>
                      <button
                        onClick={() => void handleDelete(r)}
                        disabled={busyId === r.id}
                        className="p-2 rounded-lg hover:bg-[#FEE2E2] disabled:opacity-40"
                        title="Delete"
                      >
                        {busyId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-[#DC2626]" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {draft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between bg-[#3A6EA5] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-bold">{draft.id == null ? "Add Holiday" : "Edit Holiday"}</h3>
              <button onClick={() => setDraft(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Holiday Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={draft.holiday_name}
                  onChange={(e) => setDraft({ ...draft, holiday_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={draft.holiday_date}
                  onChange={(e) => setDraft({ ...draft, holiday_date: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">Status</label>
                  <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={inputCls}>
                    {statusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">Type</label>
                  <select value={draft.holiday_type} onChange={(e) => setDraft({ ...draft, holiday_type: e.target.value })} className={inputCls}>
                    {typeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#1E293B]">
                <input
                  type="checkbox"
                  checked={draft.is_recurring}
                  onChange={(e) => setDraft({ ...draft, is_recurring: e.target.checked })}
                  className="w-4 h-4"
                />
                Recurring yearly
              </label>
            </div>
            <div className="bg-[#F7F9FC] px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setDraft(null)}
                disabled={saving}
                className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg font-bold text-sm hover:bg-[#E8EFF7] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg font-bold text-sm hover:bg-[#1F3A5F] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                {draft.id == null ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

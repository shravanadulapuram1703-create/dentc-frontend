import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  listProviderRouteSlips,
  createProviderRouteSlip,
  updateProviderRouteSlip,
  deleteProviderRouteSlip,
} from "@/api/generated/endpoints/staff/staff";
import type { ProviderRouteSlipRead } from "@/api/generated/model";

interface RouteSlipsTabProps {
  providerId: string;
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

/** CRUD on /provider-route-slips — the provider's default route-slip procedures. */
export default function RouteSlipsTab({ providerId }: RouteSlipsTabProps) {
  const [rows, setRows] = useState<ProviderRouteSlipRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newTimes, setNewTimes] = useState("1");
  const [adding, setAdding] = useState(false);

  const [edits, setEdits] = useState<Record<number, { procedure_code: string; num_times: number }>>(
    {},
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProviderRouteSlips({ provider_id: providerId, size: 200 });
      setRows(res.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load route slips");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!newCode.trim()) {
      toast.error("Procedure code is required");
      return;
    }
    setAdding(true);
    try {
      await createProviderRouteSlip({
        provider_id: providerId,
        procedure_code: newCode.trim(),
        num_times: Number(newTimes) || 1,
      });
      toast.success("Route slip added");
      setNewCode("");
      setNewTimes("1");
      await load();
    } catch (e: unknown) {
      toast.error("Add failed", {
        description: e instanceof Error ? e.message : "Could not add route slip",
      });
    } finally {
      setAdding(false);
    }
  };

  const draftFor = (row: ProviderRouteSlipRead) =>
    edits[row.id] ?? { procedure_code: row.procedure_code ?? "", num_times: row.num_times };

  const isDirty = (row: ProviderRouteSlipRead) => {
    const d = edits[row.id];
    if (!d) return false;
    return d.procedure_code !== (row.procedure_code ?? "") || d.num_times !== row.num_times;
  };

  const handleSaveRow = async (row: ProviderRouteSlipRead) => {
    const d = draftFor(row);
    setBusyId(row.id);
    try {
      await updateProviderRouteSlip(row.id, {
        procedure_code: d.procedure_code.trim() || null,
        num_times: d.num_times,
      });
      toast.success("Route slip updated");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (e: unknown) {
      toast.error("Update failed", {
        description: e instanceof Error ? e.message : "Could not update route slip",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row: ProviderRouteSlipRead) => {
    if (!confirm(`Delete route slip ${row.procedure_code ?? ""}?`)) return;
    setBusyId(row.id);
    try {
      await deleteProviderRouteSlip(row.id);
      toast.success("Route slip deleted");
      await load();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete route slip",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load route slips</p>
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
      <div>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Route Slips</h3>
        <p className="text-xs text-[#64748B]">
          Default procedures placed on this provider's route slip and how many times each appears.
        </p>
      </div>

      {/* Add row */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end p-3 bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg">
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
            Procedure Code
          </label>
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="e.g., D0120"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1"># Times</label>
          <input
            type="number"
            min={1}
            value={newTimes}
            onChange={(e) => setNewTimes(e.target.value)}
            className={inputCls}
          />
        </div>
        <button
          onClick={() => void handleAdd()}
          disabled={adding}
          className="inline-flex items-center gap-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-[#64748B]">
          <Loader2 className="w-7 h-7 animate-spin text-[#3A6EA5]" />
          <span className="text-sm font-bold">Loading route slips…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-sm text-[#64748B] font-bold">
          No route slip entries for this provider yet.
        </div>
      ) : (
        <div className="overflow-auto border border-[#E2E8F0] rounded-lg">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Procedure Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  # Times
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rows.map((row) => {
                const d = draftFor(row);
                return (
                  <tr key={row.id} className="hover:bg-[#F7F9FC] transition-colors">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={d.procedure_code}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draftFor(row), procedure_code: e.target.value },
                          }))
                        }
                        className="w-full px-2 py-1.5 border-2 border-[#E2E8F0] rounded text-sm focus:outline-none focus:border-[#3A6EA5]"
                      />
                    </td>
                    <td className="px-4 py-2 w-32">
                      <input
                        type="number"
                        min={1}
                        value={d.num_times}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: {
                              ...draftFor(row),
                              num_times: Number(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-full px-2 py-1.5 border-2 border-[#E2E8F0] rounded text-sm focus:outline-none focus:border-[#3A6EA5]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => void handleSaveRow(row)}
                          disabled={!isDirty(row) || busyId === row.id}
                          className="p-2 rounded-lg hover:bg-[#E8EFF7] transition-colors disabled:opacity-40"
                          title="Save"
                        >
                          {busyId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" />
                          ) : (
                            <Save className="w-4 h-4 text-[#3A6EA5]" />
                          )}
                        </button>
                        <button
                          onClick={() => void handleDelete(row)}
                          disabled={busyId === row.id}
                          className="p-2 rounded-lg hover:bg-[#FEE2E2] transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-[#DC2626]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

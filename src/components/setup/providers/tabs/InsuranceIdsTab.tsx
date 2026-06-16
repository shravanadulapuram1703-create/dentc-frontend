import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  listProviderInsuranceIds,
  createProviderInsuranceId,
  updateProviderInsuranceId,
  deleteProviderInsuranceId,
} from "@/api/generated/endpoints/staff/staff";
import { listInsuranceCarriers } from "@/api/generated/endpoints/insurance/insurance";
import type { ProviderInsuranceIdRead, InsuranceCarrierRead } from "@/api/generated/model";

interface InsuranceIdsTabProps {
  providerId: string;
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

/** CRUD on /provider-insurance-ids — the carrier-specific provider IDs (INS-IDS). */
export default function InsuranceIdsTab({ providerId }: InsuranceIdsTabProps) {
  const [rows, setRows] = useState<ProviderInsuranceIdRead[]>([]);
  const [carriers, setCarriers] = useState<InsuranceCarrierRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // New-row draft.
  const [newCarrierId, setNewCarrierId] = useState<string>("");
  const [newInsId, setNewInsId] = useState("");
  const [newInNetwork, setNewInNetwork] = useState(true);
  const [adding, setAdding] = useState(false);

  // Per-row edit drafts (ins_id + in_network).
  const [edits, setEdits] = useState<Record<number, { ins_id: string; in_network: boolean }>>({});

  const carrierName = useCallback(
    (id: number) => carriers.find((c) => c.id === id)?.name ?? `Carrier ${id}`,
    [carriers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [insRes, carrierRes] = await Promise.all([
        listProviderInsuranceIds({ provider_id: providerId, size: 200 }),
        carriers.length
          ? Promise.resolve({ items: carriers })
          : listInsuranceCarriers({ size: 200 }),
      ]);
      setRows(insRes.items ?? []);
      if (!carriers.length) setCarriers(carrierRes.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load insurance IDs");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!newCarrierId) {
      toast.error("Select a carrier");
      return;
    }
    setAdding(true);
    try {
      await createProviderInsuranceId({
        provider_id: providerId,
        carrier_id: Number(newCarrierId),
        ins_id: newInsId.trim() || null,
        in_network: newInNetwork,
      });
      toast.success("Insurance ID added");
      setNewCarrierId("");
      setNewInsId("");
      setNewInNetwork(true);
      await load();
    } catch (e: unknown) {
      toast.error("Add failed", {
        description: e instanceof Error ? e.message : "Could not add insurance ID",
      });
    } finally {
      setAdding(false);
    }
  };

  const draftFor = (row: ProviderInsuranceIdRead) =>
    edits[row.id] ?? { ins_id: row.ins_id ?? "", in_network: row.in_network };

  const isDirty = (row: ProviderInsuranceIdRead) => {
    const d = edits[row.id];
    if (!d) return false;
    return d.ins_id !== (row.ins_id ?? "") || d.in_network !== row.in_network;
  };

  const handleSaveRow = async (row: ProviderInsuranceIdRead) => {
    const d = draftFor(row);
    setBusyId(row.id);
    try {
      await updateProviderInsuranceId(row.id, {
        ins_id: d.ins_id.trim() || null,
        in_network: d.in_network,
      });
      toast.success("Insurance ID updated");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (e: unknown) {
      toast.error("Update failed", {
        description: e instanceof Error ? e.message : "Could not update insurance ID",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row: ProviderInsuranceIdRead) => {
    if (!confirm(`Delete insurance ID for ${carrierName(row.carrier_id)}?`)) return;
    setBusyId(row.id);
    try {
      await deleteProviderInsuranceId(row.id);
      toast.success("Insurance ID deleted");
      await load();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete insurance ID",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Carriers not yet used by this provider (avoid obvious duplicates in the picker).
  const availableCarriers = useMemo(() => {
    const used = new Set(rows.map((r) => r.carrier_id));
    return carriers.filter((c) => !used.has(c.id));
  }, [carriers, rows]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load insurance IDs</p>
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
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Insurance IDs</h3>
        <p className="text-xs text-[#64748B]">Carrier-specific provider IDs and in-network status.</p>
      </div>

      {/* Add row */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_auto_auto] gap-3 items-end p-3 bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg">
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Carrier</label>
          <select
            value={newCarrierId}
            onChange={(e) => setNewCarrierId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select carrier…</option>
            {availableCarriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Insurance ID</label>
          <input
            type="text"
            value={newInsId}
            onChange={(e) => setNewInsId(e.target.value)}
            placeholder="Provider's ID with carrier"
            className={inputCls}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-[#1E293B] pb-2">
          <input
            type="checkbox"
            checked={newInNetwork}
            onChange={(e) => setNewInNetwork(e.target.checked)}
            className="w-4 h-4"
          />
          In-network
        </label>
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
          <span className="text-sm font-bold">Loading insurance IDs…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-sm text-[#64748B] font-bold">
          No insurance IDs for this provider yet.
        </div>
      ) : (
        <div className="overflow-auto border border-[#E2E8F0] rounded-lg">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Carrier
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Insurance ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  In-network
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
                    <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                      {carrierName(row.carrier_id)}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={d.ins_id}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draftFor(row), ins_id: e.target.value },
                          }))
                        }
                        className="w-full px-2 py-1.5 border-2 border-[#E2E8F0] rounded text-sm focus:outline-none focus:border-[#3A6EA5]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={d.in_network}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draftFor(row), in_network: e.target.checked },
                          }))
                        }
                        className="w-4 h-4"
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

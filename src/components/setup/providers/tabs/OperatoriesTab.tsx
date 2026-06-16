import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import {
  listOffices,
  listOperatories,
  updateOperatory,
} from "@/api/generated/endpoints/organization/organization";
import type { OfficeRead, OperatoryRead } from "@/api/generated/model";

interface OperatoriesTabProps {
  providerId: string;
  homeOfficeId: number | null;
}

/**
 * Operatories carry a single default `provider_id`. From the provider's view we
 * list operatories (optionally scoped to one office) and let the user set/clear
 * `provider_id` to this provider. Assigning an operatory that belongs to another
 * provider reassigns it — surfaced in the UI copy below.
 */
export default function OperatoriesTab({ providerId, homeOfficeId }: OperatoriesTabProps) {
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [operatories, setOperatories] = useState<OperatoryRead[]>([]);
  const [officeFilter, setOfficeFilter] = useState<number | "all">(homeOfficeId ?? "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const officeName = useCallback(
    (id: number) => offices.find((o) => o.id === id)?.name ?? String(id),
    [offices],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offRes, opRes] = await Promise.all([
        offices.length ? Promise.resolve({ items: offices }) : listOffices({ size: 200 }),
        listOperatories({
          size: 200,
          ...(officeFilter !== "all" ? { office_id: officeFilter } : {}),
        }),
      ]);
      if (!offices.length) setOffices(offRes.items ?? []);
      setOperatories(opRes.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load operatories");
    } finally {
      setLoading(false);
    }
    // offices intentionally excluded — only re-load on filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (op: OperatoryRead) => {
    const assignedToMe = op.provider_id === providerId;
    setBusyId(op.id);
    try {
      await updateOperatory(op.id, { provider_id: assignedToMe ? null : providerId });
      setOperatories((prev) =>
        prev.map((o) =>
          o.id === op.id ? { ...o, provider_id: assignedToMe ? null : providerId } : o,
        ),
      );
      toast.success(assignedToMe ? "Operatory unassigned" : "Operatory assigned");
    } catch (e: unknown) {
      toast.error("Update failed", {
        description: e instanceof Error ? e.message : "Could not update operatory",
      });
    } finally {
      setBusyId(null);
    }
  };

  const sorted = useMemo(
    () => [...operatories].sort((a, b) => a.display_order - b.display_order),
    [operatories],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load operatories</p>
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">
            Assigned Operatories
          </h3>
          <p className="text-xs text-[#64748B]">
            Set this provider as an operatory's default. Each operatory has one default provider —
            assigning one already used by another provider will reassign it.
          </p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Office</label>
          <select
            value={officeFilter === "all" ? "all" : String(officeFilter)}
            onChange={(e) =>
              setOfficeFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
          >
            <option value="all">All Offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#64748B]">
          <Loader2 className="w-7 h-7 animate-spin text-[#3A6EA5]" />
          <span className="text-sm font-bold">Loading operatories…</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#64748B] font-bold">
          No operatories found for this office.
        </div>
      ) : (
        <div className="overflow-auto border border-[#E2E8F0] rounded-lg">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Operatory (ID)
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Office
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Default Provider
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sorted.map((op) => {
                const assignedToMe = op.provider_id === providerId;
                const assignedToOther = op.provider_id != null && !assignedToMe;
                return (
                  <tr key={op.id} className="hover:bg-[#F7F9FC] transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                      {op.name} <span className="text-[#94A3B8] font-normal">({op.id})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">{officeName(op.office_id)}</td>
                    <td className="px-4 py-3 text-sm">
                      {assignedToMe ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                          <Check className="w-3 h-3" /> This provider
                        </span>
                      ) : assignedToOther ? (
                        <span className="text-xs text-[#94A3B8]">{op.provider_id}</span>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void toggle(op)}
                        disabled={busyId === op.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                          assignedToMe
                            ? "border-2 border-[#DC2626] text-[#DC2626] hover:bg-[#FEE2E2]"
                            : "bg-[#3A6EA5] text-white hover:bg-[#1F3A5F]"
                        }`}
                      >
                        {busyId === op.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : assignedToMe ? (
                          "Unassign"
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> Assign
                          </>
                        )}
                      </button>
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

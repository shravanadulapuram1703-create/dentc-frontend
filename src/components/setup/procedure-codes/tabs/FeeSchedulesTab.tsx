import { useCallback, useEffect, useState } from "react";
import { Loader2, DollarSign } from "lucide-react";
import {
  listFeeScheduleEntries,
  listFeeSchedules,
} from "@/api/generated/endpoints/procedures/procedures";
import type { FeeScheduleEntryRead, FeeScheduleRead } from "@/api/generated/model";
import { formatFee } from "../procedureCodeData";

interface FeeSchedulesTabProps {
  /** The procedure code; fee-schedule entries are keyed by `procedure_code`. */
  code: string;
}

/**
 * Per-procedure fee view. Lists every fee-schedule entry for this code, joined to
 * its schedule name + type. Read-only here — schedule pricing is authored in
 * Fee Schedule Setup (/setup/fee-schedules/fee-schedule-setup), mirroring the
 * legacy "Fee Schedules" tab which was a view of the same data.
 */
export default function FeeSchedulesTab({ code }: FeeSchedulesTabProps) {
  const [entries, setEntries] = useState<FeeScheduleEntryRead[]>([]);
  const [schedules, setSchedules] = useState<Map<number, FeeScheduleRead>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entryRes, schedRes] = await Promise.all([
        listFeeScheduleEntries({ procedure_code: code, size: 200, sort: "fee_schedule_id", order: "asc" }),
        listFeeSchedules({ size: 200 }).catch(() => null),
      ]);
      setEntries(entryRes.items ?? []);
      const map = new Map<number, FeeScheduleRead>();
      for (const s of schedRes?.items ?? []) map.set(s.id, s);
      setSchedules(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load fee schedules");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-[#64748B]">
        <Loader2 className="w-6 h-6 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading fee schedules…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load fee schedules</p>
        <p className="text-xs text-[#64748B] max-w-md">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-1 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#64748B]">
          Pricing for <span className="font-bold text-[#1F3A5F]">{code}</span> across fee schedules.
          Edit amounts in{" "}
          <a href="/setup/fee-schedules/fee-schedule-setup" className="text-[#3A6EA5] font-bold hover:underline">
            Fee Schedule Setup
          </a>
          .
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <DollarSign className="w-10 h-10 text-[#CBD5E1]" />
          <p className="text-sm font-bold text-[#64748B]">No fee-schedule entries for this code</p>
          <p className="text-xs text-[#94A3B8] max-w-md">
            This procedure isn't priced on any fee schedule yet. Add an entry in Fee Schedule Setup.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border-2 border-[#E2E8F0]">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Schedule", "Type", "Patient Fee", "Insurance Fee", "Effective"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {entries.map((e) => {
                const sched = schedules.get(e.fee_schedule_id);
                return (
                  <tr key={e.id} className="hover:bg-[#F7F9FC] transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                      {sched?.name ?? `Schedule #${e.fee_schedule_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">{sched?.fee_type ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#1E293B] tabular-nums">
                      {formatFee(e.patient_fee)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1E293B] tabular-nums">
                      {formatFee(e.insurance_fee)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{e.effective_date ?? "—"}</td>
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

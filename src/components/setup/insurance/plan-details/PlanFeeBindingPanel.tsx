// Read-only "Fee schedule in effect" panel for an insurance plan (FE-PR-53,
// docs/pricing §3.5). Shows which fee schedule prices this plan through the
// payer tiers (plan-keyed, else carrier-keyed) — the plan wizard NEVER picks a
// schedule; bindings are owned by Fee Schedule Assignments, which this deep-links
// to. Nothing here writes.

import { usePlanFeeBinding, feeSourceLabel } from "@/features/pricing";

export default function PlanFeeBindingPanel({ planId }: { planId: number }) {
  const { binding, isLoading } = usePlanFeeBinding(planId);

  return (
    <div className="mt-4 rounded-lg border-2 border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Fee schedule in effect</h4>
        <a href="/setup/fee-schedules/fee-schedule-assignments" className="text-[11px] font-bold text-[#3A6EA5] hover:underline">
          Manage in Assignments →
        </a>
      </div>
      {isLoading ? (
        <p className="text-xs text-[#94A3B8]">Loading…</p>
      ) : binding?.bound ? (
        <p className="text-xs text-[#64748B]">
          Priced by{" "}
          <span className="font-bold text-[#1E293B]">
            {binding.fee_schedule_name ?? `Schedule #${binding.fee_schedule_id}`}
          </span>{" "}
          via {feeSourceLabel(binding.fee_source)}
          {binding.fee_schedule_active === false && (
            <span className="ml-1.5 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">RETIRED</span>
          )}
          .
        </p>
      ) : (
        <p className="text-xs text-[#64748B]">
          No payer binding names this plan — charges fall through to the patient's or office's fee
          schedule. Add a plan- or carrier-keyed assignment to bind a contracted list.
        </p>
      )}
    </div>
  );
}

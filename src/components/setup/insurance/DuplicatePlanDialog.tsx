// The blocking half of duplicate-plan validation: shown when a save would create
// (or rename a plan onto) a group number an active plan already uses.
//
// Deliberately NOT a silent refusal. Legacy lets staff proceed — two offices can
// legitimately hold separate plans on one group — so this states the collision,
// offers the existing plan as the better answer, and requires an explicit
// "create anyway" for the duplicate. Same dialog on both hosts.

import { AlertTriangle, X, CornerDownLeft } from "lucide-react";
import type { InsurancePlanRead } from "@/api/generated/model";
import { carrierRecord, employerName } from "./lookupService";

interface Props {
  groupNumber: string;
  duplicates: InsurancePlanRead[];
  /** "create" on a new plan, "save" when an edit renames onto an existing group. */
  intent?: "create" | "save";
  /** Adopt the existing plan instead — hidden when the host can't. */
  onUse?: (plan: InsurancePlanRead) => void;
  useLabel?: string;
  onProceed: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export default function DuplicatePlanDialog({
  groupNumber,
  duplicates,
  intent = "create",
  onUse,
  useLabel = "Use this plan",
  onProceed,
  onCancel,
  busy = false,
}: Props) {
  const many = duplicates.length > 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />
      <div className="relative w-[760px] max-w-full rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#D97706] to-[#B45309] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wide">Duplicate Group Number</span>
          </div>
          <button onClick={onCancel} disabled={busy} className="rounded px-1.5 py-0.5 hover:bg-white/15 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          <p className="mb-3 text-sm text-[#1F3A5F]">
            {many ? `${duplicates.length} active plans already use` : "An active plan already uses"} group
            number <strong>{groupNumber}</strong>. Use the existing plan where you can — creating another
            leaves duplicate master data behind.
          </p>

          <div className="overflow-auto rounded-md border-2 border-[#FDE68A]">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-[#FEF3C7] text-[#92400E]">
                <tr>
                  {["Group Number", "Plan ID", "Employer", "Plan Type", "Carrier Name"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-1.5 font-bold uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                  {onUse && <th className="px-3 py-1.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FDE68A]">
                {duplicates.map((p) => (
                  <tr key={p.id} className="bg-[#FFFBEB]">
                    <td className="px-3 py-1.5 font-bold text-[#1E293B]">{p.group_number || "—"}</td>
                    <td className="px-3 py-1.5 text-[#1F6FB2]">{p.id}</td>
                    <td className="px-3 py-1.5 text-[#475569]">
                      {p.employer_id == null ? "No Employer" : employerName(p.employer_id)}
                    </td>
                    <td className="px-3 py-1.5 text-[#475569]">{p.plan_type || "—"}</td>
                    <td className="px-3 py-1.5 text-[#1E293B]">
                      {carrierRecord(p.carrier_id)?.name ?? `#${p.carrier_id}`}
                    </td>
                    {onUse && (
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => onUse(p)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[#B45309] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#92400E] disabled:opacity-50"
                        >
                          <CornerDownLeft className="h-3 w-3" /> {useLabel}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-lg border-t-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border-2 border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-50"
          >
            Back to form
          </button>
          <button
            onClick={onProceed}
            disabled={busy}
            className="rounded-lg border-2 border-[#B45309] px-4 py-2 text-sm font-bold text-[#B45309] hover:bg-[#FEF3C7] disabled:opacity-50"
          >
            {intent === "create" ? "Create duplicate anyway" : "Save anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}

// "POSSIBLE PLAN MATCHES" — the panel the legacy Add New Insurance Plan screen
// drops under the Group No. field once four or more characters are typed. It
// exists to stop staff creating a duplicate plan for a group that is already on
// file, so each row can be adopted outright instead of re-keyed.
//
// Rendered by PlanFormFields, and therefore shown on BOTH hosts (Setup →
// Insurance → Plans and the patient Add New Ins Plan modal).

import { Loader2, X, CornerDownLeft } from "lucide-react";
import type { InsurancePlanRead } from "@/api/generated/model";
import { carrierRecord, employerName } from "./lookupService";

/** Legacy waits for four characters before searching. */
export const MIN_GROUP_SEARCH_CHARS = 4;

interface Props {
  query: string;
  loading: boolean;
  matches: InsurancePlanRead[];
  /** How many server hits were dropped because they matched on carrier/payer, not group. */
  filteredOut: number;
  /** Present when the host can adopt an existing plan instead of creating one. */
  onUse?: (plan: InsurancePlanRead) => void;
  /** Wording for the adopt action — hosts mean different things by it. */
  useLabel?: string;
  /** True when an existing plan is being edited, so "create" wording is wrong. */
  editing?: boolean;
  onDismiss: () => void;
}

export default function PossiblePlanMatches({
  query,
  loading,
  matches,
  filteredOut,
  onUse,
  useLabel = "Use this plan",
  editing = false,
  onDismiss,
}: Props) {
  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border-2 border-[#E2E8F0] bg-[#F7F9FC] px-3 py-2 text-xs text-[#64748B]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking for plans with group &lsquo;{query}&rsquo;…
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border-2 border-[#E2E8F0] bg-[#F7F9FC] px-3 py-2 text-xs text-[#64748B]">
        <span>
          {editing
            ? `No other plan uses group ‘${query}’.`
            : `No existing plan uses group ‘${query}’ — safe to create a new one.`}
        </span>
        <DismissButton onDismiss={onDismiss} />
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border-2 border-[#F59E0B] bg-[#FFFBEB]">
      <div className="flex items-center justify-between gap-2 border-b-2 border-[#FDE68A] px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#B45309]">
          Possible Plan Matches ({matches.length})
        </span>
        <DismissButton onDismiss={onDismiss} />
      </div>

      <div className="max-h-52 overflow-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="sticky top-0 bg-[#FEF3C7] text-[#92400E]">
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
            {matches.map((p) => (
              <tr key={p.id} className="hover:bg-[#FEF3C7]/60">
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
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[#B45309] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#92400E]"
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

      <p className="border-t-2 border-[#FDE68A] px-3 py-1.5 text-[11px] text-[#92400E]">
        {editing
          ? "Other plans already use this group number."
          : "Review these before creating a new plan for the same group."}
        {filteredOut > 0 && (
          <>
            {" "}
            <span className="text-[#B45309]/80">
              ({filteredOut} further result{filteredOut === 1 ? "" : "s"} matched a carrier or payer id
              rather than the group number and {filteredOut === 1 ? "is" : "are"} not listed.)
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      title="Dismiss"
      aria-label="Dismiss possible plan matches"
      className="rounded p-0.5 text-[#92400E] hover:bg-black/10"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

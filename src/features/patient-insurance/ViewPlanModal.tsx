// "VIEW PLAN" popup — opened from the eye button beside PLAN ID on the insurance
// screen's left rail. Shows the selected insurance plan's full configuration
// read-only — all four INSURANCE DETAILS tabs (plan, benefits, coverage &
// limitations, frequency code groups) — so staff can check what they've
// linked, and what the ledger estimate will be computed from, without leaving
// the patient.
//
// Read-only: an insurance_plan is shared by every patient linked to it. The
// footer hands off to the Edit Plan popup (which shows who else is linked and
// confirms before writing) and to Setup → Insurance → Plans.

import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil } from "lucide-react";
import InsuranceDetailsWizard from "@/components/setup/insurance/plan-details/InsuranceDetailsWizard";

interface Props {
  planId: number;
  onClose: () => void;
  /** Switch to the Edit Plan popup for the same plan. */
  onEdit?: () => void;
}

export default function ViewPlanModal({ planId, onClose, onEdit }: Props) {
  const navigate = useNavigate();
  return (
    <InsuranceDetailsWizard
      mode="view"
      plan_id={planId}
      onClose={onClose}
      viewFooter={
        <span className="inline-flex flex-wrap items-center gap-2">
          Shared plan — changes reach every linked patient.
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded border border-[#1F6FB2] px-2 py-0.5 font-bold text-[#1F6FB2] hover:bg-[#E8EFF7]"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Plan
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/setup/insurance/insurance-plans?plan_id=${planId}`)}
            className="inline-flex items-center gap-1 font-bold text-[#1F6FB2] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Setup
          </button>
        </span>
      }
    />
  );
}

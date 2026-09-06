// "VIEW PLAN" popup — opened from the eye button beside PLAN ID on the insurance
// screen's left rail. Shows the selected insurance plan's full configuration
// read-only — all four INSURANCE DETAILS tabs (plan, benefits, coverage &
// limitations, frequency code groups) — so staff can check what they've
// linked, and what the ledger estimate will be computed from, without leaving
// the patient.
//
// Read-only on purpose: an insurance_plan is shared by every patient linked to
// it, so editing one here would silently change other patients' coverage. The
// footer points at Setup → Insurance → Plans, which is the place that edits it.

import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import InsuranceDetailsWizard from "@/components/setup/insurance/plan-details/InsuranceDetailsWizard";

interface Props {
  planId: number;
  onClose: () => void;
}

export default function ViewPlanModal({ planId, onClose }: Props) {
  const navigate = useNavigate();
  return (
    <InsuranceDetailsWizard
      mode="view"
      plan_id={planId}
      onClose={onClose}
      viewFooter={
        <span className="inline-flex items-center gap-2">
          Shared plan — edit it in Setup so every linked patient stays consistent.
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

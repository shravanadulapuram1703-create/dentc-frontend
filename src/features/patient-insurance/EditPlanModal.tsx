// "EDIT PLAN" popup — opened from the pencil beside PLAN ID on the insurance
// screen's left rail (and from the View Plan popup's footer).
//
// Renders the shared legacy INSURANCE DETAILS wizard in edit mode — the very
// same component Setup → Insurance → Plans uses — so a plan edited from the
// patient carries exactly the same rules (validation, duplicate-group check,
// diff-saved coverage table) as an edit made in Setup.
//
// An insurance_plan row is shared by every patient linked to it, so this host
// adds two things Setup does not need:
//   • an impact banner — how many patients / claims sit on the plan today, so
//     staff know who else the change reaches (counts come from the
//     patient-insurance and insurance-claims list totals; no usage endpoint
//     exists — see EDIT-PLAN-2 in the dev report);
//   • a confirmation before FINISH whenever more than this one patient is
//     linked. Nothing is written until the user confirms.
// After FINISH the updated InsurancePlanRead is handed back so the screen can
// refresh the read-only Ind./Fam. benefit columns and the carrier block.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, Loader2, Users, FileText, Check, X } from "lucide-react";
import type { InsurancePlanRead } from "@/api/generated/model";
import InsuranceDetailsWizard from "@/components/setup/insurance/plan-details/InsuranceDetailsWizard";
import { WZ_BTN_DARK, WZ_BTN_PRIMARY } from "@/components/setup/insurance/plan-details/wizardUi";
import { loadPlanUsage, type PlanUsage } from "./patientInsuranceService";

interface Props {
  planId: number;
  /** Carrier name for the banner (already resolved by the screen). */
  carrierName?: string;
  onClose: () => void;
  onSaved: (plan: InsurancePlanRead) => void;
}

export default function EditPlanModal({ planId, carrierName, onClose, onSaved }: Props) {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ resolve: (ok: boolean) => void } | null>(null);
  const usageRef = useRef<PlanUsage | null>(null);

  useEffect(() => {
    let alive = true;
    setUsageLoading(true);
    void loadPlanUsage(planId)
      .then((u) => {
        if (!alive) return;
        usageRef.current = u;
        setUsage(u);
      })
      .finally(() => alive && setUsageLoading(false));
    return () => {
      alive = false;
    };
  }, [planId]);

  // Other patients are on this plan → ask before writing. A count we could not
  // load is treated as "unknown, possibly many" and also asks.
  const confirmFinish = () =>
    new Promise<boolean>((resolve) => {
      const patients = usageRef.current?.patients;
      if (patients != null && patients <= 1) return resolve(true);
      setConfirm({ resolve });
    });

  const answer = (ok: boolean) => {
    confirm?.resolve(ok);
    setConfirm(null);
  };

  const patients = usage?.patients ?? null;
  const claims = usage?.claims ?? null;
  const others = patients == null ? null : Math.max(0, patients - 1);

  const notice: ReactNode = (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#78350F]">
      <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wide">
        <AlertTriangle className="h-3.5 w-3.5" /> Shared plan{carrierName ? ` · ${carrierName}` : ""}
      </span>
      {usageLoading ? (
        <span className="inline-flex items-center gap-1 text-[#92400E]">
          <Loader2 className="h-3 w-3 animate-spin" /> Checking who is linked…
        </span>
      ) : (
        <>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {patients == null ? "Linked patients: unknown" : patients <= 1 ? "Only this patient is linked" : `${patients} patients linked (this one + ${others} more)`}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {claims == null ? "Claims: unknown" : `${claims} claim${claims === 1 ? "" : "s"} on file`}
          </span>
        </>
      )}
      <span className="text-[#92400E]">Benefits, coverage and frequency changes apply to every linked patient and to future estimates.</span>
      <button
        type="button"
        onClick={() => navigate(`/setup/insurance/insurance-plans?plan_id=${planId}`)}
        className="ml-auto inline-flex items-center gap-1 font-bold text-[#1F6FB2] hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Open in Setup
      </button>
    </div>
  );

  return (
    <>
      <InsuranceDetailsWizard mode="edit" plan_id={planId} onClose={onClose} onSaved={(plan) => onSaved(plan)} notice={notice} confirmFinish={confirmFinish} />

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => answer(false)} />
          <div className="relative w-[460px] max-w-full rounded border border-[#CBD5E1] bg-white shadow-2xl">
            <div className="flex items-center gap-2 bg-[#B45309] px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-white">
              <AlertTriangle className="h-4 w-4" /> Update shared plan?
            </div>
            <div className="space-y-2 px-4 py-3 text-[13px] text-[#1E293B]">
              <p>
                Plan <strong>#{planId}</strong>
                {carrierName ? ` (${carrierName})` : ""} is linked to{" "}
                <strong>{patients == null ? "an unknown number of" : patients} patients</strong>
                {claims ? ` and ${claims} claim${claims === 1 ? "" : "s"}` : ""}.
              </p>
              <p>Saving changes the plan for all of them. To change coverage for this patient only, add a new plan instead and link it here.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] bg-[#EEF2F7] px-3 py-2">
              <button type="button" onClick={() => answer(false)} className={WZ_BTN_DARK}>
                <X className="h-3.5 w-3.5" /> Back
              </button>
              <button type="button" onClick={() => answer(true)} className={WZ_BTN_PRIMARY}>
                <Check className="h-3.5 w-3.5" /> {patients == null ? "Update plan" : `Update for all ${patients} patients`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

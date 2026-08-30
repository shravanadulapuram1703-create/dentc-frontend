// "VIEW PLAN" popup — opened from the eye button beside PLAN ID on the insurance
// screen's left rail. Shows the selected insurance plan's full configuration
// read-only, so staff can check what they've linked without leaving the patient.
//
// It renders the SAME `PlanFormFields` the Add New Ins Plan modal and Setup →
// Insurance → Plans use, just disabled — so the plan is presented with identical
// field names, order and formatting wherever it is looked at.
//
// Read-only on purpose: an insurance_plan is shared by every patient linked to
// it, so editing one here would silently change other patients' coverage. The
// footer points at Setup → Insurance → Plans, which is the place that edits it.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Eye, Loader2, ExternalLink, Info } from "lucide-react";
import {
  type PlanForm,
  type PlanCategory,
  PLAN_CATEGORY_LABEL,
  emptyPlanForm,
  planToForm,
  categoryForCarrier,
} from "@/components/setup/insurance/planData";
import PlanFormFields from "@/components/setup/insurance/PlanFormFields";
import { loadPlanContext } from "./patientInsuranceService";

interface Props {
  planId: number;
  onClose: () => void;
}

export default function ViewPlanModal({ planId, onClose }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(() => emptyPlanForm());
  const [category, setCategory] = useState<PlanCategory>("D");
  const [carrierLabel, setCarrierLabel] = useState("");
  const [employerLabel, setEmployerLabel] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { plan, carrier, employer } = await loadPlanContext(planId);
        if (!alive) return;
        if (!plan) {
          setError(`Plan #${planId} could not be loaded.`);
          return;
        }
        setForm(planToForm(plan));
        setCategory(categoryForCarrier(carrier));
        setCarrierLabel(carrier?.name ?? `#${plan.carrier_id}`);
        setEmployerLabel(employer?.name ?? "");
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load the plan");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [planId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[860px] max-w-full rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <span className="text-sm font-bold">
              Insurance Plan #{planId}
              {!loading && !error && ` (${PLAN_CATEGORY_LABEL[category]})`}
            </span>
          </div>
          <button onClick={onClose} className="rounded px-1.5 py-0.5 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#64748B]">
              <Loader2 className="h-5 w-5 animate-spin text-[#3A6EA5]" />
              <span className="text-sm font-bold">Loading plan #{planId}…</span>
            </div>
          ) : error ? (
            <p className="py-12 text-center text-sm text-[#B91C1C]">{error}</p>
          ) : (
            <>
              <h4 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-[#1F6FB2]">
                Plan Information
              </h4>
              <p className="mb-3 flex items-start gap-2 rounded-md border-2 border-[#E2E8F0] bg-[#F7F9FC] px-3 py-2 text-xs text-[#475569]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3A6EA5]" />
                <span>
                  Read-only. This plan is shared by every patient linked to it, so it is edited in
                  Setup → Insurance → Plans rather than here.
                </span>
              </p>

              <PlanFormFields
                form={form}
                onChange={() => undefined}
                category={category}
                onCategoryChange={() => undefined}
                carrierLabel={carrierLabel}
                onCarrierChange={() => undefined}
                employerLabel={employerLabel}
                onEmployerChange={() => undefined}
                showActive
                disabled
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-lg border-t-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3">
          <button
            onClick={() => navigate("/setup/insurance/insurance-plans")}
            className="flex items-center gap-2 rounded-lg border-2 border-[#3A6EA5] px-4 py-2 text-sm font-bold text-[#3A6EA5] hover:bg-[#E8EFF7]"
          >
            <ExternalLink className="h-4 w-4" /> Edit in Setup
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#3A6EA5] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F3A5F]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

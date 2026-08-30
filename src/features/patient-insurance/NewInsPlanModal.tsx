// "ADD NEW INS PLAN" popup — the insurance-plan editor rendered as a modal over
// the patient insurance screen.
//
// The FORM BODY is `PlanFormFields`, the same component Setup → Insurance →
// Plans renders, so both hosts show the same fields with the same behaviour
// (Dental/Medical selector, carrier/employer pickers with + ADD NEW, maximums).
// This modal only supplies the chrome — header, Copy From Existing, footer — and
// the create call, then hands the new InsurancePlanRead back to the caller,
// which selects it into the patient's slot.

import { useState } from "react";
import { Save, X, Loader2, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { createInsurancePlan } from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead } from "@/api/generated/model";
import {
  type PlanForm,
  type PlanCategory,
  PLAN_CATEGORY_LABEL,
  emptyPlanForm,
  planToForm,
  buildPlanCreate,
  categoryForCarrier,
} from "@/components/setup/insurance/planData";
import { carrierRecord, employerName } from "@/components/setup/insurance/lookupService";
import PlanFormFields from "@/components/setup/insurance/PlanFormFields";
import CopyFromExistingDialog from "@/components/setup/insurance/CopyFromExistingDialog";
import DuplicatePlanDialog from "@/components/setup/insurance/DuplicatePlanDialog";
import { findDuplicatePlansByGroup } from "@/components/setup/insurance/planDuplicates";
import type { InsCategory } from "./insuranceModel";

interface Props {
  /** The tab's category — seeds the "Dental or Medical" selector. */
  category: InsCategory;
  onClose: () => void;
  onCreated: (plan: InsurancePlanRead, carrierLabel: string, category: InsCategory) => void;
}

export default function NewInsPlanModal({ category, onClose, onCreated }: Props) {
  const [planCategory, setPlanCategory] = useState<PlanCategory>(category);
  const [form, setForm] = useState<PlanForm>(() => emptyPlanForm());
  const [carrierLabel, setCarrierLabel] = useState("");
  const [employerLabel, setEmployerLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);
  // Active plans already on this group number — blocks the save until resolved.
  const [duplicates, setDuplicates] = useState<InsurancePlanRead[] | null>(null);

  const update = (u: Partial<PlanForm>) => setForm((p) => ({ ...p, ...u }));

  // Seed the whole form from an existing plan. The copy is a plain starting
  // point — nothing is linked to the source plan, and Create still POSTs a new
  // one.
  const handleCopy = (plan: InsurancePlanRead) => {
    const carrier = carrierRecord(plan.carrier_id);
    setForm(planToForm(plan));
    setCarrierLabel(carrier?.name ?? `#${plan.carrier_id}`);
    setEmployerLabel(plan.employer_id == null ? "" : employerName(plan.employer_id));
    // The copied carrier decides the category (plans have no column of their own).
    setPlanCategory(categoryForCarrier(carrier));
    setCopiedFrom(plan.id);
    setShowCopy(false);
    toast.success(`Copied plan #${plan.id}`, { description: "Review the details, then create the new plan." });
  };

  // Group-number smart search turned up a plan already on file: link THAT plan
  // to the patient's slot instead of creating a duplicate. Nothing is POSTed.
  const handleUseExisting = (plan: InsurancePlanRead) => {
    const carrier = carrierRecord(plan.carrier_id);
    const label = carrier?.name ?? `#${plan.carrier_id}`;
    toast.success(`Using existing plan #${plan.id}`, { description: "No duplicate plan was created." });
    onCreated(plan, label, categoryForCarrier(carrier));
  };

  const createPlan = async () => {
    setSaving(true);
    try {
      const created = await createInsurancePlan(buildPlanCreate(form));
      toast.success(`${PLAN_CATEGORY_LABEL[planCategory]} insurance plan created`);
      onCreated(created, carrierLabel, planCategory);
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not create plan" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (form.carrier_id == null) {
      toast.error("Validation Failed", { description: "Carrier is required" });
      return;
    }
    // Duplicate validation: an exact group-number collision stops the save and
    // offers the existing plan. The advisory matches panel can be dismissed or
    // out-of-date, so this re-checks at the moment it matters.
    setSaving(true);
    let dupes: InsurancePlanRead[] = [];
    try {
      dupes = await findDuplicatePlansByGroup(form.group_number);
    } catch {
      // A failed check must not block legitimate work — fall through and create.
      dupes = [];
    } finally {
      setSaving(false);
    }
    if (dupes.length > 0) {
      setDuplicates(dupes);
      return;
    }
    await createPlan();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={saving ? undefined : onClose} />
      <div className="relative w-[860px] max-w-full rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-bold">
              Add New Insurance Plan ({PLAN_CATEGORY_LABEL[planCategory]})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCopy(true)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-[#0f2f52] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide hover:bg-black/30 disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" /> Copy From Existing
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded px-1.5 py-0.5 hover:bg-white/15 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <h4 className="text-[13px] font-bold text-[#1F6FB2] uppercase tracking-wide mb-2">Plan Information</h4>
          {copiedFrom != null && (
            <p className="mb-3 rounded-md border-2 border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1F3A5F]">
              Copied from plan <strong>#{copiedFrom}</strong>. Edit anything below — Create Plan saves a new plan.
            </p>
          )}

          <PlanFormFields
            form={form}
            onChange={update}
            category={planCategory}
            onCategoryChange={setPlanCategory}
            carrierLabel={carrierLabel}
            onCarrierChange={(id, label) => {
              update({ carrier_id: id });
              setCarrierLabel(label);
            }}
            employerLabel={employerLabel}
            onEmployerChange={(id, label) => {
              update({ employer_id: id });
              setEmployerLabel(label);
            }}
            disabled={saving}
            onUseExistingPlan={handleUseExisting}
            useExistingLabel="Use this plan"
            categoryNote={
              planCategory !== category ? (
                <p className="mt-1 text-[11px] text-[#B45309]">
                  This tab records {PLAN_CATEGORY_LABEL[category]} insurance — the plan will still be linked here.
                </p>
              ) : undefined
            }
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Create Plan
          </button>
        </div>
      </div>

      {showCopy && <CopyFromExistingDialog onClose={() => setShowCopy(false)} onCopy={handleCopy} />}

      {duplicates && (
        <DuplicatePlanDialog
          groupNumber={form.group_number.trim()}
          duplicates={duplicates}
          intent="create"
          busy={saving}
          onUse={(plan) => {
            setDuplicates(null);
            handleUseExisting(plan);
          }}
          useLabel="Use this plan"
          onProceed={() => {
            setDuplicates(null);
            void createPlan();
          }}
          onCancel={() => setDuplicates(null)}
        />
      )}
    </div>
  );
}

// "ADD NEW INS PLAN" popup — opened from the patient insurance screen.
//
// Renders the shared legacy INSURANCE DETAILS wizard (PLAN / BENEFITS /
// COVERAGE & LIMITATIONS / FREQ LIMITATION CODE GRP) in create mode — the very
// same component Setup → Insurance → Plans uses — so a plan created from the
// patient carries the full coverage table the ledger's patient / insurance
// estimate split is computed from. On FINISH the new InsurancePlanRead is
// handed back to the caller, which selects it into the patient's slot.

import type { InsurancePlanRead } from "@/api/generated/model";
import { PLAN_CATEGORY_LABEL } from "@/components/setup/insurance/planData";
import InsuranceDetailsWizard from "@/components/setup/insurance/plan-details/InsuranceDetailsWizard";
import { categoryForCarrier } from "@/components/setup/insurance/planData";
import { carrierRecord } from "@/components/setup/insurance/lookupService";
import { toast } from "sonner";
import type { InsCategory } from "./insuranceModel";

interface Props {
  /** The tab's category — seeds the "Dental or Medical" selector. */
  category: InsCategory;
  onClose: () => void;
  onCreated: (plan: InsurancePlanRead, carrierLabel: string, category: InsCategory) => void;
}

export default function NewInsPlanModal({ category, onClose, onCreated }: Props) {
  // Group-number smart search / duplicate dialog turned up a plan already on
  // file: link THAT plan to the patient's slot instead of creating a duplicate.
  const handleUseExisting = (plan: InsurancePlanRead) => {
    const carrier = carrierRecord(plan.carrier_id);
    toast.success(`Using existing plan #${plan.id}`, { description: "No duplicate plan was created." });
    onCreated(plan, carrier?.name ?? `#${plan.carrier_id}`, categoryForCarrier(carrier));
  };

  return (
    <InsuranceDetailsWizard
      mode="create"
      category={category}
      onClose={onClose}
      onSaved={onCreated}
      onUseExisting={handleUseExisting}
      useExistingLabel="Use this plan"
      categoryNote={(planCategory) =>
        planCategory !== category ? (
          <p className="mt-1 text-[11px] text-[#B45309]">
            This tab records {PLAN_CATEGORY_LABEL[category]} insurance — the plan will still be linked here.
          </p>
        ) : undefined
      }
    />
  );
}

// "ADD NEW INS PLAN" popup — a setup-style insurance-plan editor rendered as a
// modal over the patient insurance screen. Reuses the Insurance Setup form
// helpers (PlanForm / buildPlanCreate) and the carrier/employer pickers so the
// formatting matches /setup/insurance/insurance-plans. On save it creates the
// plan and hands the new InsurancePlanRead back to the caller, which selects it.

import { useState } from "react";
import { Save, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { createInsurancePlan } from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead } from "@/api/generated/model";
import {
  type PlanForm,
  emptyPlanForm,
  buildPlanCreate,
  COVERAGE_TYPE_OPTIONS,
} from "@/components/setup/insurance/planData";
import EntityPicker from "@/components/setup/insurance/EntityPicker";
import { searchCarriers, searchEmployers } from "@/components/setup/insurance/lookupService";
import DefinitionField from "@/components/setup/insurance/DefinitionField";
import { INPUT_CLS, Field, MoneyInput } from "./ui";
import type { InsCategory } from "./insuranceModel";

interface Props {
  /** Pre-filter the carrier picker hint by the slot's category. */
  category: InsCategory;
  onClose: () => void;
  onCreated: (plan: InsurancePlanRead, carrierLabel: string) => void;
}

export default function NewInsPlanModal({ category, onClose, onCreated }: Props) {
  const [form, setForm] = useState<PlanForm>(() => emptyPlanForm());
  const [carrierLabel, setCarrierLabel] = useState("");
  const [employerLabel, setEmployerLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (u: Partial<PlanForm>) => setForm((p) => ({ ...p, ...u }));

  const handleSave = async () => {
    if (form.carrier_id == null) {
      toast.error("Validation Failed", { description: "Carrier is required" });
      return;
    }
    setSaving(true);
    try {
      const created = await createInsurancePlan(buildPlanCreate(form));
      toast.success("Insurance plan created");
      onCreated(created, carrierLabel);
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not create plan" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={saving ? undefined : onClose} />
      <div className="relative w-[760px] max-w-full rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-bold">Add New Insurance Plan ({category === "D" ? "Dental" : "Medical"})</span>
          </div>
          <button onClick={onClose} disabled={saving} className="rounded px-1.5 py-0.5 hover:bg-white/15 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Carrier" required>
              <EntityPicker
                valueId={form.carrier_id}
                valueLabel={carrierLabel}
                onChange={(id, label) => {
                  update({ carrier_id: id as number | null });
                  setCarrierLabel(label);
                }}
                search={searchCarriers}
                placeholder="Select carrier…"
              />
            </Field>
            <Field label="Employer">
              <EntityPicker
                valueId={form.employer_id}
                valueLabel={employerLabel}
                onChange={(id, label) => {
                  update({ employer_id: id as number | null });
                  setEmployerLabel(label);
                }}
                search={searchEmployers}
                placeholder="Select employer (optional)…"
                allowClear
              />
            </Field>
            <Field label="Group Number">
              <input type="text" value={form.group_number} onChange={(e) => update({ group_number: e.target.value })} className={INPUT_CLS} />
            </Field>
            <Field label="Plan Type">
              <input type="text" value={form.plan_type} onChange={(e) => update({ plan_type: e.target.value })} className={INPUT_CLS} placeholder="e.g. PPO, HMO, Indemnity" />
            </Field>
            <Field label="Coverage Type">
              <DefinitionField
                groupCode="coverage_type"
                value={form.coverage_type}
                onChange={(v) => update({ coverage_type: v })}
                placeholder="e.g. I, F, C"
                hints={COVERAGE_TYPE_OPTIONS}
              />
            </Field>
            <Field label="Anniversary Date">
              <input type="date" value={form.anniversary_date} onChange={(e) => update({ anniversary_date: e.target.value })} className={INPUT_CLS} />
            </Field>
          </div>

          <h4 className="text-[13px] font-bold text-[#1F6FB2] uppercase tracking-wide mt-5 mb-2">Maximums &amp; Deductibles</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Individual Max"><MoneyInput value={form.individual_max} onChange={(v) => update({ individual_max: v })} /></Field>
            <Field label="Individual Deductible"><MoneyInput value={form.individual_deductible} onChange={(v) => update({ individual_deductible: v })} /></Field>
            <Field label="Ortho Max"><MoneyInput value={form.ortho_max} onChange={(v) => update({ ortho_max: v })} /></Field>
            <Field label="Family Max"><MoneyInput value={form.family_max} onChange={(v) => update({ family_max: v })} /></Field>
            <Field label="Family Deductible"><MoneyInput value={form.family_deductible} onChange={(v) => update({ family_deductible: v })} /></Field>
            <label className="flex items-end gap-2 pb-1.5">
              <input type="checkbox" checked={form.is_prepaid} onChange={(e) => update({ is_prepaid: e.target.checked })} className="w-4 h-4 accent-[#3A6EA5]" />
              <span className="text-sm font-bold text-[#1F3A5F]">Prepaid</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3 rounded-b-lg">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => void handleSave()} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Create Plan
          </button>
        </div>
      </div>
    </div>
  );
}

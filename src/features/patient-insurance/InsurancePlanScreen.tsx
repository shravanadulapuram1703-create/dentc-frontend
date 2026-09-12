// Add/Edit Patient Insurance Plan screen (legacy Denticon parity).
//
// One parametrized component drives all six insurance tabs (Primary/Secondary/
// Third/Fourth Dental + Primary/Secondary Medical). It joins patient_insurance →
// plan/carrier/employer/subscriber for the slot, lets staff search/select or add
// a plan, view or edit that plan (shared INSURANCE DETAILS wizard), edit
// benefit-remaining + eligibility + subscriber details + notes, and saves back
// across patient_insurance + insurance_subscribers.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Save, X, ArrowLeftRight, Printer, CalendarClock } from "lucide-react";
import type { InsurancePlanRead } from "@/api/generated/model";
import {
  type InsCategory,
  type InsOrder,
  type InsuranceForm,
  type PlanDisplay,
  slotFor,
  toggleSlot,
  emptyForm,
  formFromSlot,
  planDisplayFromSlot,
  subscriberFields,
  EMPTY_PLAN_DISPLAY,
} from "./insuranceModel";
import {
  loadSlot,
  loadPlanContext,
  saveSlot,
  getSubscriberById,
} from "./patientInsuranceService";
import InsuranceTabs from "./InsuranceTabs";
import PlanSearchPanel from "./PlanSearchPanel";
import BenefitInformation from "./BenefitInformation";
import EligibilitySection from "./EligibilitySection";
import SubscriberInformation from "./SubscriberInformation";
import NewInsPlanModal from "./NewInsPlanModal";
import ViewPlanModal from "./ViewPlanModal";
import EditPlanModal from "./EditPlanModal";
import { INPUT_CLS } from "./ui";
import { printInsuranceDetails } from "./insurancePrint";
import { openServerReport } from "@/features/print/serverReport";
import { getPatientInsuranceReport } from "@/api/generated/endpoints/patients/patients";
import { useListOffices } from "@/api/generated/endpoints/organization/organization";

interface OutletContext {
  patient: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    dob?: string;
    balance?: number;
    chartNo?: string;
    office?: string;
    officeId?: string;
  };
}

interface Props {
  category: InsCategory;
  order: InsOrder;
}

// MM/DD/YYYY (display) → YYYY-MM-DD (date input). Returns "" if unparseable.
function toIsoDate(d?: string): string {
  if (!d) return "";
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm = "", dd = "", yyyy = ""] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function InsurancePlanScreen({ category, order }: Props) {
  const { patient } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const slot = useMemo(() => slotFor(category, order), [category, order]);
  const patientId = Number(patient.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [form, setForm] = useState<InsuranceForm>(() => emptyForm());
  const [planDisplay, setPlanDisplay] = useState<PlanDisplay>(EMPTY_PLAN_DISPLAY);
  const [showNewPlan, setShowNewPlan] = useState(false);
  // Which popup is open on the selected plan: the read-only viewer or the editor.
  const [planPopup, setPlanPopup] = useState<"view" | "edit" | null>(null);

  const update = useCallback((patch: Partial<InsuranceForm>) => setForm((p) => ({ ...p, ...patch })), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadSlot(patientId, slot);
      setRecordId(data.record?.id ?? null);
      if (data.record || data.subscriber) {
        setForm(formFromSlot(data));
      } else {
        // No record yet — seed a fresh Self subscriber from the patient.
        const [last = "", first = ""] = (patient.name || "").split(",").map((s) => s.trim());
        setForm({
          ...emptyForm(),
          sub_last_name: last,
          sub_first_name: first.replace(/\s*\(.*\)$/, ""),
          sub_dob: toIsoDate(patient.dob),
          sub_gender: patient.gender === "Male" ? "M" : patient.gender === "Female" ? "F" : "",
          relationship: "Self",
        });
      }
      setPlanDisplay(planDisplayFromSlot(data));
    } catch (e) {
      toast.error("Failed to load insurance", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [patientId, slot, patient.name, patient.dob, patient.gender]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelectPlan = async (planId: number) => {
    const ctx = await loadPlanContext(planId);
    setPlanDisplay(planDisplayFromSlot({ record: null, subscriber: null, ...ctx }));
    update({ ins_plan_id: planId, group_number: ctx.plan?.group_number ?? form.group_number });
  };

  const handlePlanCreated = (
    plan: InsurancePlanRead,
    carrierLabel: string,
    planCategory: InsCategory,
  ) => {
    setShowNewPlan(false);
    setPlanDisplay(
      planDisplayFromSlot({ record: null, subscriber: null, plan, carrier: null, employer: null }),
    );
    // Show the carrier name + Dental/Medical type we already have from the modal
    // (the carrier itself isn't re-fetched here).
    setPlanDisplay((pd) => ({
      ...pd,
      carrier_name: carrierLabel,
      carrier_type: planCategory === "D" ? "Dental" : "Medical",
    }));
    update({ ins_plan_id: plan.id, group_number: plan.group_number ?? "" });
  };

  // After Edit Plan → FINISH: re-read plan + carrier + employer so the read-only
  // Ind./Fam. benefit columns, the carrier block and the employer block show the
  // saved values. The slot's own Group # follows the plan only when it was
  // blank or still equal to the plan's previous group number (it is stored on
  // the subscriber, so a deliberately different value is left alone).
  const handlePlanUpdated = async (plan: InsurancePlanRead) => {
    setPlanPopup(null);
    const previousGroup = planDisplay.group_number;
    const ctx = await loadPlanContext(plan.id);
    setPlanDisplay(planDisplayFromSlot({ record: null, subscriber: null, ...ctx }));
    const nextGroup = ctx.plan?.group_number ?? plan.group_number ?? "";
    if (nextGroup && (!form.group_number.trim() || form.group_number === previousGroup) && form.group_number !== nextGroup) {
      update({ group_number: nextGroup });
      toast.info("Group # updated from the plan", { description: "Save this screen to keep it on the subscriber." });
    }
  };

  const handlePickSubscriber = async (subscriberId: number) => {
    const sub = await getSubscriberById(subscriberId);
    if (sub) update(subscriberFields(sub));
  };

  const handleUpdateStatus = () => {
    update({
      elig_verified_on: todayIso(),
      elig_status: form.elig_status || "Verified",
    });
    toast.success("Eligibility status stamped");
  };

  const handleInsertDateStamp = () => {
    const stamp = `[${new Date().toLocaleDateString("en-US")}] `;
    update({ notes: stamp + (form.notes ? `\n${form.notes}` : "") });
  };

  const handleSave = async () => {
    if (form.ins_plan_id == null) {
      toast.error("Select an insurance plan first");
      return;
    }
    setSaving(true);
    try {
      const res = await saveSlot({ patientId, slot, existingRecordId: recordId, form });
      setRecordId(res.recordId);
      update({ subscriber_id: res.subscriberId });
      toast.success(`${slot.label} plan saved`);
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const other = toggleSlot(slot);
  const otherLabel = `Add/View ${other.label}`;

  // Structured print of this slot (plan, benefits, eligibility, subscriber,
  // notes). The office record for the report header comes from the shared
  // offices query, which is normally already cached.
  const officesQuery = useListOffices({ size: 200 });
  const officeId = patient.officeId ? Number(patient.officeId) : null;
  const printFromScreen = () =>
    printInsuranceDetails({
      patient: { id: patientId, name: patient.name, dob: patient.dob, chart_no: patient.chartNo },
      office: (officesQuery.data?.items ?? []).find((o) => o.id === officeId) ?? null,
      office_name: patient.office ?? "",
      slot,
      form,
      plan: planDisplay,
    });
  // Server-rendered report for this slot (PRINT-1); the screen-data PDF is the
  // fallback. The route 404s for a slot with no record, which the fallback
  // covers by printing the blank form.
  const handlePrint = () =>
    openServerReport({
      fetch_pdf: () => getPatientInsuranceReport(patientId, { category, order }),
      fallback: printFromScreen,
      label: `Insurance Details — ${slot.label}`,
    });

  return (
    <div className="bg-[#F1F5F9] min-h-[calc(100vh-260px)]">
      {/* Title bar */}
      <div className="flex items-center justify-between bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2.5 text-white">
        <span className="text-sm font-bold">Insurance Details</span>
        <button
          type="button"
          onClick={handlePrint}
          disabled={loading}
          title={`Print ${slot.label} insurance details`}
          className="rounded p-1 hover:bg-white/15 disabled:opacity-50"
        >
          <Printer className="w-4 h-4 opacity-80" />
        </button>
      </div>

      {/* Tabs */}
      <InsuranceTabs patientId={patient.id} active={slot} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-[#64748B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#3A6EA5]" />
          <span className="text-sm font-bold">Loading {slot.label}…</span>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            {/* Left: plan search panel */}
            <PlanSearchPanel
              planDisplay={planDisplay}
              groupNumber={form.group_number}
              onGroupNumberChange={(v) => update({ group_number: v })}
              onSelectPlan={(id) => void handleSelectPlan(id)}
              onAddNew={() => setShowNewPlan(true)}
              onViewPlan={() => setPlanPopup("view")}
              onEditPlan={() => setPlanPopup("edit")}
            />

            {/* Right: benefit + eligibility + subscriber + notes */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4">
                <BenefitInformation form={form} planDisplay={planDisplay} onChange={update} />
                <EligibilitySection
                  form={form}
                  planDisplay={planDisplay}
                  onChange={update}
                  onUpdateStatus={handleUpdateStatus}
                />
              </div>

              <SubscriberInformation
                slot={slot}
                form={form}
                onChange={update}
                onPickSubscriber={(id) => void handlePickSubscriber(id)}
              />

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-bold text-[#1F6FB2] uppercase tracking-wide">Notes</h3>
                  <button
                    onClick={handleInsertDateStamp}
                    className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-[#E2E8F0] rounded-md text-[11px] font-bold text-[#475569] hover:bg-[#E8EFF7]"
                  >
                    <CalendarClock className="w-3.5 h-3.5" /> Insert Date Stamp
                  </button>
                </div>
                <textarea
                  value={form.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  rows={5}
                  className={`${INPUT_CLS} resize-y`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 bg-white border-t-2 border-[#E2E8F0] px-4 py-3 shadow-[0_-2px_6px_rgba(0,0,0,0.04)]">
        <button
          onClick={() => navigate(`/patient/${patient.id}/insurance/${other.segment}`)}
          className="flex items-center gap-1.5 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm"
        >
          <ArrowLeftRight className="w-4 h-4" /> {otherLabel}
        </button>
        <button
          onClick={() => void load()}
          disabled={saving}
          className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
        >
          <X className="w-4 h-4 inline mr-1" /> Cancel
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>

      {showNewPlan && (
        <NewInsPlanModal
          category={category}
          onClose={() => setShowNewPlan(false)}
          onCreated={handlePlanCreated}
        />
      )}

      {planPopup === "view" && planDisplay.plan_id != null && (
        <ViewPlanModal planId={planDisplay.plan_id} onClose={() => setPlanPopup(null)} onEdit={() => setPlanPopup("edit")} />
      )}

      {planPopup === "edit" && planDisplay.plan_id != null && (
        <EditPlanModal
          planId={planDisplay.plan_id}
          carrierName={planDisplay.carrier_name}
          onClose={() => setPlanPopup(null)}
          onSaved={(plan) => void handlePlanUpdated(plan)}
        />
      )}
    </div>
  );
}

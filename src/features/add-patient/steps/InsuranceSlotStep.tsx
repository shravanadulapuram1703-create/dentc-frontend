import { useState } from "react";
import { Search, X, Check } from "lucide-react";
import { StepSection, TextField, SelectField } from "../stepUi";
import {
  SUBSCRIBER_RELATIONSHIPS,
  MARITAL_OPTIONS,
  SEC_REL_OPTIONS,
  type InsuranceSlotForm,
} from "../wizardModel";
import { listInsuranceCarriers, listInsurancePlans } from "@/api/generated/endpoints/insurance/insurance";
import { listPatientAccountPlans } from "@/api/generated/endpoints/patients/patients";
import type { InsuranceCarrierRead, InsurancePlanRead } from "@/api/generated/model";

interface Props {
  slot: InsuranceSlotForm;
  onChange: (patch: Partial<InsuranceSlotForm>) => void;
  /** Existing patient id, when known — enables the legacy "Account Plans" scope. */
  patientId?: number | null;
}

const MONTH_OPTIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Step — "Add <Primary|Secondary> <Dental|Medical> Plan" (legacy Denticon Step 3).
 * One screen per coverage type selected on the Patient Information step, chained
 * in legacy order. Carrier + plan come from the real `/insurance-carriers` and
 * `/insurance-plans`; plan-level benefit maxima are shown read-only from the plan
 * record, while the patient's own "remaining" amounts and the subscriber block are
 * editable and persisted on Finish.
 */
export default function InsuranceSlotStep({ slot, onChange, patientId }: Props) {
  const [carrierQuery, setCarrierQuery] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [searchScope, setSearchScope] = useState("all");
  const [carrierResults, setCarrierResults] = useState<InsuranceCarrierRead[] | null>(null);
  const [plans, setPlans] = useState<InsurancePlanRead[] | null>(null);
  const [plan, setPlan] = useState<InsurancePlanRead | null>(null);
  const [carrier, setCarrier] = useState<InsuranceCarrierRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = (slot.relationship || "Self").toLowerCase() === "self";

  /**
   * Legacy "Search Insurance Plan". Three modes now that LEG-5 landed:
   *   • Carrier Name   → carrier search, then pick a plan from that carrier
   *   • Group #        → exact `group_number` filter straight to plans
   *   • Account Plans  → plans already on this patient's account
   */
  const runSearch = async () => {
    setLoading(true);
    setError(null);
    setCarrierResults(null);
    setPlans(null);
    try {
      if (searchScope === "account") {
        if (patientId == null) {
          setError("Account Plans is only available for an existing patient — the patient is created on Finish.");
          setPlans([]);
          return;
        }
        const res = await listPatientAccountPlans(patientId);
        setPlans((res as any).items ?? (res as any) ?? []);
        return;
      }
      if (searchField === "group") {
        const res = await listInsurancePlans({
          group_number: carrierQuery || null,
          is_active: true,
          size: 50,
        });
        setPlans(res.items ?? []);
        return;
      }
      const res = await listInsuranceCarriers({ search: carrierQuery || null, size: 25 });
      setCarrierResults(res.items ?? []);
    } catch {
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const pickCarrier = async (c: InsuranceCarrierRead) => {
    setCarrier(c);
    onChange({ carrier_id: (c as any).id ?? null, carrier_name: c.name, ins_plan_id: null, plan_label: "" });
    setCarrierResults(null);
    setLoading(true);
    try {
      const res = await listInsurancePlans({ carrier_id: (c as any).id, is_active: true, size: 50 });
      setPlans(res.items ?? []);
    } catch {
      setError("Failed to load plans for this carrier.");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const pickPlan = (p: InsurancePlanRead) => {
    setPlan(p);
    const label = [p.legacy_id || `Plan #${p.id}`, p.group_number ? `Grp ${p.group_number}` : "", p.plan_type || ""]
      .filter(Boolean)
      .join(" · ");
    onChange({ ins_plan_id: p.id, plan_label: label, group_number: p.group_number ?? "" });
    setPlans(null);
  };

  const clearPlan = () => {
    setPlan(null);
    setCarrier(null);
    setPlans(null);
    onChange({ carrier_id: null, carrier_name: "", ins_plan_id: null, plan_label: "" });
  };

  const money = (v?: string | null) => (v == null || v === "" ? "$0.00" : `$${Number(v).toFixed(2)}`);

  return (
    <div className="space-y-3">
      {slot.ins_plan_id == null ? (
        <StepSection title={`Search Insurance Plan — ${slot.label}`}>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <label className="block text-[#1E293B] font-normal mb-1 text-sm">Search Text</label>
              <div className="relative">
                <input
                  type="text"
                  value={carrierQuery}
                  onChange={(e) => setCarrierQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  disabled={searchScope === "account"}
                  placeholder={searchField === "group" ? "Exact group number…" : "Carrier name…"}
                  className="w-full px-3 py-1.5 pr-10 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm"
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-[#64748B]" />
              </div>
            </div>
            <div className="col-span-3">
              <SelectField
                label="Search For"
                value={searchField}
                onChange={setSearchField}
                options={[
                  { value: "name", label: "Carrier Name" },
                  { value: "group", label: "Group #" },
                ]}
              />
            </div>
            <div className="col-span-2">
              <SelectField
                label="Search In"
                value={searchScope}
                onChange={setSearchScope}
                options={[
                  { value: "all", label: "All Insurance Plans" },
                  { value: "account", label: "Account Plans" },
                ]}
              />
            </div>
            <div className="col-span-2">
              <button
                type="button"
                onClick={runSearch}
                disabled={loading}
                className="w-full px-4 py-1.5 rounded-lg bg-[#3A6EA5] text-white text-sm font-semibold hover:bg-[#1F3A5F] disabled:opacity-60"
              >
                {loading ? "Searching…" : "Search"}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-[#EF4444] mt-2">{error}</p>}

          {carrierResults && (
            <div className="mt-3 border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0] max-h-56 overflow-y-auto">
              {carrierResults.length === 0 ? (
                <p className="text-sm text-[#64748B] p-3">No carriers found.</p>
              ) : (
                carrierResults.map((c) => (
                  <button
                    key={(c as any).id}
                    type="button"
                    onClick={() => pickCarrier(c)}
                    className="w-full text-left px-3 py-2 hover:bg-[#F1F5F9] text-sm flex items-center justify-between"
                  >
                    <span className="font-medium text-[#1F3A5F]">{c.name}</span>
                    <span className="text-xs text-[#64748B]">
                      {c.payer_id ? `Payer ${c.payer_id}` : c.carrier_type || c.insurance_type || ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {slot.carrier_id != null && plans && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#1E293B] text-sm">
                  Plans for <strong>{slot.carrier_name}</strong>
                </label>
                <button type="button" onClick={clearPlan} className="text-xs text-[#64748B] hover:text-[#1F3A5F]">
                  change carrier
                </button>
              </div>
              <div className="border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0] max-h-56 overflow-y-auto">
                {plans.length === 0 ? (
                  <p className="text-sm text-[#64748B] p-3">No active plans for this carrier.</p>
                ) : (
                  plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickPlan(p)}
                      className="w-full text-left px-3 py-2 hover:bg-[#F1F5F9] text-sm flex items-center justify-between"
                    >
                      <span className="font-medium text-[#1F3A5F]">
                        {p.legacy_id || `Plan #${p.id}`}
                      </span>
                      <span className="text-xs text-[#64748B]">
                        {[p.group_number && `Grp ${p.group_number}`, p.plan_type].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </StepSection>
      ) : (
        <>
          {/* ── Selected plan + carrier summary ── */}
          <StepSection title={`Plan Information — ${slot.label}`}>
            <div className="flex items-center justify-between bg-[#F0FDF9] border border-[#2FB9A7] rounded-lg px-3 py-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-[#2FB9A7]" />
                <span className="font-medium text-[#1F3A5F]">{slot.carrier_name}</span>
                <span className="text-[#64748B]">— {slot.plan_label}</span>
                {carrier?.payer_id && (
                  <span className="text-xs text-[#64748B]">· Payer {carrier.payer_id}</span>
                )}
              </div>
              <button type="button" onClick={clearPlan} className="text-[#64748B] hover:text-[#EF4444]" title="Remove plan">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <TextField
                label="Group No."
                value={slot.group_number}
                onChange={(v) => onChange({ group_number: v })}
              />
              <TextField label="Plan ID" value={String(slot.ins_plan_id ?? "")} onChange={() => {}} disabled />
              <TextField
                label="Plan Effective Date"
                type="date"
                value={slot.plan_effective_date}
                onChange={(v) => onChange({ plan_effective_date: v })}
              />
              <TextField
                label="Anni. Date Exp"
                value={plan?.anniversary_expiry_date ?? ""}
                onChange={() => {}}
                disabled
              />
              {slot.order === "secondary" && (
                <SelectField
                  label="Sec. Sub Rel. to Prim. Sub"
                  value={slot.sec_sub_rel_to_prim_sub}
                  onChange={(v) => onChange({ sec_sub_rel_to_prim_sub: v })}
                  options={[
                    { value: "", label: "Select" },
                    ...SEC_REL_OPTIONS.map((r) => ({ value: r, label: r })),
                  ]}
                />
              )}
            </div>

            {/* Plan-level benefit maxima are owned by the plan record — read-only here. */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <BenefitBlock
                title="Deductible Information"
                rows={[
                  { label: "Individual Ded.", value: money(plan?.individual_deductible), readOnly: true },
                  {
                    label: "Individual Rem.",
                    value: slot.deductible_remaining,
                    onChange: (v: string) => onChange({ deductible_remaining: v }),
                  },
                  { label: "Family Ded.", value: money(plan?.family_deductible), readOnly: true },
                ]}
              />
              <BenefitBlock
                title="Maximum Information"
                rows={[
                  { label: "Individual Max.", value: money(plan?.individual_max), readOnly: true },
                  {
                    label: "Individual Rem.",
                    value: slot.max_remaining,
                    onChange: (v: string) => onChange({ max_remaining: v }),
                  },
                  { label: "Family Max.", value: money(plan?.family_max), readOnly: true },
                ]}
              />
              <BenefitBlock
                title="Ortho Max Information"
                rows={[
                  { label: "Individual Max.", value: money(plan?.ortho_max), readOnly: true },
                  {
                    label: "Individual Rem.",
                    value: slot.ortho_remaining,
                    onChange: (v: string) => onChange({ ortho_remaining: v }),
                  },
                ]}
              />
            </div>
          </StepSection>

          {/* ── Dentical Share of Cost (LEG-6) — legacy shows this on dental plans ── */}
          {slot.category === "D" && (
            <StepSection title="Dentical Share of Cost">
              <div className="grid grid-cols-4 gap-3">
                <SelectField
                  label="Month"
                  value={slot.dentical_share_month}
                  onChange={(v) => onChange({ dentical_share_month: v })}
                  options={[
                    { value: "", label: "—" },
                    ...MONTH_OPTIONS.map((m, i) => ({ value: String(i + 1), label: m })),
                  ]}
                />
                <TextField
                  label="Year"
                  value={slot.dentical_share_year}
                  onChange={(v) => onChange({ dentical_share_year: v })}
                  placeholder="2026"
                />
                <TextField
                  label="Share"
                  value={slot.dentical_share_amount}
                  onChange={(v) => onChange({ dentical_share_amount: v })}
                  placeholder="0.00"
                />
                <TextField
                  label="Unused (current month)"
                  value={slot.dentical_unused}
                  onChange={(v) => onChange({ dentical_unused: v })}
                  placeholder="0.00"
                />
              </div>
            </StepSection>
          )}

          {/* ── Subscriber Information ── */}
          <StepSection title="Subscriber Information">
            <div className="grid grid-cols-4 gap-3">
              <SelectField
                label="Patient Relation to Subscriber *"
                value={slot.relationship}
                onChange={(v) => onChange({ relationship: v })}
                options={SUBSCRIBER_RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
              />
              <TextField
                label="SubID *"
                value={slot.sub_member_id}
                onChange={(v) => onChange({ sub_member_id: v })}
              />
              <TextField
                label="Last Name"
                value={slot.sub_last_name}
                onChange={(v) => onChange({ sub_last_name: v })}
                disabled={isSelf}
              />
              <TextField
                label="First Name"
                value={slot.sub_first_name}
                onChange={(v) => onChange({ sub_first_name: v })}
                disabled={isSelf}
              />
              <TextField
                label="Birth Date"
                type="date"
                value={slot.sub_dob}
                onChange={(v) => onChange({ sub_dob: v })}
                disabled={isSelf}
              />
              <SelectField
                label="Sex"
                value={slot.sub_sex}
                onChange={(v) => onChange({ sub_sex: v })}
                options={[
                  { value: "", label: "Select" },
                  { value: "M", label: "Male" },
                  { value: "F", label: "Female" },
                  { value: "O", label: "Other" },
                ]}
                disabled={isSelf}
              />
              <SelectField
                label="Marital Status"
                value={slot.sub_marital_status}
                onChange={(v) => onChange({ sub_marital_status: v })}
                options={[
                  { value: "", label: "Select" },
                  ...MARITAL_OPTIONS.map((m) => ({ value: m, label: m })),
                ]}
                disabled={isSelf}
              />
              <TextField
                label="Phone"
                type="tel"
                value={slot.sub_phone}
                onChange={(v) => onChange({ sub_phone: v })}
                disabled={isSelf}
              />
              <div className="col-span-2">
                <TextField
                  label="Address"
                  value={slot.sub_address}
                  onChange={(v) => onChange({ sub_address: v })}
                  disabled={isSelf}
                />
              </div>
              <TextField
                label="City"
                value={slot.sub_city}
                onChange={(v) => onChange({ sub_city: v })}
                disabled={isSelf}
              />
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="State"
                  value={slot.sub_state}
                  onChange={(v) => onChange({ sub_state: v })}
                  disabled={isSelf}
                />
                <TextField
                  label="Zip"
                  value={slot.sub_zip}
                  onChange={(v) => onChange({ sub_zip: v })}
                  disabled={isSelf}
                />
              </div>
            </div>
            {isSelf && (
              <p className="text-xs text-[#64748B] mt-2">
                Relationship is "Self" — the subscriber is the patient, so their details are used
                automatically. Choose another relationship to enter a different subscriber.
              </p>
            )}
          </StepSection>

          <StepSection title="Notes">
            <textarea
              value={slot.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm resize-none"
            />
          </StepSection>
        </>
      )}
    </div>
  );
}

interface BenefitRow {
  label: string;
  value: string;
  readOnly?: boolean;
  onChange?: (v: string) => void;
}

function BenefitBlock({ title, rows }: { title: string; rows: BenefitRow[] }) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg p-3">
      <div className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#64748B]">{r.label}</span>
            <input
              type="text"
              value={r.value}
              readOnly={r.readOnly}
              onChange={(e) => r.onChange?.(e.target.value)}
              placeholder={r.readOnly ? undefined : "0.00"}
              className={`w-24 px-2 py-1 border border-[#E2E8F0] rounded text-sm text-right ${
                r.readOnly ? "bg-[#F8FAFC] text-[#64748B]" : ""
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// INSURANCE DETAILS — Step 1 of 4: PLAN.
//
// Legacy row order: Dental or Medical* · Plan Type* · Group No.* · Carrier* ·
// Employer* · Anniversary (Month/Day)* · Fees to Print on Claims* · Claim
// Options* · Form to Print* · Reporting Subtype · Network Type · NOA Only ·
// Per Visit Co-Pay — followed by the backend-only fields the legacy dialog
// keeps elsewhere (Coverage Type, Prepaid, Active).
//
// Backend-backed: category (via carrier), plan_type, group_number, carrier_id,
// employer_id, anniversary_date, coverage_type, is_prepaid, is_active.
// Browser-stored until the backend adds columns (PLAN-DTL-1): fees_to_print,
// claim_option, form_to_print, reporting_subtype, network_type, noa_only,
// per_visit_copay.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, X, Eye, Loader2 } from "lucide-react";
import { listInsurancePlans, getInsuranceCarrier, getEmployer } from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead, InsuranceCarrierRead, EmployerRead } from "@/api/generated/model";
import { type PlanCategory, PLAN_CATEGORY_LABEL, COVERAGE_TYPE_OPTIONS } from "../planData";
import { carrierTypeFor } from "../insuranceData";
import { searchCarriers, searchEmployers, ensureCarrierRecords, ensureEmployerNames } from "../lookupService";
import EntityPicker from "../EntityPicker";
import DefinitionField from "../DefinitionField";
import { QuickAddCarrierModal, QuickAddEmployerModal } from "../QuickAddEntityModals";
import PossiblePlanMatches, { MIN_GROUP_SEARCH_CHARS } from "../PossiblePlanMatches";
import {
  type PlanDetailsForm,
  FEES_TO_PRINT_OPTIONS,
  CLAIM_OPTIONS,
  FORM_TO_PRINT_OPTIONS,
  NETWORK_TYPE_OPTIONS,
  MONTHS,
  DAYS,
  anniversaryParts,
  anniversaryIso,
} from "./planDetailsModel";
import type { PlanLookups } from "./planLookups";
import { FormRow, WZ_INPUT, WZ_BTN_PRIMARY } from "./wizardUi";

export interface PlanStepProps {
  form: PlanDetailsForm;
  onChange: (patch: Partial<PlanDetailsForm>) => void;
  category: PlanCategory;
  onCategoryChange: (c: PlanCategory) => void;
  carrierLabel: string;
  onCarrierChange: (id: number | null, label: string) => void;
  employerLabel: string;
  onEmployerChange: (id: number | null, label: string) => void;
  lookups: PlanLookups;
  disabled?: boolean;
  showActive?: boolean;
  categoryNote?: ReactNode;
  onUseExistingPlan?: (plan: InsurancePlanRead) => void;
  useExistingLabel?: string;
  excludePlanId?: number | null;
}

export default function PlanStep({
  form,
  onChange,
  category,
  onCategoryChange,
  carrierLabel,
  onCarrierChange,
  employerLabel,
  onEmployerChange,
  lookups,
  disabled = false,
  showActive = false,
  categoryNote,
  onUseExistingPlan,
  useExistingLabel,
  excludePlanId = null,
}: PlanStepProps) {
  const [addCarrier, setAddCarrier] = useState(false);
  const [addEmployer, setAddEmployer] = useState(false);
  const [details, setDetails] = useState<{ kind: "carrier" | "employer"; data: InsuranceCarrierRead | EmployerRead } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<"carrier" | "employer" | null>(null);

  // ---- Group No. smart search (legacy: from 4 characters) -----------------
  const [matches, setMatches] = useState<InsurancePlanRead[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [filteredOut, setFilteredOut] = useState(0);
  const [dismissedFor, setDismissedFor] = useState("");
  const searchSeq = useRef(0);
  // The group number the step opened with (an existing plan's own group) never
  // triggers the search — only a value the user actually changes it to does.
  const initialGroup = useRef(form.group_number.trim().toLowerCase());
  const groupQuery = form.group_number.trim();
  const panelHidden =
    (dismissedFor !== "" && dismissedFor === groupQuery.toLowerCase()) ||
    (initialGroup.current !== "" && initialGroup.current === groupQuery.toLowerCase());

  useEffect(() => {
    if (disabled || groupQuery.length < MIN_GROUP_SEARCH_CHARS || panelHidden) {
      setMatches(null);
      setMatchesLoading(false);
      return;
    }
    const mine = ++searchSeq.current;
    setMatchesLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await listInsurancePlans({ search: groupQuery, size: 25, sort: "id", order: "asc", is_active: true });
          if (mine !== searchSeq.current) return;
          const items = res.items ?? [];
          const needle = groupQuery.toLowerCase();
          const hits = items.filter((p) => p.id !== excludePlanId && (p.group_number ?? "").toLowerCase().includes(needle));
          await Promise.all([
            ensureCarrierRecords(hits.map((p) => p.carrier_id)),
            ensureEmployerNames(hits.map((p) => p.employer_id).filter((x): x is number => x != null)),
          ]);
          if (mine !== searchSeq.current) return;
          setMatches(hits);
          setFilteredOut(items.length - hits.length);
        } catch {
          if (mine === searchSeq.current) {
            setMatches([]);
            setFilteredOut(0);
          }
        } finally {
          if (mine === searchSeq.current) setMatchesLoading(false);
        }
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [groupQuery, panelHidden, excludePlanId, disabled]);

  const carrierSearch = useCallback(
    (query: string) => searchCarriers(query, carrierTypeFor(category === "D" ? "dental" : "medical")),
    [category],
  );

  const changeCategory = (next: PlanCategory) => {
    if (next === category) return;
    onCategoryChange(next);
    onCarrierChange(null, "");
  };

  const openDetails = async (kind: "carrier" | "employer") => {
    const id = kind === "carrier" ? form.carrier_id : form.employer_id;
    if (id == null) return;
    setDetailsLoading(kind);
    try {
      const data = kind === "carrier" ? await getInsuranceCarrier(id) : await getEmployer(id);
      setDetails({ kind, data });
    } catch {
      setDetails(null);
    } finally {
      setDetailsLoading(null);
    }
  };

  const ann = anniversaryParts(form.anniversary_date);
  const setAnniversary = (month: string, day: string) => onChange({ anniversary_date: anniversaryIso(month, day, ann.year) });

  const planTypes = form.plan_type && !lookups.plan_types.some((t) => t.toUpperCase() === form.plan_type.toUpperCase())
    ? [form.plan_type, ...lookups.plan_types]
    : lookups.plan_types;
  const subtypes = lookups.plan_subtypes.filter(
    (s) => !s.plan_type || !form.plan_type || s.plan_type.toUpperCase() === form.plan_type.toUpperCase(),
  );

  return (
    <div className="space-y-3">
      <div className="rounded border border-[#E2E8F0]">
        <FormRow label="Dental or Medical" required>
          <select value={category} onChange={(e) => changeCategory(e.target.value as PlanCategory)} disabled={disabled} className={`${WZ_INPUT} max-w-[270px]`}>
            <option value="D">Dental</option>
            <option value="M">Medical</option>
          </select>
          {categoryNote}
        </FormRow>

        <FormRow label="Plan Type" required>
          <select value={form.plan_type} onChange={(e) => onChange({ plan_type: e.target.value })} disabled={disabled} className={`${WZ_INPUT} max-w-[270px]`}>
            <option value="">Select plan type…</option>
            {planTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Group No." required help="Type 4+ characters to check for plans already on file with this group number.">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={form.group_number}
              onChange={(e) => {
                setDismissedFor("");
                onChange({ group_number: e.target.value });
              }}
              disabled={disabled}
              className={`${WZ_INPUT} max-w-[270px]`}
            />
            <ClearButton onClick={() => onChange({ group_number: "" })} disabled={disabled || !form.group_number} />
          </div>
          {!disabled && !panelHidden && groupQuery.length >= MIN_GROUP_SEARCH_CHARS && (
            <PossiblePlanMatches
              query={groupQuery}
              loading={matchesLoading}
              matches={matches ?? []}
              filteredOut={filteredOut}
              onUse={onUseExistingPlan}
              useLabel={useExistingLabel}
              editing={excludePlanId != null}
              onDismiss={() => setDismissedFor(groupQuery.toLowerCase())}
            />
          )}
        </FormRow>

        <FormRow label="Carrier" required help={`Only ${PLAN_CATEGORY_LABEL[category].toLowerCase()} carriers are listed.`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full max-w-[270px]">
              <EntityPicker
                valueId={form.carrier_id}
                valueLabel={carrierLabel}
                onChange={(id, label) => onCarrierChange(id as number | null, label)}
                search={carrierSearch}
                placeholder={`Select ${PLAN_CATEGORY_LABEL[category].toLowerCase()} carrier…`}
                disabled={disabled}
              />
            </div>
            <ClearButton onClick={() => onCarrierChange(null, "")} disabled={disabled || form.carrier_id == null} />
            <button type="button" onClick={() => setAddCarrier(true)} disabled={disabled} className={WZ_BTN_PRIMARY}>
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
            {form.carrier_id != null && (
              <DetailsLink label={`View Details (${carrierLabel || `#${form.carrier_id}`})`} loading={detailsLoading === "carrier"} onClick={() => void openDetails("carrier")} />
            )}
          </div>
        </FormRow>

        <FormRow label="Employer" required help="Choose “No Employer” when the plan is not tied to an employer.">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full max-w-[270px]">
              <EntityPicker
                valueId={form.employer_id}
                valueLabel={form.employer_id == null ? "No Employer" : employerLabel}
                onChange={(id, label) => onEmployerChange(id as number | null, label)}
                search={searchEmployers}
                placeholder="No Employer"
                allowClear
                disabled={disabled}
              />
            </div>
            <ClearButton onClick={() => onEmployerChange(null, "")} disabled={disabled || form.employer_id == null} />
            <button type="button" onClick={() => setAddEmployer(true)} disabled={disabled} className={WZ_BTN_PRIMARY}>
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
            <DetailsLink
              label={`View Details (${form.employer_id == null ? "No Employer" : employerLabel || `#${form.employer_id}`})`}
              loading={detailsLoading === "employer"}
              onClick={() => void openDetails("employer")}
              disabled={form.employer_id == null}
            />
          </div>
        </FormRow>

        <FormRow label="Anniversary (Month/Day)" required>
          <div className="flex items-center gap-2">
            <select value={ann.month} onChange={(e) => setAnniversary(e.target.value, ann.day)} disabled={disabled} className={`${WZ_INPUT} w-[110px]`}>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select value={ann.day} onChange={(e) => setAnniversary(ann.month, e.target.value)} disabled={disabled} className={`${WZ_INPUT} w-[110px]`}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </FormRow>

        <FormRow label="Fees to Print on Claims" required>
          <Select value={form.fees_to_print} onChange={(v) => onChange({ fees_to_print: v })} options={FEES_TO_PRINT_OPTIONS} disabled={disabled} />
        </FormRow>
        <FormRow label="Claim Options" required>
          <Select value={form.claim_option} onChange={(v) => onChange({ claim_option: v })} options={CLAIM_OPTIONS} disabled={disabled} />
        </FormRow>
        <FormRow label="Form to Print" required>
          <Select value={form.form_to_print} onChange={(v) => onChange({ form_to_print: v })} options={FORM_TO_PRINT_OPTIONS} disabled={disabled} />
        </FormRow>
        <FormRow label="Reporting Subtype">
          <select value={form.reporting_subtype} onChange={(e) => onChange({ reporting_subtype: e.target.value })} disabled={disabled} className={`${WZ_INPUT} max-w-[270px]`}>
            <option value="">None</option>
            {form.reporting_subtype && !subtypes.some((s) => s.label === form.reporting_subtype) && (
              <option value={form.reporting_subtype}>{form.reporting_subtype}</option>
            )}
            {subtypes.map((s) => (
              <option key={`${s.plan_type}|${s.label}`} value={s.label}>
                {s.label}
                {s.plan_type ? ` (${s.plan_type})` : ""}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Network Type">
          <Select value={form.network_type} onChange={(v) => onChange({ network_type: v })} options={NETWORK_TYPE_OPTIONS} disabled={disabled} />
        </FormRow>
        <FormRow label="Notice of Authorization(NOA) Only">
          <input type="checkbox" checked={form.noa_only} onChange={(e) => onChange({ noa_only: e.target.checked })} disabled={disabled} className="h-4 w-4 accent-[#1F6FB2]" />
        </FormRow>
        <FormRow label="Per Visit Co-Pay">
          <div className="relative max-w-[270px]">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-[#64748B]">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.per_visit_copay}
              onChange={(e) => onChange({ per_visit_copay: e.target.value })}
              disabled={disabled}
              placeholder="0.00"
              className={`${WZ_INPUT} pl-5`}
            />
          </div>
        </FormRow>
        <FormRow label="Coverage Type">
          <div className="max-w-[270px]">
            <DefinitionField groupCode="coverage_type" value={form.coverage_type} onChange={(v) => onChange({ coverage_type: v })} placeholder="e.g. I, F, C" hints={COVERAGE_TYPE_OPTIONS} disabled={disabled} />
          </div>
        </FormRow>
        <FormRow label="Prepaid Plan">
          <input type="checkbox" checked={form.is_prepaid} onChange={(e) => onChange({ is_prepaid: e.target.checked })} disabled={disabled} className="h-4 w-4 accent-[#1F6FB2]" />
        </FormRow>
        {showActive && (
          <FormRow label="Active">
            <label className="inline-flex items-center gap-2 text-[12px] text-[#1F3A5F]">
              <input type="checkbox" checked={form.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} disabled={disabled} className="h-4 w-4 accent-[#1F6FB2]" />
              {form.is_active ? "Active" : "Inactive"}
            </label>
          </FormRow>
        )}
      </div>

      {addCarrier && (
        <QuickAddCarrierModal
          category={category}
          onClose={() => setAddCarrier(false)}
          onCreated={(c) => {
            onCarrierChange(c.id, c.name);
            setAddCarrier(false);
          }}
        />
      )}
      {addEmployer && (
        <QuickAddEmployerModal
          onClose={() => setAddEmployer(false)}
          onCreated={(e) => {
            onEmployerChange(e.id, e.name);
            setAddEmployer(false);
          }}
        />
      )}

      {details && <DetailsPopover kind={details.kind} data={details.data} onClose={() => setDetails(null)} />}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${WZ_INPUT} max-w-[270px]`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ClearButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Clear"
      aria-label="Clear"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#475569] text-white hover:bg-[#1F3A5F] disabled:opacity-40"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function DetailsLink({ label, onClick, loading, disabled }: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1 text-[12px] text-[#1F6FB2] hover:underline disabled:cursor-default disabled:text-[#94A3B8] disabled:no-underline"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

function DetailsPopover({
  kind,
  data,
  onClose,
}: {
  kind: "carrier" | "employer";
  data: InsuranceCarrierRead | EmployerRead;
  onClose: () => void;
}) {
  const rows: [string, string | null | undefined][] =
    kind === "carrier"
      ? (() => {
          const c = data as InsuranceCarrierRead;
          return [
            ["Name", c.name],
            ["Type", c.is_dental ? "Dental" : "Medical"],
            ["Payer ID", c.payer_id],
            ["Claim Type", c.claim_type],
            ["Address", [c.address, c.address2].filter(Boolean).join(", ")],
            ["City / State / Zip", [c.city, c.state, c.zip].filter(Boolean).join(" ")],
            ["Phone", c.phone],
            ["Fax", c.fax],
            ["Email", c.email],
            ["Website", c.website],
            ["Notes", c.notes],
          ];
        })()
      : (() => {
          const e = data as EmployerRead;
          return [
            ["Name", e.name],
            ["Address", e.address],
            ["City / State / Zip", [e.city, e.state, e.zip].filter(Boolean).join(" ")],
            ["Phone", e.phone],
            ["Contact", e.contact_person],
            ["Sales Rep", e.salesrep],
          ];
        })();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[480px] max-w-full rounded border border-[#CBD5E1] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#1F6FB2] px-3 py-2 text-white">
          <span className="text-[12px] font-bold uppercase tracking-wide">{kind === "carrier" ? "Carrier Details" : "Employer Details"}</span>
          <button onClick={onClose} className="rounded px-1 hover:bg-white/20" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="divide-y divide-[#E2E8F0] text-[12px]">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[150px_1fr]">
              <div className="bg-[#F7F9FC] px-3 py-1.5 font-semibold text-[#1F3A5F]">{k}</div>
              <div className="px-3 py-1.5 text-[#1E293B]">{v || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

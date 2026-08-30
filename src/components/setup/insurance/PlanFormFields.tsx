// The insurance-plan form body, shared by BOTH hosts so the two stay in step:
//   • Setup → Insurance → Plans   (`InsurancePlanSetup`, add/edit detail page)
//   • Patient → Insurance → Add New Ins Plan (`NewInsPlanModal`)
// They edit the same resource with the same rules, so they render the same
// fields, in the same order, with the same behaviour — only the surrounding
// chrome (page header vs modal header) differs.
//
// Legacy parity notes:
//   • "Dental or Medical" is the first, mandatory field. Plans have no such
//     column — the category lives on the CARRIER — so it scopes the carrier
//     picker and is re-derived whenever a carrier arrives from elsewhere.
//   • Carrier and Employer each get a **+ ADD NEW** button opening the short
//     legacy CARRIER DETAILS / EMPLOYER DETAILS dialogs.
//   • Group Number is a smart-search field: from four characters it looks for
//     plans already using that group and lists them under POSSIBLE PLAN MATCHES
//     so staff can adopt one instead of creating a duplicate.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { listInsurancePlans } from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead } from "@/api/generated/model";
import {
  type PlanForm,
  type PlanCategory,
  PLAN_CATEGORY_LABEL,
  COVERAGE_TYPE_OPTIONS,
} from "./planData";
import { carrierTypeFor } from "./insuranceData";
import {
  searchCarriers,
  searchEmployers,
  ensureCarrierRecords,
  ensureEmployerNames,
} from "./lookupService";
import EntityPicker from "./EntityPicker";
import DefinitionField from "./DefinitionField";
import { QuickAddCarrierModal, QuickAddEmployerModal } from "./QuickAddEntityModals";
import PossiblePlanMatches, { MIN_GROUP_SEARCH_CHARS } from "./PossiblePlanMatches";

export const PLAN_INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 disabled:bg-[#F1F5F9]";

export interface PlanFormFieldsProps {
  form: PlanForm;
  onChange: (patch: Partial<PlanForm>) => void;
  category: PlanCategory;
  onCategoryChange: (c: PlanCategory) => void;
  carrierLabel: string;
  onCarrierChange: (id: number | null, label: string) => void;
  employerLabel: string;
  onEmployerChange: (id: number | null, label: string) => void;
  /** Rendered under the category select — used for the patient tab mismatch hint. */
  categoryNote?: ReactNode;
  /** Setup exposes the Active toggle; the patient add-modal always creates active. */
  showActive?: boolean;
  disabled?: boolean;
  /**
   * Adopt an existing plan found by the group-number smart search instead of
   * creating a duplicate. Hosts mean different things by it — the patient modal
   * links the plan to the slot, Setup opens it for editing — so the action is
   * theirs to supply, and the row action is hidden when they don't.
   */
  onUseExistingPlan?: (plan: InsurancePlanRead) => void;
  useExistingLabel?: string;
  /** Plan currently being edited — never offered as a match against itself. */
  excludePlanId?: number | null;
}

export default function PlanFormFields({
  form,
  onChange,
  category,
  onCategoryChange,
  carrierLabel,
  onCarrierChange,
  employerLabel,
  onEmployerChange,
  categoryNote,
  showActive = false,
  disabled = false,
  onUseExistingPlan,
  useExistingLabel,
  excludePlanId = null,
}: PlanFormFieldsProps) {
  const [addCarrier, setAddCarrier] = useState(false);
  const [addEmployer, setAddEmployer] = useState(false);

  // ---- Group Number smart search -----------------------------------------
  const [matches, setMatches] = useState<InsurancePlanRead[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [filteredOut, setFilteredOut] = useState(0);
  // The query the user dismissed the panel for, so it stays dismissed until
  // they type something different.
  const [dismissedFor, setDismissedFor] = useState("");
  const searchSeq = useRef(0);

  const groupQuery = form.group_number.trim();
  const panelHidden = dismissedFor !== "" && dismissedFor === groupQuery.toLowerCase();

  useEffect(() => {
    // A disabled form can't act on a match (read-only viewer, mid-save), so don't
    // search — and don't show the plan being viewed as a "match" for itself.
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
          const res = await listInsurancePlans({
            search: groupQuery,
            size: 25,
            sort: "id",
            order: "asc",
            is_active: true,
          });
          if (mine !== searchSeq.current) return;
          const items = res.items ?? [];
          // `search` spans carrier name + payer id + group number, so keep only
          // the rows that really matched on the group (devreport INS-PT-14).
          const needle = groupQuery.toLowerCase();
          const hits = items.filter(
            (p) => p.id !== excludePlanId && (p.group_number ?? "").toLowerCase().includes(needle),
          );
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

  // Carriers are partitioned Dental/Medical server-side; scope the picker to the
  // selected category. Memoised because EntityPicker re-searches when `search`
  // changes identity.
  const carrierSearch = useCallback(
    (query: string) => searchCarriers(query, carrierTypeFor(category === "D" ? "dental" : "medical")),
    [category],
  );

  // Switching category invalidates an already-picked carrier (it belongs to the
  // other partition).
  const changeCategory = (next: PlanCategory) => {
    if (next === category) return;
    onCategoryChange(next);
    onCarrierChange(null, "");
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Legacy parity: the Dental/Medical selector is the first, mandatory field. */}
        <Field label="Dental or Medical" required>
          <select
            value={category}
            onChange={(e) => changeCategory(e.target.value as PlanCategory)}
            disabled={disabled}
            className={PLAN_INPUT_CLS}
          >
            <option value="D">Dental</option>
            <option value="M">Medical</option>
          </select>
          {categoryNote}
        </Field>

        <Field label="Carrier" required>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <EntityPicker
                valueId={form.carrier_id}
                valueLabel={carrierLabel}
                onChange={(id, label) => onCarrierChange(id as number | null, label)}
                search={carrierSearch}
                placeholder={`Select ${PLAN_CATEGORY_LABEL[category].toLowerCase()} carrier…`}
                disabled={disabled}
              />
            </div>
            <AddNewButton onClick={() => setAddCarrier(true)} disabled={disabled} label="Add a new carrier" />
          </div>
        </Field>

        <Field label="Employer">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <EntityPicker
                valueId={form.employer_id}
                valueLabel={employerLabel}
                onChange={(id, label) => onEmployerChange(id as number | null, label)}
                search={searchEmployers}
                placeholder="Select employer (optional)…"
                allowClear
                disabled={disabled}
              />
            </div>
            <AddNewButton onClick={() => setAddEmployer(true)} disabled={disabled} label="Add a new employer" />
          </div>
        </Field>

        {/* Smart search: the matches panel spans the grid so the table has room. */}
        <Field label="Group Number" className="md:col-span-2">
          <input
            type="text"
            value={form.group_number}
            onChange={(e) => {
              setDismissedFor("");
              onChange({ group_number: e.target.value });
            }}
            disabled={disabled}
            className={PLAN_INPUT_CLS}
            placeholder={`Type ${MIN_GROUP_SEARCH_CHARS}+ characters to check for existing plans…`}
          />
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
        </Field>

        <Field label="Plan Type">
          <input
            type="text"
            value={form.plan_type}
            onChange={(e) => onChange({ plan_type: e.target.value })}
            disabled={disabled}
            className={PLAN_INPUT_CLS}
            placeholder="e.g. PPO, HMO, Indemnity"
          />
        </Field>

        <Field label="Coverage Type">
          <DefinitionField
            groupCode="coverage_type"
            value={form.coverage_type}
            onChange={(v) => onChange({ coverage_type: v })}
            placeholder="e.g. I, F, C"
            hints={COVERAGE_TYPE_OPTIONS}
            disabled={disabled}
          />
        </Field>

        <Field label="Anniversary Date">
          <input
            type="date"
            value={form.anniversary_date}
            onChange={(e) => onChange({ anniversary_date: e.target.value })}
            disabled={disabled}
            className={PLAN_INPUT_CLS}
          />
        </Field>
      </div>

      <h3 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wide text-[#3A6EA5]">
        Maximums &amp; Deductibles
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Field label="Individual Max">
          <MoneyInput value={form.individual_max} onChange={(v) => onChange({ individual_max: v })} disabled={disabled} />
        </Field>
        <Field label="Individual Deductible">
          <MoneyInput value={form.individual_deductible} onChange={(v) => onChange({ individual_deductible: v })} disabled={disabled} />
        </Field>
        <Field label="Ortho Max">
          <MoneyInput value={form.ortho_max} onChange={(v) => onChange({ ortho_max: v })} disabled={disabled} />
        </Field>
        <Field label="Family Max">
          <MoneyInput value={form.family_max} onChange={(v) => onChange({ family_max: v })} disabled={disabled} />
        </Field>
        <Field label="Family Deductible">
          <MoneyInput value={form.family_deductible} onChange={(v) => onChange({ family_deductible: v })} disabled={disabled} />
        </Field>
        <div className="flex items-end gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-[#E2E8F0] px-3 py-2">
            <input
              type="checkbox"
              checked={form.is_prepaid}
              onChange={(e) => onChange({ is_prepaid: e.target.checked })}
              disabled={disabled}
              className="h-4 w-4 accent-[#3A6EA5]"
            />
            <span className="text-sm font-bold text-[#1F3A5F]">Prepaid</span>
          </label>
          {showActive && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-[#E2E8F0] px-3 py-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => onChange({ is_active: e.target.checked })}
                disabled={disabled}
                className="h-4 w-4 accent-[#3A6EA5]"
              />
              <span className="text-sm font-bold text-[#1F3A5F]">{form.is_active ? "Active" : "Inactive"}</span>
            </label>
          )}
        </div>
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
    </>
  );
}

function AddNewButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex shrink-0 items-center gap-1 rounded-lg bg-[#3A6EA5] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#1F3A5F] disabled:opacity-50"
    >
      <Plus className="h-3.5 w-3.5" /> Add New
    </button>
  );
}

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1F3A5F]">
        {label}
        {required && <span className="ml-0.5 text-[#DC2626]">*</span>}
      </label>
      {children}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#64748B]">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${PLAN_INPUT_CLS} pl-7`}
        placeholder="0.00"
      />
    </div>
  );
}

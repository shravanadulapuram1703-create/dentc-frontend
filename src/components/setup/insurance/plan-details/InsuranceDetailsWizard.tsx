// INSURANCE DETAILS — the legacy 4-step plan wizard, rendered as a modal.
//
//   PLAN (1/4) → BENEFITS (2/4) → COVERAGE & LIMITATIONS (3/4) → FREQ
//   LIMITATION CODE GRP (4/4), with COPY FROM EXISTING in the header and
//   PREVIOUS / NEXT / FINISH / CANCEL in the footer.
//
// ONE component serves every host so the plan is edited identically wherever
// it is opened:
//   • Setup → Insurance → Plans           — Add Plan (create) and row click (edit)
//   • Patient → Insurance → Add New Ins Plan — create, then link to the slot
//   • Patient → Insurance → View Plan      — read-only
//
// Nothing is written until FINISH: the plan is created/updated, then the
// coverage + frequency rows are diff-saved (planDetailsService), then the
// browser-stored extras. The coverage table is what the ledger's patient /
// insurance split is computed from (coverageResolver), so it is the part that
// matters most for estimates.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X, ChevronLeft, ChevronRight, Check, Copy, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import type { InsurancePlanRead } from "@/api/generated/model";
import { type PlanCategory, PLAN_CATEGORY_LABEL, categoryForCarrier } from "../planData";
import { carrierRecord } from "../lookupService";
import CopyFromExistingDialog from "../CopyFromExistingDialog";
import DuplicatePlanDialog from "../DuplicatePlanDialog";
import { findDuplicatePlansByGroup } from "../planDuplicates";
import {
  type PlanDetailsForm,
  type CoverageRow,
  type FreqCodeGroupRow,
  type CoverageTableKind,
  emptyPlanDetailsForm,
  defaultCoverageRows,
  anniversaryIso,
} from "./planDetailsModel";
import { type PlanLookups, loadPlanLookups, fallbackLookups } from "./planLookups";
import { loadPlanDetails, savePlanDetails, copyPlanDetails, loadCustomCoverageRows } from "./planDetailsService";
import PlanStep from "./PlanStep";
import BenefitsStep from "./BenefitsStep";
import CoverageStep from "./CoverageStep";
import FreqCodeGroupStep from "./FreqCodeGroupStep";
import { WZ_BTN_DARK, WZ_BTN_PRIMARY } from "./wizardUi";

export type WizardMode = "create" | "edit" | "view";

const STEPS = ["Plan", "Benefits", "Coverage & Limitations", "Freq Limitation Code Grp"] as const;

export interface InsuranceDetailsWizardProps {
  mode: WizardMode;
  /** Required for edit / view. */
  plan_id?: number | null;
  /** Seeds the Dental/Medical selector on create. */
  category?: PlanCategory;
  onClose: () => void;
  /** After FINISH (create or edit). */
  onSaved?: (plan: InsurancePlanRead, carrierLabel: string, category: PlanCategory) => void;
  /** Adopt an existing plan (group-number smart search / duplicate dialog). */
  onUseExisting?: (plan: InsurancePlanRead) => void;
  useExistingLabel?: string;
  /** Rendered under the Dental/Medical select (patient tab mismatch hint). */
  categoryNote?: (category: PlanCategory) => ReactNode;
  /** Setup exposes the Active toggle. */
  showActive?: boolean;
  /** Footer link rendered in view mode (e.g. "Open in Setup"). */
  viewFooter?: ReactNode;
}

export default function InsuranceDetailsWizard({
  mode,
  plan_id = null,
  category: initialCategory = "D",
  onClose,
  onSaved,
  onUseExisting,
  useExistingLabel,
  categoryNote,
  showActive = false,
  viewFooter,
}: InsuranceDetailsWizardProps) {
  const readOnly = mode === "view";
  const [step, setStep] = useState(0);
  const [lookups, setLookups] = useState<PlanLookups>(fallbackLookups);
  const [loading, setLoading] = useState(mode !== "create");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<PlanDetailsForm>(() => ({ ...emptyPlanDetailsForm(), anniversary_date: anniversaryIso("01", "01") }));
  const [category, setCategory] = useState<PlanCategory>(initialCategory);
  const [carrierLabel, setCarrierLabel] = useState("");
  const [employerLabel, setEmployerLabel] = useState("");

  const [coverageRows, setCoverageRows] = useState<CoverageRow[]>([]);
  const [freqRows, setFreqRows] = useState<FreqCodeGroupRow[]>([]);
  const originalCoverage = useRef<CoverageRow[]>([]);
  const originalFreq = useRef<FreqCodeGroupRow[]>([]);
  const [tableKind, setTableKind] = useState<CoverageTableKind>("legacy_default");
  const [resetting, setResetting] = useState(false);

  const [showCopy, setShowCopy] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);
  const [duplicates, setDuplicates] = useState<InsurancePlanRead[] | null>(null);

  const update = useCallback((patch: Partial<PlanDetailsForm>) => setForm((p) => ({ ...p, ...patch })), []);

  // ---- Initial load --------------------------------------------------------
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const lk = await loadPlanLookups();
        if (!alive) return;
        setLookups(lk);
        if (mode === "create") {
          // A new plan starts from the legacy default table, like the on-prem dialog.
          setCoverageRows(defaultCoverageRows(lk.categories));
          return;
        }
        if (plan_id == null) {
          setLoadError("No plan selected.");
          return;
        }
        const b = await loadPlanDetails(plan_id);
        if (!alive) return;
        setForm(b.form);
        setCategory(categoryForCarrier(b.carrier));
        setCarrierLabel(b.carrier?.name ?? (b.plan ? `#${b.plan.carrier_id}` : ""));
        setEmployerLabel(b.employer_label);
        setCoverageRows(b.coverage_rows);
        setFreqRows(b.freq_rows);
        originalCoverage.current = b.coverage_rows;
        originalFreq.current = b.freq_rows;
        setTableKind(b.coverage_rows.length === 0 ? "blank" : "legacy_default");
      } catch (e: unknown) {
        if (alive) setLoadError(e instanceof Error ? e.message : "Could not load the plan");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, plan_id]);

  // ---- Coverage table reset ---------------------------------------------------
  const resetTable = async (kind: CoverageTableKind) => {
    setTableKind(kind);
    if (kind === "blank") {
      setCoverageRows([]);
      return;
    }
    if (kind === "legacy_default") {
      setCoverageRows(defaultCoverageRows(lookups.categories));
      return;
    }
    setResetting(true);
    try {
      const rows = await loadCustomCoverageRows();
      if (rows.length === 0) toast.info("No Custom Coverage rows are set up yet", { description: "Setup → Insurance → Custom Coverage" });
      setCoverageRows(rows);
    } catch (e: unknown) {
      toast.error("Could not load Custom Coverage", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setResetting(false);
    }
  };

  // ---- Copy From Existing -----------------------------------------------------
  const handleCopy = async (plan: InsurancePlanRead) => {
    setShowCopy(false);
    setLoading(true);
    try {
      const c = await copyPlanDetails(plan.id);
      setForm(c.form);
      setCategory(categoryForCarrier(c.carrier ?? carrierRecord(plan.carrier_id)));
      setCarrierLabel(c.carrier?.name ?? `#${plan.carrier_id}`);
      setEmployerLabel(c.employer_label);
      // In edit mode the copied rows REPLACE this plan's rows on save (the
      // originals are still the diff baseline, so old rows get deleted).
      setCoverageRows(c.coverage_rows);
      setFreqRows(c.freq_rows);
      setTableKind(c.coverage_rows.length === 0 ? "blank" : "legacy_default");
      setCopiedFrom(plan.id);
      toast.success(`Copied plan #${plan.id}`, { description: "Plan, benefits, coverage and frequency rows were copied. Review, then Finish." });
    } catch (e: unknown) {
      toast.error("Copy failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  // ---- Validation --------------------------------------------------------------
  const planErrors = useMemo(() => {
    const errs: string[] = [];
    if (!form.plan_type.trim()) errs.push("Plan Type");
    if (!form.group_number.trim()) errs.push("Group No.");
    if (form.carrier_id == null) errs.push("Carrier");
    if (!form.anniversary_date.trim()) errs.push("Anniversary (Month/Day)");
    return errs;
  }, [form.plan_type, form.group_number, form.carrier_id, form.anniversary_date]);

  const coverageErrors = useMemo(() => {
    const errs: string[] = [];
    for (const r of coverageRows) {
      const pct = Number(r.coverage_pct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) errs.push(`${r.kind === "category" ? r.description : r.code}: coverage must be 0–100`);
      for (const [k, v] of [["Age Min", r.age_min], ["Age Max", r.age_max], ["Waiting Period", r.wait_period]] as const) {
        if (v.trim() !== "" && !/^\d+$/.test(v.trim())) errs.push(`${r.kind === "category" ? r.description : r.code}: ${k} must be a whole number`);
      }
    }
    return errs;
  }, [coverageRows]);

  const validateStep = (s: number): boolean => {
    if (readOnly) return true;
    if (s === 0 && planErrors.length) {
      toast.error("Validation Failed", { description: `${planErrors.join(", ")} ${planErrors.length === 1 ? "is" : "are"} required` });
      return false;
    }
    if (s === 2 && coverageErrors.length) {
      toast.error("Check the coverage table", { description: coverageErrors.slice(0, 3).join(" · ") });
      return false;
    }
    return true;
  };

  const goTo = (s: number) => {
    // Moving forward validates every step passed over; moving back is free.
    for (let i = step; i < s; i++) if (!validateStep(i)) return setStep(i);
    setStep(s);
  };

  // ---- Save --------------------------------------------------------------------
  const persist = async () => {
    setSaving(true);
    try {
      const res = await savePlanDetails({
        plan_id: mode === "edit" ? plan_id : null,
        form,
        coverage_rows: coverageRows,
        freq_rows: freqRows,
        original_coverage_rows: originalCoverage.current,
        original_freq_rows: originalFreq.current,
        code_group_label: (c) => lookups.code_groups.find((g) => g.code === c)?.label ?? c,
      });
      if (res.issues.length) {
        toast.warning(`Plan #${res.plan.id} saved with ${res.issues.length} row problem${res.issues.length === 1 ? "" : "s"}`, {
          description: res.issues.slice(0, 3).join(" · "),
          duration: 8000,
        });
      } else {
        toast.success(mode === "create" ? `${PLAN_CATEGORY_LABEL[category]} insurance plan #${res.plan.id} created` : `Plan #${res.plan.id} updated`);
      }
      if (!res.extras_saved) toast.warning("Browser storage unavailable — the browser-kept fields were not saved");
      onSaved?.(res.plan, carrierLabel, category);
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not save plan" });
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    for (let i = 0; i < STEPS.length; i++) if (!validateStep(i)) return setStep(i);
    // Duplicate validation on the group number (the plan being edited never flags itself).
    setSaving(true);
    let dupes: InsurancePlanRead[] = [];
    try {
      dupes = await findDuplicatePlansByGroup(form.group_number, mode === "edit" ? plan_id : null);
    } catch {
      dupes = [];
    } finally {
      setSaving(false);
    }
    if (dupes.length > 0) {
      setDuplicates(dupes);
      return;
    }
    await persist();
  };

  const handleUseExisting = (plan: InsurancePlanRead) => {
    if (!onUseExisting) return;
    onUseExisting(plan);
  };

  const busy = saving || loading;
  const title = mode === "create" ? "Insurance Details — New Plan" : mode === "edit" ? `Insurance Details — Plan #${plan_id}` : `Insurance Details — Plan #${plan_id} (view)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/45" onClick={busy ? undefined : onClose} />
      <div className="relative flex max-h-[95vh] w-[1080px] max-w-full flex-col rounded border border-[#CBD5E1] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1F6FB2] px-4 py-2 text-white">
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide">
            {readOnly && <Eye className="h-4 w-4" />}
            {title}
          </div>
          <button onClick={onClose} disabled={saving} className="rounded px-1 hover:bg-white/20 disabled:opacity-50" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-3">
          <div className="flex gap-1 overflow-x-auto">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => goTo(i)}
                disabled={busy}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide ${
                  i === step ? "border-[#1F6FB2] text-[#1F6FB2]" : "border-transparent text-[#64748B] hover:text-[#1F3A5F]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {!readOnly && (
            <button type="button" onClick={() => setShowCopy(true)} disabled={busy} className={WZ_BTN_DARK}>
              <Copy className="h-3.5 w-3.5" /> Copy From Existing
            </button>
          )}
        </div>

        {/* Body */}
        <div className="min-h-[420px] flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] text-[#64748B]">
              {copiedFrom != null && (
                <span className="rounded border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[#1F3A5F]">
                  Copied from plan <strong>#{copiedFrom}</strong> — Finish saves {mode === "create" ? "a new plan" : "onto this plan"}.
                </span>
              )}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#1F6FB2]">
              Step {step + 1} of {STEPS.length}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#64748B]">
              <Loader2 className="h-5 w-5 animate-spin text-[#1F6FB2]" /> Loading plan…
            </div>
          ) : loadError ? (
            <div className="py-20 text-center text-sm font-bold text-[#DC2626]">{loadError}</div>
          ) : step === 0 ? (
            <PlanStep
              form={form}
              onChange={update}
              category={category}
              onCategoryChange={setCategory}
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
              lookups={lookups}
              disabled={readOnly || saving}
              showActive={showActive}
              categoryNote={categoryNote?.(category)}
              onUseExistingPlan={onUseExisting ? handleUseExisting : undefined}
              useExistingLabel={useExistingLabel}
              excludePlanId={mode === "edit" ? plan_id : null}
              showExtrasNote={!readOnly}
            />
          ) : step === 1 ? (
            <BenefitsStep form={form} onChange={update} disabled={readOnly || saving} showExtrasNote={!readOnly} />
          ) : step === 2 ? (
            <CoverageStep
              rows={coverageRows}
              onRowsChange={setCoverageRows}
              lookups={lookups}
              tableKind={tableKind}
              onResetTable={(k) => void resetTable(k)}
              resetting={resetting}
              disabled={readOnly || saving}
            />
          ) : (
            <FreqCodeGroupStep rows={freqRows} onRowsChange={setFreqRows} lookups={lookups} disabled={readOnly || saving} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] bg-[#EEF2F7] px-3 py-2">
          <div className="text-[11px] text-[#64748B]">{readOnly ? viewFooter : null}</div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => goTo(step - 1)} disabled={busy} className={WZ_BTN_PRIMARY}>
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button type="button" onClick={() => goTo(step + 1)} disabled={busy} className={WZ_BTN_PRIMARY}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            {!readOnly && step === STEPS.length - 1 && (
              <button type="button" onClick={() => void handleFinish()} disabled={busy || !!loadError} className={WZ_BTN_PRIMARY}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Finish
              </button>
            )}
            <button type="button" onClick={onClose} disabled={saving} className={WZ_BTN_DARK}>
              <X className="h-3.5 w-3.5" /> {readOnly ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      </div>

      {showCopy && <CopyFromExistingDialog onClose={() => setShowCopy(false)} onCopy={(p) => void handleCopy(p)} />}

      {duplicates && (
        <DuplicatePlanDialog
          groupNumber={form.group_number.trim()}
          duplicates={duplicates}
          intent={mode === "create" ? "create" : "save"}
          busy={saving}
          onUse={(plan) => {
            setDuplicates(null);
            handleUseExisting(plan);
          }}
          useLabel={useExistingLabel ?? "Use this plan"}
          onProceed={() => {
            setDuplicates(null);
            void persist();
          }}
          onCancel={() => setDuplicates(null)}
        />
      )}
    </div>
  );
}

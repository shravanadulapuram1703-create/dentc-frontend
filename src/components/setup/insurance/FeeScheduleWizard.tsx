import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
  Upload,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  createFeeSchedule,
  bulkUpsertFeeScheduleEntries,
  createFeeScheduleAssignment,
  updateFeeScheduleAssignment,
  listFeeScheduleAssignments,
  listFeeScheduleEntries,
} from "@/api/generated/endpoints/procedures/procedures";
import { listOfficeGroups, updateOffice } from "@/api/generated/endpoints/organization/organization";
import type {
  FeeScheduleAssignmentRead,
  FeeScheduleEntryRead,
  FeeScheduleRead,
  ProcedureCodeRead,
  ProviderRead,
} from "@/api/generated/model";
import { useFeeVocab, isCopayCapableFeeType } from "@/features/pricing";
import { useOfficeOptions } from "@/features/office-scope/useOfficeOptions";
import { fetchProviderRows, fetchOfficeProviderIds } from "@/services/providerDirectory";
import { todayIsoDate } from "@/utils/datetime";
import { loadProcedureCodes } from "./procedureCodeService";
import { ensureFeeScheduleNames, feeScheduleName } from "./lookupService";
import { parseFeeScheduleUpload } from "@/components/utilities/lib/feeScheduleTemplate";
import {
  type WizardState,
  type WizardFeeRow,
  type OfficeScope,
  type ProviderScope,
  emptyWizardState,
  buildProviderRows,
  deriveSpecialties,
  buildAssignmentTargets,
  planAssignments,
  assignmentTupleKey,
  filledFeeRows,
  invalidFeeCodes,
  latestEntryPerCode,
} from "./feeScheduleWizardModel";

// ============================================================================
// New Fee Schedule Wizard — legacy-parity 4-step "Add New Schedule" flow:
//   Schedule Type → All/Specific Offices → All Providers / Providers /
//   Specialties → Add Fee Schedule. The provider step is DERIVED from the
//   selected offices (office roster ∪ home office, never a static list) and the
//   Fee Schedule → Office(s) → Provider(s) relationship is persisted as
//   fee_schedule_assignments rows (rules in feeScheduleWizardModel.ts).
// ============================================================================

const STEPS = [
  { title: "Schedule", sub: "Type" },
  { title: "All Offices", sub: "Or Specific Offices" },
  { title: "All Providers", sub: "Or Specialties" },
  { title: "Add Fee", sub: "Schedule" },
] as const;

const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";
const PAGE = 200;
const CONCURRENCY = 6;

const EMPTY_FEE: WizardFeeRow = { patient_fee: "", insurance_fee: "", amb_code: "" };

async function fetchAllAssignments(): Promise<FeeScheduleAssignmentRead[]> {
  const first = await listFeeScheduleAssignments({ page: 1, size: PAGE });
  const rows = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => listFeeScheduleAssignments({ page: i + 2, size: PAGE })),
    );
    for (const r of rest) rows.push(...(r.items ?? []));
  }
  return rows;
}

async function fetchAllEntries(fee_schedule_id: number): Promise<FeeScheduleEntryRead[]> {
  const first = await listFeeScheduleEntries({ fee_schedule_id, page: 1, size: PAGE });
  const rows = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => listFeeScheduleEntries({ fee_schedule_id, page: i + 2, size: PAGE })),
    );
    for (const r of rest) rows.push(...(r.items ?? []));
  }
  return rows;
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const next = async (): Promise<void> => {
    while (i < items.length) {
      const item = items[i++] as T;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, next));
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function FeeScheduleWizard({
  schedules,
  onClose,
  onCreated,
}: {
  /** Active schedules (for "Copy Fees From Existing" + duplicate-name warning). */
  schedules: FeeScheduleRead[];
  onClose: () => void;
  onCreated: (fee_schedule_id: number) => void;
}) {
  const { vocab } = useFeeVocab();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(() => emptyWizardState(todayIsoDate()));
  const upd = (u: Partial<WizardState>) => setState((s) => ({ ...s, ...u }));

  // ---- reference data -------------------------------------------------------
  const { data: officeOptions = [], isLoading: officesLoading } = useOfficeOptions();
  const offices = useMemo(() => officeOptions.filter((o) => o.is_active).sort((a, b) => a.id - b.id), [officeOptions]);
  const [groupNames, setGroupNames] = useState<Map<number, string>>(new Map());
  const [directory, setDirectory] = useState<ProviderRead[] | null>(null);
  const [rosters, setRosters] = useState<Map<number, string[] | null>>(new Map());
  const [rostersLoading, setRostersLoading] = useState(false);
  const [existing, setExisting] = useState<FeeScheduleAssignmentRead[] | null>(null);
  const [codes, setCodes] = useState<ProcedureCodeRead[] | null>(null);

  useEffect(() => {
    let alive = true;
    void listOfficeGroups({ size: PAGE })
      .then((r) => alive && setGroupNames(new Map((r.items ?? []).map((g) => [g.id, g.name]))))
      .catch(() => undefined);
    void fetchProviderRows()
      .then((rows) => alive && setDirectory(rows))
      .catch((e: unknown) => {
        if (!alive) return;
        setDirectory([]);
        toast.error("Failed to load providers", { description: errMsg(e) });
      });
    void fetchAllAssignments()
      .then(async (rows) => {
        await ensureFeeScheduleNames([...new Set(rows.map((r) => r.fee_schedule_id))]);
        if (alive) setExisting(rows);
      })
      .catch(() => alive && setExisting([]));
    void loadProcedureCodes()
      .then((m) => {
        if (!alive) return;
        setCodes([...m.values()].filter((c) => c.is_active).sort((a, b) => a.code.localeCompare(b.code)));
      })
      .catch(() => alive && setCodes([]));
    return () => {
      alive = false;
    };
  }, []);

  // Office rosters — fetched per selected office, on demand.
  useEffect(() => {
    if (state.office_scope !== "specific") return;
    const missing = state.office_ids.filter((id) => !rosters.has(id));
    if (missing.length === 0) return;
    let alive = true;
    setRostersLoading(true);
    void Promise.all(missing.map(async (id) => [id, await fetchOfficeProviderIds(id)] as const))
      .then((pairs) => {
        if (!alive) return;
        setRosters((cur) => {
          const next = new Map(cur);
          for (const [id, ids] of pairs) next.set(id, ids);
          return next;
        });
      })
      .finally(() => alive && setRostersLoading(false));
    return () => {
      alive = false;
    };
  }, [state.office_scope, state.office_ids, rosters]);

  // ---- derived --------------------------------------------------------------
  const [showOthers, setShowOthers] = useState(false);
  const providerRows = useMemo(
    () => (directory ? buildProviderRows(directory, state.office_scope, state.office_ids, rosters, showOthers) : []),
    [directory, state.office_scope, state.office_ids, rosters, showOthers],
  );
  const inScopeRows = useMemo(() => providerRows.filter((r) => r.in_scope), [providerRows]);
  const specialtyRows = useMemo(() => deriveSpecialties(providerRows), [providerRows]);

  // Selections are kept while navigating; only what is still offered counts.
  const offeredProviderIds = useMemo(() => new Set(providerRows.map((r) => r.id)), [providerRows]);
  const selectedProviderIds = useMemo(
    () => state.provider_ids.filter((id) => offeredProviderIds.has(id)),
    [state.provider_ids, offeredProviderIds],
  );
  const offeredSpecialties = useMemo(() => new Set(specialtyRows.map((s) => s.specialty)), [specialtyRows]);
  const selectedSpecialties = useMemo(
    () => state.specialties.filter((s) => offeredSpecialties.has(s)),
    [state.specialties, offeredSpecialties],
  );

  const planned = useMemo(
    () =>
      planAssignments(
        buildAssignmentTargets(
          { ...state, provider_ids: selectedProviderIds, specialties: selectedSpecialties },
          providerRows,
        ),
        existing ?? [],
      ),
    [state, selectedProviderIds, selectedSpecialties, providerRows, existing],
  );
  const conflicts = planned.filter((p) => p.existing);
  const [rebind, setRebind] = useState(true);
  const [setOfficeDefault, setSetOfficeDefault] = useState(false);

  const copayCapable = isCopayCapableFeeType(state.fee_type, vocab);
  const isCopay = copayCapable && state.pricing_model === "copay";
  const officeName = (id: number) => offices.find((o) => o.id === id)?.name ?? `Office ${id}`;

  // ---- step validation ------------------------------------------------------
  const stepError = (s: number): string | null => {
    if (s === 0) {
      if (!state.name.trim()) return "Fee Schedule Name is required.";
      if (!state.effective_date) return "Effective Date is required.";
      if (!state.fee_type) return "Select a Fee Schedule Type.";
    }
    if (s === 1 && state.office_scope === "specific" && state.office_ids.length === 0)
      return "Select at least one office, or choose Not Applicable (All Offices).";
    if (s === 2) {
      if (state.provider_scope === "providers" && selectedProviderIds.length === 0) return "Select at least one provider.";
      if (state.provider_scope === "specialties" && selectedSpecialties.length === 0) return "Select at least one specialty.";
    }
    if (s === 3) {
      const bad = invalidFeeCodes(state.fees);
      if (bad.length > 0) return `Invalid fee on ${bad.slice(0, 5).join(", ")}${bad.length > 5 ? "…" : ""} — enter a non-negative amount.`;
    }
    return null;
  };

  const next = () => {
    const err = stepError(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const dirty = state.name.trim() !== "" || state.office_ids.length > 0 || state.provider_ids.length > 0 || Object.keys(state.fees).length > 0;
  const exit = () => {
    if (dirty && !confirm("Exit the wizard? The new fee schedule has not been saved.")) return;
    onClose();
  };

  // ---- apply ----------------------------------------------------------------
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState("");
  const apply = async () => {
    for (let s = 0; s < STEPS.length; s++) {
      const err = stepError(s);
      if (err) {
        setStep(s);
        toast.error(err);
        return;
      }
    }
    setApplying(true);
    let fee_schedule_id: number | null = null;
    const failures: string[] = [];
    let created_rows = 0;
    let rebound_rows = 0;
    let skipped_rows = 0;
    try {
      setProgress("Creating fee schedule…");
      const created = await createFeeSchedule({
        name: state.name.trim(),
        fee_type: state.fee_type,
        pricing_model: copayCapable ? state.pricing_model : "percentage",
        effective_date: state.effective_date,
        is_active: true,
      });
      fee_schedule_id = created.id;

      const filled = filledFeeRows(state.fees);
      if (filled.length > 0) {
        setProgress(`Saving ${filled.length} fee${filled.length === 1 ? "" : "s"}…`);
        const num = (v: string) => (v.trim() === "" ? null : Number(v));
        await bulkUpsertFeeScheduleEntries(created.id, {
          effective_date: state.effective_date,
          entries: filled.map(([procedure_code, r]) => ({
            procedure_code,
            patient_fee: num(r.patient_fee),
            insurance_fee: isCopay ? num(r.insurance_fee) : null,
            amb_code: r.amb_code.trim() || null,
            // A typed 0 is a deliberate "no charge", never an unpriced blank (docs/pricing §1.4).
            is_no_charge: r.patient_fee.trim() !== "" && Number(r.patient_fee) === 0,
          })),
        });
      }

      if (planned.length > 0) {
        setProgress(`Linking ${planned.length} office/provider assignment${planned.length === 1 ? "" : "s"}…`);
        await runPool(planned, async (p) => {
          const label = p.target.provider_id ?? p.target.specialty_id ?? "";
          const where = p.target.office_id != null ? ` @ ${officeName(p.target.office_id)}` : "";
          try {
            if (p.existing) {
              if (!rebind) {
                skipped_rows++;
                return;
              }
              await updateFeeScheduleAssignment(p.existing.id, { fee_schedule_id: created.id });
              rebound_rows++;
            } else {
              await createFeeScheduleAssignment({ ...p.target, fee_schedule_id: created.id });
              created_rows++;
            }
          } catch (e: unknown) {
            failures.push(`${label}${where}: ${errMsg(e)}`);
          }
        });
      }

      if (setOfficeDefault && state.provider_scope === "all" && state.office_scope === "specific") {
        setProgress("Setting office default fee schedule…");
        await runPool(state.office_ids, async (office_id) => {
          try {
            await updateOffice(office_id, { default_fee_schedule_id: created.id });
          } catch (e: unknown) {
            failures.push(`${officeName(office_id)} default: ${errMsg(e)}`);
          }
        });
      }

      const parts = [
        filled.length > 0 ? `${filled.length} fee${filled.length === 1 ? "" : "s"}` : null,
        created_rows > 0 ? `${created_rows} new assignment${created_rows === 1 ? "" : "s"}` : null,
        rebound_rows > 0 ? `${rebound_rows} re-bound` : null,
        skipped_rows > 0 ? `${skipped_rows} kept on their current schedule` : null,
      ].filter(Boolean);
      if (failures.length > 0) {
        toast.warning(`Fee schedule "${created.name}" created — ${failures.length} link(s) failed`, {
          description: failures.slice(0, 4).join("\n") + (failures.length > 4 ? `\n…and ${failures.length - 4} more` : ""),
          duration: 12000,
        });
      } else {
        toast.success(`Fee schedule "${created.name}" created`, { description: parts.join(" · ") || undefined });
      }
      onCreated(created.id);
    } catch (e: unknown) {
      if (fee_schedule_id != null) {
        toast.error("Fee schedule created, but saving its fees failed", { description: errMsg(e) });
        onCreated(fee_schedule_id);
      } else {
        toast.error("Could not create the fee schedule", { description: errMsg(e) });
      }
    } finally {
      setApplying(false);
      setProgress("");
    }
  };

  // ---- render ---------------------------------------------------------------
  const feeTypeLabel = vocab.fee_types.find((t) => t.code === state.fee_type)?.label ?? state.fee_type;
  const duplicateName = schedules.some((s) => s.name.trim().toLowerCase() === state.name.trim().toLowerCase() && state.name.trim() !== "");

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-stretch justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-[1500px] rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1F3A5F] text-white">
          <h2 className="text-sm font-bold">New Fee Schedule Wizard</h2>
          <button onClick={exit} disabled={applying} className="p-1 hover:bg-white/10 rounded" aria-label="Close wizard">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[300px_1fr]">
          {/* Selection history */}
          <aside className="hidden md:block border-r-2 border-[#E2E8F0] bg-[#F7F9FC] overflow-y-auto">
            <div className="px-3 py-2 bg-[#3A6EA5] text-white text-xs font-bold uppercase tracking-wide">Selection History</div>
            <div className="p-3 space-y-2 text-xs">
              <HistoryCard>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span className="text-[#64748B]">Fee Schedule Name</span>
                  <span className="text-[#64748B]">Effective Date</span>
                  <span className="font-bold text-[#3A6EA5] break-words">{state.name || "—"}</span>
                  <span className="font-bold text-[#3A6EA5]">{state.effective_date || "—"}</span>
                  <span className="text-[#64748B] mt-1">Fee Schedule Type</span>
                  <span className="text-[#64748B] mt-1">Pricing</span>
                  <span className="font-bold text-[#3A6EA5] break-words">{feeTypeLabel || "—"}</span>
                  <span className="font-bold text-[#3A6EA5] uppercase">{copayCapable ? state.pricing_model : "percentage"}</span>
                </div>
              </HistoryCard>
              {step >= 1 && (
                <HistoryCard title="Does this schedule apply to All Offices or Specific Offices?">
                  <span className="font-bold text-[#3A6EA5]">
                    {state.office_scope === "all" ? "Not Applicable (All Offices)" : `Specific Offices (${state.office_ids.length})`}
                  </span>
                  {state.office_scope === "specific" && state.office_ids.length > 0 && (
                    <ul className="mt-1 text-[#475569] space-y-0.5">
                      {state.office_ids.map((id) => (
                        <li key={id}>
                          {id} — {officeName(id)}
                        </li>
                      ))}
                    </ul>
                  )}
                </HistoryCard>
              )}
              {step >= 2 && (
                <HistoryCard title="Does this schedule apply to All Providers, Specific Providers, or Specific Specialties?">
                  <span className="font-bold text-[#3A6EA5]">
                    {state.provider_scope === "all"
                      ? "Not Applicable (All Providers)"
                      : state.provider_scope === "providers"
                        ? `Providers (${selectedProviderIds.length})`
                        : `Specialties (${selectedSpecialties.length})`}
                  </span>
                  {state.provider_scope === "providers" && selectedProviderIds.length > 0 && (
                    <ul className="mt-1 text-[#475569] space-y-0.5 max-h-40 overflow-y-auto">
                      {selectedProviderIds.map((id) => {
                        const r = providerRows.find((p) => p.id === id);
                        return (
                          <li key={id}>
                            {r ? `${r.first_name} ${r.last_name}`.trim() : id} ({r?.short_id || id})
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {state.provider_scope === "specialties" && selectedSpecialties.length > 0 && (
                    <ul className="mt-1 text-[#475569] space-y-0.5">
                      {selectedSpecialties.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  )}
                </HistoryCard>
              )}
            </div>
          </aside>

          {/* Wizard body */}
          <section className="flex flex-col min-h-0 p-2 sm:p-3">
            <div className="flex flex-col flex-1 min-h-0 border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
              <Stepper step={step} />
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {step === 0 && (
                  <StepScheduleType
                    state={state}
                    upd={upd}
                    feeTypes={vocab.fee_types}
                    pricingModels={vocab.pricing_models}
                    copayCapable={copayCapable}
                    isCopayCapable={(t) => isCopayCapableFeeType(t, vocab)}
                    duplicateName={duplicateName}
                  />
                )}
                {step === 1 && (
                  <StepOffices
                    scope={state.office_scope}
                    setScope={(office_scope) => upd({ office_scope })}
                    selected={state.office_ids}
                    setSelected={(office_ids) => upd({ office_ids })}
                    offices={offices}
                    groupNames={groupNames}
                    loading={officesLoading}
                  />
                )}
                {step === 2 && (
                  <StepProviders
                    state={state}
                    upd={upd}
                    rows={providerRows}
                    inScopeCount={inScopeRows.length}
                    specialties={specialtyRows}
                    selectedProviderIds={selectedProviderIds}
                    selectedSpecialties={selectedSpecialties}
                    loading={directory === null || rostersLoading}
                    showOthers={showOthers}
                    setShowOthers={setShowOthers}
                    officeName={officeName}
                    existing={existing ?? []}
                  />
                )}
                {step === 3 && (
                  <StepFees
                    state={state}
                    upd={upd}
                    codes={codes}
                    isCopay={isCopay}
                    schedules={schedules}
                    conflicts={conflicts.length}
                    conflictNames={[...new Set(conflicts.map((c) => feeScheduleName(c.existing?.fee_schedule_id)))]}
                    plannedCount={planned.length}
                    rebind={rebind}
                    setRebind={setRebind}
                    setOfficeDefault={setOfficeDefault}
                    setSetOfficeDefault={setSetOfficeDefault}
                    officeDefaults={state.office_ids.map((id) => ({
                      id,
                      name: officeName(id),
                      current: offices.find((o) => o.id === id)?.default_fee_schedule_id ?? null,
                    }))}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#DCE5EF] border-t-2 border-[#E2E8F0]">
                <div className="flex gap-2">
                  {step < 3 && (
                    <FooterBtn onClick={exit} disabled={applying} tone="muted">
                      <X className="w-3.5 h-3.5" /> Exit
                    </FooterBtn>
                  )}
                  {step > 0 && (
                    <FooterBtn onClick={() => setStep((s) => s - 1)} disabled={applying} tone="muted">
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </FooterBtn>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {applying && <span className="text-xs text-[#1F3A5F] font-semibold">{progress}</span>}
                  {step < 3 ? (
                    <FooterBtn onClick={next} tone="primary">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </FooterBtn>
                  ) : (
                    <>
                      <FooterBtn onClick={() => void apply()} disabled={applying} tone="primary">
                        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Apply
                      </FooterBtn>
                      <FooterBtn onClick={exit} disabled={applying} tone="muted">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </FooterBtn>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

function HistoryCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="bg-[#DCE5EF] rounded-md p-2.5">
      {title && (
        <div className="flex items-start justify-between gap-2 text-[#1E293B] mb-1">
          <span>{title}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#3A6EA5] shrink-0 mt-0.5" />
        </div>
      )}
      {children}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="bg-[#2C3E50] px-4 py-3">
      <ol className="flex items-start justify-center">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.title} className="flex items-start">
              <div className="flex flex-col items-center w-28 sm:w-36 text-center">
                <span
                  className={`w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center ${
                    active ? "border-[#60A5FA] bg-[#3A6EA5]" : done ? "border-[#60A5FA] bg-[#3A6EA5]/60" : "border-[#94A3B8] bg-[#94A3B8]/40"
                  }`}
                >
                  {done ? <Check className="w-3 h-3 text-white" /> : <span className={`w-2 h-2 rounded-full ${active ? "bg-white" : "bg-[#CBD5E1]"}`} />}
                </span>
                <span className={`mt-1 text-[11px] leading-tight font-semibold ${active || done ? "text-white" : "text-[#94A3B8]"}`}>
                  {s.title}
                  <br />
                  {s.sub}
                </span>
              </div>
              {i < STEPS.length - 1 && <span className="hidden sm:block w-16 lg:w-24 mt-3 border-t-2 border-dashed border-[#64748B]" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FooterBtn({
  onClick,
  disabled,
  tone,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "primary" | "muted";
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold uppercase disabled:opacity-50 ${
        tone === "primary" ? "bg-[#3A6EA5] text-white hover:bg-[#1F3A5F]" : "bg-[#64748B] text-white hover:bg-[#475569]"
      }`}
    >
      {children}
    </button>
  );
}

function Radio<T extends string>({ value, current, onChange, children }: { value: T; current: T; onChange: (v: T) => void; children: ReactNode }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-[#1E293B] cursor-pointer">
      <input type="radio" checked={current === value} onChange={() => onChange(value)} className="accent-[#3A6EA5]" />
      {children}
    </label>
  );
}

function Notice({ tone, children }: { tone: "info" | "warn"; children: ReactNode }) {
  const warn = tone === "warn";
  return (
    <div className={`flex items-start gap-2 rounded-lg border-2 px-3 py-2 text-xs ${warn ? "border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]" : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]"}`}>
      {warn ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-8 pr-2 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#3A6EA5]" />
    </div>
  );
}

function ClearFilters({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 px-2.5 py-1.5 bg-[#64748B] text-white rounded text-[11px] font-bold uppercase hover:bg-[#475569]">
      <RotateCcw className="w-3 h-3" /> Clear All Filters
    </button>
  );
}

function SelectTable({ head, children, footer }: { head: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="max-h-[48vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#3A6EA5] text-white sticky top-0 z-10">{head}</thead>
          <tbody className="divide-y divide-[#EEF2F7]">{children}</tbody>
        </table>
      </div>
      {footer && <div className="px-3 py-1.5 text-xs text-[#64748B] bg-[#F7F9FC] border-t-2 border-[#E2E8F0]">{footer}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Schedule Type
// ---------------------------------------------------------------------------

function StepScheduleType({
  state,
  upd,
  feeTypes,
  pricingModels,
  copayCapable,
  isCopayCapable,
  duplicateName,
}: {
  state: WizardState;
  upd: (u: Partial<WizardState>) => void;
  feeTypes: { code: string; label: string }[];
  pricingModels: { code: string; label: string }[];
  copayCapable: boolean;
  isCopayCapable: (fee_type: string) => boolean;
  duplicateName: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h3 className="text-center text-base font-bold text-[#1E293B]">Welcome To Fee Schedule Setup Wizard</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-xs font-bold text-[#1F3A5F]">
          Fee Schedule Name<span className="text-[#DC2626]">*</span>
          <input autoFocus value={state.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} maxLength={100} />
          {duplicateName && <span className="block mt-1 font-normal text-[#B45309]">A fee schedule with this name already exists.</span>}
        </label>
        <label className="block text-xs font-bold text-[#1F3A5F]">
          Effective Date<span className="text-[#DC2626]">*</span>
          <input type="date" value={state.effective_date} onChange={(e) => upd({ effective_date: e.target.value })} className={INPUT_CLS} />
        </label>
      </div>
      <div>
        <div className="text-xs font-bold text-[#1F3A5F] mb-1.5">
          Fee Schedule Type<span className="text-[#DC2626]">*</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {feeTypes.map((t) => (
            <Radio
              key={t.code}
              value={t.code}
              current={state.fee_type}
              onChange={(fee_type) =>
                upd({ fee_type, pricing_model: isCopayCapable(fee_type) ? state.pricing_model : "percentage" })
              }
            >
              {t.label}
            </Radio>
          ))}
          {feeTypes.length === 0 && <span className="text-xs text-[#64748B]">Loading types…</span>}
        </div>
      </div>
      {copayCapable && (
        <div>
          <div className="text-xs font-bold text-[#1F3A5F] mb-1.5">Pricing Model</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {pricingModels.map((m) => (
              <Radio key={m.code} value={m.code} current={state.pricing_model} onChange={(pricing_model) => upd({ pricing_model })}>
                {m.label}
              </Radio>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Offices
// ---------------------------------------------------------------------------

function StepOffices({
  scope,
  setScope,
  selected,
  setSelected,
  offices,
  groupNames,
  loading,
}: {
  scope: OfficeScope;
  setScope: (s: OfficeScope) => void;
  selected: number[];
  setSelected: (ids: number[]) => void;
  offices: { id: number; name: string; office_group_id?: number | null }[];
  groupNames: Map<number, string>;
  loading: boolean;
}) {
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return offices;
    return offices.filter(
      (o) =>
        String(o.id).includes(t) ||
        o.name.toLowerCase().includes(t) ||
        (o.office_group_id != null && (groupNames.get(o.office_group_id) ?? "").toLowerCase().includes(t)),
    );
  }, [offices, q, groupNames]);
  const sel = new Set(selected);
  const allVisible = visible.length > 0 && visible.every((o) => sel.has(o.id));
  const toggle = (id: number) => setSelected(sel.has(id) ? selected.filter((x) => x !== id) : [...selected, id].sort((a, b) => a - b));
  const toggleAll = () => {
    const ids = new Set(selected);
    for (const o of visible) {
      if (allVisible) ids.delete(o.id);
      else ids.add(o.id);
    }
    setSelected([...ids].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-[#1E293B]">Does This Schedule Apply To All Offices Or Specific Offices?</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-5">
          <Radio value="all" current={scope} onChange={setScope}>
            Not Applicable (All Offices)
          </Radio>
          <Radio value="specific" current={scope} onChange={setScope}>
            Specific Offices
          </Radio>
        </div>
        {scope === "specific" && (
          <div className="flex items-center gap-2">
            <SearchBox value={q} onChange={setQ} placeholder="Filter by OID, office name or group…" />
            <ClearFilters onClick={() => setQ("")} />
          </div>
        )}
      </div>
      {scope === "specific" &&
        (loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-[#64748B]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading offices…
          </div>
        ) : (
          <SelectTable
            head={
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allVisible} onChange={toggleAll} aria-label="Select all offices" />
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold">OID</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Office Name</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Office Group</th>
              </tr>
            }
            footer={`Showing ${visible.length} of ${offices.length} offices · ${selected.length} row${selected.length === 1 ? "" : "s"} selected`}
          >
            {visible.map((o) => (
              <tr key={o.id} onClick={() => toggle(o.id)} className={`cursor-pointer ${sel.has(o.id) ? "bg-[#E8EFF7]" : "hover:bg-[#F7F9FC]"}`}>
                <td className="px-3 py-1.5 text-center">
                  <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select office ${o.id}`} />
                </td>
                <td className="px-3 py-1.5 text-[#1E293B]">{o.id}</td>
                <td className="px-3 py-1.5 text-[#1E293B]">{o.name}</td>
                <td className="px-3 py-1.5 text-[#64748B]">{o.office_group_id != null ? (groupNames.get(o.office_group_id) ?? `#${o.office_group_id}`) : ""}</td>
              </tr>
            ))}
          </SelectTable>
        ))}
      {scope === "all" && <Notice tone="info">The schedule will not be narrowed to any office — provider / specialty links made in the next step apply in every office.</Notice>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Providers / Specialties
// ---------------------------------------------------------------------------

function StepProviders({
  state,
  upd,
  rows,
  inScopeCount,
  specialties,
  selectedProviderIds,
  selectedSpecialties,
  loading,
  showOthers,
  setShowOthers,
  officeName,
  existing,
}: {
  state: WizardState;
  upd: (u: Partial<WizardState>) => void;
  rows: ReturnType<typeof buildProviderRows>;
  inScopeCount: number;
  specialties: ReturnType<typeof deriveSpecialties>;
  selectedProviderIds: string[];
  selectedSpecialties: string[];
  loading: boolean;
  showOthers: boolean;
  setShowOthers: (v: boolean) => void;
  officeName: (id: number) => string;
  existing: FeeScheduleAssignmentRead[];
}) {
  const [q, setQ] = useState("");
  const specific = state.office_scope === "specific";

  // "Currently bound to" — the schedule(s) that already own this provider's tuple(s).
  const boundTo = useMemo(() => {
    const byKey = new Map(existing.map((a) => [assignmentTupleKey(a), a.fee_schedule_id]));
    return (provider_id: string, office_ids: number[]) => {
      const offices: (number | null)[] = !specific ? [null] : office_ids.length > 0 ? office_ids : state.office_ids;
      const ids = new Set<number>();
      for (const office_id of offices) {
        const hit = byKey.get(assignmentTupleKey({ provider_id, office_id }));
        if (hit != null) ids.add(hit);
      }
      return [...ids].map((id) => feeScheduleName(id)).join(", ");
    };
  }, [existing, specific, state.office_ids]);

  const visibleRows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.id, r.short_id ?? "", r.first_name, r.last_name, r.specialty ?? ""].some((v) => v.toLowerCase().includes(t)),
    );
  }, [rows, q]);
  const visibleSpecialties = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? specialties.filter((s) => s.specialty.toLowerCase().includes(t)) : specialties;
  }, [specialties, q]);

  const selP = new Set(selectedProviderIds);
  const allP = visibleRows.length > 0 && visibleRows.every((r) => selP.has(r.id));
  const toggleP = (id: string) =>
    upd({ provider_ids: selP.has(id) ? selectedProviderIds.filter((x) => x !== id) : [...selectedProviderIds, id] });
  const toggleAllP = () => {
    const ids = new Set(selectedProviderIds);
    for (const r of visibleRows) {
      if (allP) ids.delete(r.id);
      else ids.add(r.id);
    }
    upd({ provider_ids: [...ids] });
  };

  const selS = new Set(selectedSpecialties);
  const allS = visibleSpecialties.length > 0 && visibleSpecialties.every((s) => selS.has(s.specialty));
  const toggleS = (s: string) =>
    upd({ specialties: selS.has(s) ? selectedSpecialties.filter((x) => x !== s) : [...selectedSpecialties, s] });
  const toggleAllS = () => {
    const ids = new Set(selectedSpecialties);
    for (const s of visibleSpecialties) {
      if (allS) ids.delete(s.specialty);
      else ids.add(s.specialty);
    }
    upd({ specialties: [...ids] });
  };

  const officeList = state.office_ids.map((id) => `${id} — ${officeName(id)}`).join(", ");

  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-[#1E293B]">Does This Schedule Apply To All Providers or Specific Providers or Specific Specialties?</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-5">
          <Radio<ProviderScope> value="all" current={state.provider_scope} onChange={(provider_scope) => upd({ provider_scope })}>
            Not Applicable (All Providers)
          </Radio>
          <Radio<ProviderScope> value="providers" current={state.provider_scope} onChange={(provider_scope) => upd({ provider_scope })}>
            Providers
          </Radio>
          <Radio<ProviderScope> value="specialties" current={state.provider_scope} onChange={(provider_scope) => upd({ provider_scope })}>
            Specialties
          </Radio>
        </div>
        {state.provider_scope !== "all" && (
          <div className="flex items-center gap-2">
            <SearchBox value={q} onChange={setQ} placeholder={state.provider_scope === "providers" ? "Filter by ID, short ID, name, specialty…" : "Filter specialties…"} />
            <ClearFilters onClick={() => setQ("")} />
          </div>
        )}
      </div>

      {state.provider_scope !== "all" && specific && (
        <div className="text-xs text-[#64748B]">
          Providers serving the selected office{state.office_ids.length === 1 ? "" : "s"}: <span className="font-semibold text-[#1F3A5F]">{officeList}</span>
        </div>
      )}

      {state.provider_scope === "all" && (
        <Notice tone="info">
          The schedule is not limited to particular providers.
          {specific
            ? " An office alone cannot own a fee-schedule assignment — on the last step you can make this the default fee schedule of the selected office(s)."
            : " With All Offices + All Providers no assignment is created; point offices or patients at it from Office Setup / the patient, or bind it to a payer in Fee Schedule Assignments."}
        </Notice>
      )}

      {state.provider_scope !== "all" && loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading providers for the selected offices…
        </div>
      )}

      {state.provider_scope === "providers" && !loading && (
        <>
          {specific && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-[#1F3A5F] font-semibold">
                <input type="checkbox" checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} className="accent-[#3A6EA5]" />
                Also show providers not assigned to the selected office(s)
              </label>
              {inScopeCount === 0 && !showOthers && (
                <span className="text-xs text-[#B45309]">No providers are assigned to the selected office(s) (Setup → Office Assignment).</span>
              )}
            </div>
          )}
          <SelectTable
            head={
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allP} onChange={toggleAllP} aria-label="Select all providers" />
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold">Provider ID</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Short ID</th>
                <th className="px-3 py-2 text-left text-xs font-bold">First Name</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Last Name</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Specialty</th>
                {specific && <th className="px-3 py-2 text-left text-xs font-bold">Office(s)</th>}
                <th className="px-3 py-2 text-left text-xs font-bold">Currently Bound To</th>
              </tr>
            }
            footer={`Showing ${visibleRows.length} of ${rows.length} providers · ${selectedProviderIds.length} row${selectedProviderIds.length === 1 ? "" : "s"} selected`}
          >
            {visibleRows.map((r) => {
              const bound = boundTo(r.id, r.office_ids);
              return (
                <tr key={r.id} onClick={() => toggleP(r.id)} className={`cursor-pointer ${selP.has(r.id) ? "bg-[#E8EFF7]" : "hover:bg-[#F7F9FC]"} ${r.in_scope ? "" : "text-[#94A3B8]"}`}>
                  <td className="px-3 py-1.5 text-center">
                    <input type="checkbox" checked={selP.has(r.id)} onChange={() => toggleP(r.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select provider ${r.id}`} />
                  </td>
                  <td className="px-3 py-1.5">{r.id}</td>
                  <td className="px-3 py-1.5">{r.short_id ?? ""}</td>
                  <td className="px-3 py-1.5">{r.first_name}</td>
                  <td className="px-3 py-1.5">{r.last_name}</td>
                  <td className="px-3 py-1.5 text-[#64748B]">{r.specialty ?? ""}</td>
                  {specific && (
                    <td className="px-3 py-1.5 text-xs">
                      {r.in_scope ? r.office_ids.join(", ") : <span className="italic">not assigned — applies to all selected</span>}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-xs text-[#B45309]">{bound}</td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={specific ? 8 : 7} className="px-3 py-6 text-center text-sm text-[#64748B]">
                  No providers to show.
                </td>
              </tr>
            )}
          </SelectTable>
        </>
      )}

      {state.provider_scope === "specialties" && !loading && (
        <SelectTable
          head={
            <tr>
              <th className="w-10 px-3 py-2">
                <input type="checkbox" checked={allS} onChange={toggleAllS} aria-label="Select all specialties" />
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold">Specialty</th>
              <th className="px-3 py-2 text-left text-xs font-bold">Providers{specific ? " in selected office(s)" : ""}</th>
            </tr>
          }
          footer={`${visibleSpecialties.length} specialt${visibleSpecialties.length === 1 ? "y" : "ies"} · ${selectedSpecialties.length} selected`}
        >
          {visibleSpecialties.map((s) => (
            <tr key={s.specialty} onClick={() => toggleS(s.specialty)} className={`cursor-pointer ${selS.has(s.specialty) ? "bg-[#E8EFF7]" : "hover:bg-[#F7F9FC]"}`}>
              <td className="px-3 py-1.5 text-center">
                <input type="checkbox" checked={selS.has(s.specialty)} onChange={() => toggleS(s.specialty)} onClick={(e) => e.stopPropagation()} aria-label={`Select specialty ${s.specialty}`} />
              </td>
              <td className="px-3 py-1.5">{s.specialty}</td>
              <td className="px-3 py-1.5 text-[#64748B]">{s.provider_count}</td>
            </tr>
          ))}
          {visibleSpecialties.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-6 text-center text-sm text-[#64748B]">
                No provider in the selected office(s) has a specialty set (Setup → Providers → Specialty).
              </td>
            </tr>
          )}
        </SelectTable>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Add Fee Schedule
// ---------------------------------------------------------------------------

function StepFees({
  state,
  upd,
  codes,
  isCopay,
  schedules,
  conflicts,
  conflictNames,
  plannedCount,
  rebind,
  setRebind,
  setOfficeDefault,
  setSetOfficeDefault,
  officeDefaults,
}: {
  state: WizardState;
  upd: (u: Partial<WizardState>) => void;
  codes: ProcedureCodeRead[] | null;
  isCopay: boolean;
  schedules: FeeScheduleRead[];
  conflicts: number;
  conflictNames: string[];
  plannedCount: number;
  rebind: boolean;
  setRebind: (v: boolean) => void;
  setOfficeDefault: boolean;
  setSetOfficeDefault: (v: boolean) => void;
  officeDefaults: { id: number; name: string; current: number | null }[];
}) {
  const [q, setQ] = useState("");
  const [onlyFilled, setOnlyFilled] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [copying, setCopying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const visible = useMemo(() => {
    if (!codes) return [];
    const t = q.trim().toLowerCase();
    return codes.filter((c) => {
      if (onlyFilled) {
        const f = state.fees[c.code];
        if (!f || (f.patient_fee === "" && f.insurance_fee === "" && f.amb_code === "")) return false;
      }
      return !t || c.code.toLowerCase().includes(t) || c.description.toLowerCase().includes(t);
    });
  }, [codes, q, onlyFilled, state.fees]);

  const setFee = (code: string, u: Partial<WizardFeeRow>) =>
    upd({ fees: { ...state.fees, [code]: { ...(state.fees[code] ?? EMPTY_FEE), ...u } } });

  const copy = async (id: string) => {
    setCopyFrom(id);
    if (!id) return;
    const filled = filledFeeRows(state.fees).length;
    if (filled > 0 && !confirm(`Replace the ${filled} fee(s) already entered with the fees from "${feeScheduleName(Number(id))}"?`)) {
      setCopyFrom("");
      return;
    }
    setCopying(true);
    try {
      const entries = await fetchAllEntries(Number(id));
      const latest = latestEntryPerCode(entries, state.effective_date || todayIsoDate());
      const fees: Record<string, WizardFeeRow> = {};
      for (const [code, e] of latest) {
        // A legacy 0.00 blank is "unpriced", not a price — don't turn it into a no-charge.
        const fee = e.patient_fee != null && (Number(e.patient_fee) > 0 || e.is_no_charge) ? e.patient_fee : "";
        const ins = isCopay && e.insurance_fee != null ? e.insurance_fee : "";
        if (fee === "" && ins === "" && !e.amb_code) continue;
        fees[code] = { patient_fee: fee, insurance_fee: ins, amb_code: e.amb_code ?? "" };
      }
      upd({ fees });
      toast.success(`Copied ${Object.keys(fees).length} fee(s)`);
    } catch (e: unknown) {
      toast.error("Copy failed", { description: errMsg(e) });
    } finally {
      setCopying(false);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const { rows, report } = await parseFeeScheduleUpload(file);
      if (!report.header_ok) {
        toast.error("Unrecognised file", { description: report.errors[0]?.message });
        return;
      }
      const fees = { ...state.fees };
      for (const r of rows) fees[r.procedure_code] = { ...(fees[r.procedure_code] ?? EMPTY_FEE), patient_fee: r.fee };
      upd({ fees });
      const known = new Set((codes ?? []).map((c) => c.code));
      const unknown = rows.filter((r) => !known.has(r.procedure_code)).length;
      toast.success(`Imported ${rows.length} fee(s)`, {
        description:
          [report.errors.length ? `${report.errors.length} row(s) rejected` : "", unknown ? `${unknown} code(s) not in the active code list` : ""]
            .filter(Boolean)
            .join(" · ") || undefined,
      });
    } catch (e: unknown) {
      toast.error("Import failed", { description: errMsg(e) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const filledCount = filledFeeRows(state.fees).length;
  const allOfficesAllProviders = state.office_scope === "all" && state.provider_scope === "all";
  const officeOnly = state.office_scope === "specific" && state.provider_scope === "all";

  return (
    <div className="space-y-3">
      {/* What Apply will link */}
      {plannedCount > 0 && (
        <Notice tone="info">
          Apply links this schedule to <strong>{plannedCount}</strong> office/{state.provider_scope === "providers" ? "provider" : "specialty"} combination
          {plannedCount === 1 ? "" : "s"}.
        </Notice>
      )}
      {conflicts > 0 && (
        <Notice tone="warn">
          <strong>{conflicts}</strong> of these combinations already price from another schedule ({conflictNames.join(", ")}).
          <label className="flex items-center gap-1.5 mt-1 font-semibold">
            <input type="checkbox" checked={rebind} onChange={(e) => setRebind(e.target.checked)} className="accent-[#3A6EA5]" />
            Re-point them to this new schedule (unchecked = keep their current schedule)
          </label>
        </Notice>
      )}
      {officeOnly && (
        <Notice tone="warn">
          With All Providers no assignment can be created for an office alone.
          <label className="flex items-center gap-1.5 mt-1 font-semibold">
            <input type="checkbox" checked={setOfficeDefault} onChange={(e) => setSetOfficeDefault(e.target.checked)} className="accent-[#3A6EA5]" />
            Make this the default fee schedule of the selected office(s)
          </label>
          <ul className="mt-1 space-y-0.5">
            {officeDefaults.map((o) => (
              <li key={o.id}>
                {o.id} — {o.name}: currently {o.current != null ? `"${feeScheduleName(o.current)}" (#${o.current})` : "none"}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {allOfficesAllProviders && (
        <Notice tone="info">This schedule will not be linked to any office or provider. You can bind it later from Fee Schedule Assignments, Office Setup or a patient.</Notice>
      )}

      <div className="text-sm text-[#1E293B]">
        <span className="font-bold text-[#3A6EA5]">Add Fee Schedule</span>{" "}
        <span className="text-xs text-[#64748B]">(If the procedure code does not appear on this screen, please activate it in Setup → Procedure Codes)</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-[#1F3A5F]">
          Copy Fees From Existing Fee Schedule
          <select value={copyFrom} onChange={(e) => void copy(e.target.value)} disabled={copying} className="px-2 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-xs min-w-52">
            <option value="">None</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (#{s.id})
              </option>
            ))}
          </select>
          {copying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        </label>
        <div className="flex items-center gap-2 text-xs font-bold text-[#1F3A5F]">
          Import From Excel File
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importFile(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-[#3A6EA5] hover:bg-[#E8EFF7]">
            <Upload className="w-3.5 h-3.5" /> Upload File
          </button>
          <span className="font-normal text-[#64748B]">{fileName || "No file chosen"}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Filter by code or description…" />
        <label className="inline-flex items-center gap-1.5 text-xs text-[#1F3A5F] font-semibold">
          <input type="checkbox" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} className="accent-[#3A6EA5]" />
          Only codes with a fee ({filledCount})
        </label>
      </div>

      {codes === null ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading procedure codes…
        </div>
      ) : (
        <SelectTable
          head={
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold w-24">Code</th>
              <th className="px-3 py-2 text-left text-xs font-bold">Description</th>
              <th className="px-3 py-2 text-left text-xs font-bold w-40">{isCopay ? "Patient Copay" : "Fee"}</th>
              {isCopay && <th className="px-3 py-2 text-left text-xs font-bold w-40">Plan Pays</th>}
              <th className="px-3 py-2 text-left text-xs font-bold w-40">AMB Code</th>
            </tr>
          }
          footer={`Showing ${visible.length} of ${codes.length} codes · ${filledCount} with a fee`}
        >
          {visible.map((c) => {
            const f = state.fees[c.code] ?? EMPTY_FEE;
            return (
              <tr key={c.code}>
                <td className="px-3 py-1 font-semibold text-[#1E293B]">{c.code}</td>
                <td className="px-3 py-1 text-[#475569] text-xs">{c.description}</td>
                <td className="px-3 py-1">
                  <input value={f.patient_fee} onChange={(e) => setFee(c.code, { patient_fee: e.target.value })} inputMode="decimal" aria-label={`Fee for ${c.code}`} className="w-full px-2 py-1 border border-[#CBD5E1] rounded text-sm focus:outline-none focus:border-[#3A6EA5]" />
                </td>
                {isCopay && (
                  <td className="px-3 py-1">
                    <input value={f.insurance_fee} onChange={(e) => setFee(c.code, { insurance_fee: e.target.value })} inputMode="decimal" aria-label={`Plan pays for ${c.code}`} className="w-full px-2 py-1 border border-[#CBD5E1] rounded text-sm focus:outline-none focus:border-[#3A6EA5]" />
                  </td>
                )}
                <td className="px-3 py-1">
                  <input value={f.amb_code} onChange={(e) => setFee(c.code, { amb_code: e.target.value })} maxLength={20} aria-label={`AMB code for ${c.code}`} className="w-full px-2 py-1 border border-[#CBD5E1] rounded text-sm focus:outline-none focus:border-[#3A6EA5]" />
                </td>
              </tr>
            );
          })}
        </SelectTable>
      )}
    </div>
  );
}

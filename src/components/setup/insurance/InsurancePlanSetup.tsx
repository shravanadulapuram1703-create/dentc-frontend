import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  listInsurancePlans,
  getInsurancePlan,
  createInsurancePlan,
  updateInsurancePlan,
  deleteInsurancePlan,
} from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead } from "@/api/generated/model";
import {
  type PlanForm,
  type PlanCategory,
  emptyPlanForm,
  planToForm,
  buildPlanCreate,
  buildPlanUpdate,
  categoryForCarrier,
} from "./planData";
import {
  ensureCarrierNames,
  ensureCarrierRecords,
  ensureEmployerNames,
  carrierName,
  carrierRecord,
  employerName,
  searchCarriers,
  searchEmployers,
} from "./lookupService";
import EntityPicker from "./EntityPicker";
import CoverageRulesSection from "./CoverageRulesSection";
import PlanFormFields from "./PlanFormFields";
import CopyFromExistingDialog from "./CopyFromExistingDialog";
import DuplicatePlanDialog from "./DuplicatePlanDialog";
import { findDuplicatePlansByGroup } from "./planDuplicates";

// ============================================================================
// Insurance Plan Setup — master-detail over /api/v1/insurance-plans.
// Plans have no name (carrier + employer + group + plan_type identify them) and
// there are ~31k of them, so the list is SERVER-paginated and filtered by
// carrier_id / employer_id / is_active / search. Carrier & employer names are
// resolved lazily per visible page (lookupService). The detail embeds the
// plan's coverage-rules sub-resource. Mirrors the ProviderSetup pattern.
//
// The add/edit FORM BODY is `PlanFormFields`, shared verbatim with the patient
// module's "Add New Ins Plan" modal (src/features/patient-insurance) so both
// hosts offer the same fields and behaviour — Dental/Medical selector,
// carrier/employer pickers with + ADD NEW, Copy From Existing.
// ============================================================================

const PAGE_SIZE = 25;

export default function InsurancePlanSetup() {
  const [plans, setPlans] = useState<InsurancePlanRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setNameTick] = useState(0);

  // Server-side list controls.
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterCarrier, setFilterCarrier] = useState<{ id: number | null; label: string }>({ id: null, label: "" });
  const [filterEmployer, setFilterEmployer] = useState<{ id: number | null; label: string }>({ id: null, label: "" });
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  // Detail state.
  const [showList, setShowList] = useState(true);
  const [mode, setMode] = useState<"add" | "edit">("edit");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(() => emptyPlanForm());
  const [carrierLabel, setCarrierLabel] = useState("");
  const [employerLabel, setEmployerLabel] = useState("");
  const [category, setCategory] = useState<PlanCategory>("D");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);
  // Active plans already on this group number — blocks the save until resolved.
  const [duplicates, setDuplicates] = useState<InsurancePlanRead[] | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listInsurancePlans({
        page,
        size: PAGE_SIZE,
        sort: "id",
        order: "asc",
        search: search || null,
        carrier_id: filterCarrier.id,
        employer_id: filterEmployer.id,
        is_active: activeFilter === "all" ? null : activeFilter === "active",
      });
      const items = res.items ?? [];
      setPlans(items);
      setTotalPages(res.meta?.pages ?? 1);
      setTotal(res.meta?.total ?? items.length);
      // Resolve carrier/employer names for the visible page.
      await Promise.all([
        ensureCarrierNames(items.map((p) => p.carrier_id)),
        ensureEmployerNames(items.map((p) => p.employer_id).filter((x): x is number => x != null)),
      ]);
      setNameTick((t) => t + 1);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCarrier.id, filterEmployer.id, activeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reset to page 1 whenever a filter/search changes.
  useEffect(() => {
    setPage(1);
  }, [search, filterCarrier.id, filterEmployer.id, activeFilter]);

  const updateForm = (u: Partial<PlanForm>) => setForm((p) => ({ ...p, ...u }));

  const openAdd = () => {
    setForm(emptyPlanForm());
    setCarrierLabel("");
    setEmployerLabel("");
    setCategory("D");
    setCopiedFrom(null);
    setSelectedId(null);
    setMode("add");
    setShowList(false);
  };

  const openPlan = async (p: InsurancePlanRead) => {
    try {
      const full = await getInsurancePlan(p.id);
      setForm(planToForm(full));
      setCarrierLabel(carrierName(full.carrier_id));
      setEmployerLabel(full.employer_id != null ? employerName(full.employer_id) : "");
      // Dental/Medical is a property of the carrier, not the plan.
      await ensureCarrierRecords([full.carrier_id]);
      setCategory(categoryForCarrier(carrierRecord(full.carrier_id)));
      setCopiedFrom(null);
      setSelectedId(full.id);
      setMode("edit");
      setShowList(false);
    } catch (e: unknown) {
      toast.error("Failed to open plan", { description: e instanceof Error ? e.message : undefined });
    }
  };

  // Seed the form from an existing plan (legacy "Copy From Existing"). Nothing is
  // linked to the source — Create Plan still POSTs a brand-new plan.
  const handleCopy = (plan: InsurancePlanRead) => {
    const carrier = carrierRecord(plan.carrier_id);
    setForm(planToForm(plan));
    setCarrierLabel(carrier?.name ?? `#${plan.carrier_id}`);
    setEmployerLabel(plan.employer_id == null ? "" : employerName(plan.employer_id));
    setCategory(categoryForCarrier(carrier));
    setCopiedFrom(plan.id);
    setShowCopy(false);
    toast.success(`Copied plan #${plan.id}`, { description: "Review the details, then save the new plan." });
  };

  const handleCancel = () => {
    if (saving) return;
    setShowList(true);
    setSelectedId(null);
    setForm(emptyPlanForm());
    setCopiedFrom(null);
  };

  const persistPlan = async () => {
    setSaving(true);
    try {
      if (selectedId == null) {
        const created = await createInsurancePlan(buildPlanCreate(form));
        toast.success("Plan created");
        setSelectedId(created.id);
        setMode("edit");
        setCopiedFrom(null);
      } else {
        await updateInsurancePlan(selectedId, buildPlanUpdate(form));
        toast.success("Plan updated");
      }
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not save plan" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (form.carrier_id == null) {
      toast.error("Validation Failed", { description: "Carrier is required" });
      return;
    }
    // Duplicate validation on the group number — on edits too, since renaming a
    // plan onto an existing group creates the same duplicate. The plan being
    // edited never flags itself.
    setSaving(true);
    let dupes: InsurancePlanRead[] = [];
    try {
      dupes = await findDuplicatePlansByGroup(form.group_number, selectedId);
    } catch {
      // A failed check must not block legitimate work — fall through and save.
      dupes = [];
    } finally {
      setSaving(false);
    }
    if (dupes.length > 0) {
      setDuplicates(dupes);
      return;
    }
    await persistPlan();
  };

  const handleDelete = async (p: InsurancePlanRead) => {
    if (!confirm(`Delete this plan (#${p.id})? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await deleteInsurancePlan(p.id);
      toast.success("Plan deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setDeletingId(null);
    }
  };

  /* -------------------- LIST VIEW -------------------- */
  if (showList) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1600px] mx-auto p-6">
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            {/* Header */}
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">Insurance Plans</h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      {total.toLocaleString()} plans · carrier, employer, maximums &amp; coverage rules
                    </p>
                  </div>
                </div>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Plan
                </button>
              </div>

              {/* Search + filters */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearch(searchInput.trim());
                  }}
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search plans (group #, id)… press Enter"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                </form>
                <EntityPicker
                  valueId={filterCarrier.id}
                  valueLabel={filterCarrier.label}
                  onChange={(id, label) => setFilterCarrier({ id: id as number | null, label })}
                  search={searchCarriers}
                  placeholder="Filter by carrier…"
                  allowClear
                />
                <EntityPicker
                  valueId={filterEmployer.id}
                  valueLabel={filterEmployer.label}
                  onChange={(id, label) => setFilterEmployer({ id: id as number | null, label })}
                  search={searchEmployers}
                  placeholder="Filter by employer…"
                  allowClear
                />
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
                  className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                <span className="text-sm font-bold">Loading plans…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold text-[#DC2626]">Unable to load plans</p>
                <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
                <button
                  onClick={() => void loadData()}
                  className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <FileText className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">No plans match your filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                      <tr>
                        {["Carrier", "Employer", "Group #", "Type", "Coverage", "Indiv Max", "Status", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {plans.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => void openPlan(p)}
                          className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                            {carrierName(p.carrier_id)}
                            <span className="ml-2 text-[10px] text-[#94A3B8]">(#{p.id})</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">
                            {p.employer_id != null ? employerName(p.employer_id) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">{p.group_number || "—"}</td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">{p.plan_type || "—"}</td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">{p.coverage_type || "—"}</td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">
                            {p.individual_max != null ? `$${p.individual_max}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {p.is_active ? (
                              <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">Active</span>
                            ) : (
                              <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">Inactive</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => void handleDelete(p)}
                              disabled={deletingId === p.id}
                              className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t-2 border-[#E2E8F0] bg-[#F7F9FC]">
                  <span className="text-xs font-bold text-[#64748B]">
                    Page {page} of {totalPages} · {total.toLocaleString()} plans
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-40"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- DETAIL VIEW -------------------- */
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1100px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleCancel} className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors" title="Back to list">
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">
                    {mode === "add" ? "Add Insurance Plan" : `Plan #${selectedId}`}
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    {carrierLabel || (mode === "add" ? "Select a carrier" : "")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCopy(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-sm disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" /> Copy From Existing
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold transition-all text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {mode === "add" ? "Create Plan" : "Save Plan"}
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {copiedFrom != null && (
              <p className="mb-4 rounded-lg border-2 border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1F3A5F]">
                Copied from plan <strong>#{copiedFrom}</strong>. Edit anything below —{" "}
                {mode === "add" ? "Create Plan saves a new plan" : "saving updates this plan"}.
              </p>
            )}

            <PlanFormFields
              form={form}
              onChange={updateForm}
              category={category}
              onCategoryChange={setCategory}
              carrierLabel={carrierLabel}
              onCarrierChange={(id, label) => {
                updateForm({ carrier_id: id });
                setCarrierLabel(label);
              }}
              employerLabel={employerLabel}
              onEmployerChange={(id, label) => {
                updateForm({ employer_id: id });
                setEmployerLabel(label);
              }}
              showActive
              disabled={saving}
              excludePlanId={selectedId}
              onUseExistingPlan={(plan) => void openPlan(plan)}
              useExistingLabel="Open"
            />

            {mode === "edit" && selectedId != null ? (
              <CoverageRulesSection insPlanId={selectedId} />
            ) : (
              <div className="mt-6 border-t-2 border-[#E2E8F0] pt-4">
                <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-2">Coverage Rules</h3>
                <p className="text-xs text-[#64748B]">Save the plan first to add coverage rules.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCopy && <CopyFromExistingDialog onClose={() => setShowCopy(false)} onCopy={handleCopy} />}

      {duplicates && (
        <DuplicatePlanDialog
          groupNumber={form.group_number.trim()}
          duplicates={duplicates}
          intent={selectedId == null ? "create" : "save"}
          busy={saving}
          onUse={(plan) => {
            setDuplicates(null);
            void openPlan(plan);
          }}
          useLabel="Open"
          onProceed={() => {
            setDuplicates(null);
            void persistPlan();
          }}
          onCancel={() => setDuplicates(null)}
        />
      )}
    </div>
  );
}



import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Network,
  Plus,
  X,
  Trash2,
  Loader2,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  listFeeScheduleAssignments,
  createFeeScheduleAssignment,
  deleteFeeScheduleAssignment,
} from "@/api/generated/endpoints/procedures/procedures";
import type { FeeScheduleAssignmentRead } from "@/api/generated/model";
import {
  type AssignmentForm,
  emptyAssignmentForm,
  buildAssignmentCreate,
} from "./feeScheduleData";
import {
  ensureOfficeNames,
  ensureCarrierNames,
  ensurePlanLabels,
  ensureProviderNames,
  ensureFeeScheduleNames,
  officeName,
  carrierName,
  planLabel,
  providerName,
  feeScheduleName,
  searchFeeSchedules,
  searchCarriers,
  searchPlans,
  searchProviders,
  searchOffices,
} from "./lookupService";
import EntityPicker from "./EntityPicker";

// ============================================================================
// Fee Schedule Assignments — the "lineage" grid over
// /api/v1/fee-schedule-assignments. Each row links a fee schedule to a target
// (office / carrier / plan / provider / specialty). Rows store ids only, so the
// grid resolves office / carrier / plan / provider / fee-schedule NAMES per
// page (lookupService). Server-paginated + filterable.
// ============================================================================

const PAGE_SIZE = 50;
const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

type Filters = {
  feeSchedule: { id: number | null; label: string };
  plan: { id: number | null; label: string };
  provider: { id: string | null; label: string };
  office: { id: number | null; label: string };
};

const EMPTY_FILTERS: Filters = {
  feeSchedule: { id: null, label: "" },
  plan: { id: null, label: "" },
  provider: { id: null, label: "" },
  office: { id: null, label: "" },
};

export default function FeeScheduleAssignments() {
  const [rows, setRows] = useState<FeeScheduleAssignmentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setNameTick] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listFeeScheduleAssignments({
        page,
        size: PAGE_SIZE,
        sort: "id",
        order: "asc",
        fee_schedule_id: filters.feeSchedule.id,
        ins_plan_id: filters.plan.id,
        provider_id: filters.provider.id,
        office_id: filters.office.id,
      });
      const items = res.items ?? [];
      setRows(items);
      setTotalPages(res.meta?.pages ?? 1);
      setTotal(res.meta?.total ?? items.length);
      setSelected(new Set());
      await Promise.all([
        ensureOfficeNames(items.map((r) => r.office_id)),
        ensureCarrierNames(items.map((r) => r.carrier_id).filter((x): x is number => x != null)),
        ensurePlanLabels(items.map((r) => r.ins_plan_id)),
        ensureProviderNames(items.map((r) => r.provider_id)),
        ensureFeeScheduleNames(items.map((r) => r.fee_schedule_id)),
      ]);
      setNameTick((t) => t + 1);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load assignments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const hasFilters =
    filters.feeSchedule.id != null || filters.plan.id != null || filters.provider.id != null || filters.office.id != null;

  const toggleSel = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => (s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const deleteOne = async (r: FeeScheduleAssignmentRead) => {
    if (!confirm("Delete this fee schedule assignment?")) return;
    setDeletingId(r.id);
    try {
      await deleteFeeScheduleAssignment(r.id);
      toast.success("Assignment deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected assignment(s)?`)) return;
    setBulkDeleting(true);
    let ok = 0;
    let fail = 0;
    for (const id of selected) {
      try {
        await deleteFeeScheduleAssignment(id);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkDeleting(false);
    if (fail === 0) toast.success(`Deleted ${ok} assignment(s)`);
    else toast.warning(`Deleted ${ok}, ${fail} failed`);
    await loadData();
  };

  const exportCsv = () => {
    const header = ["Office", "Carrier Name", "Carrier ID", "Plan", "Specialty", "Provider", "Fee ID", "Fee Schedule", "Created By", "Created On"];
    const lines = rows.map((r) =>
      [
        officeName(r.office_id),
        carrierName(r.carrier_id),
        r.carrier_id ?? "",
        r.ins_plan_id != null ? planLabel(r.ins_plan_id) : "",
        r.specialty_id ?? "",
        providerName(r.provider_id),
        r.fee_schedule_id,
        feeScheduleName(r.fee_schedule_id),
        r.created_by ?? "",
        r.created_at ?? "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fee-schedule-assignments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Network className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">Fee Schedule Assignments</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    {total.toLocaleString()} assignments · schedule → office / carrier / plan / provider
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={exportCsv} disabled={rows.length === 0} className="flex items-center gap-2 px-3 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-40">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <button onClick={() => setAssignOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm">
                  <Plus className="w-4 h-4" /> Assign New
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <EntityPicker valueId={filters.feeSchedule.id} valueLabel={filters.feeSchedule.label} onChange={(id, label) => setFilters((f) => ({ ...f, feeSchedule: { id: id as number | null, label } }))} search={searchFeeSchedules} placeholder="Filter: fee schedule…" allowClear />
              <EntityPicker valueId={filters.plan.id} valueLabel={filters.plan.label} onChange={(id, label) => setFilters((f) => ({ ...f, plan: { id: id as number | null, label } }))} search={searchPlans} placeholder="Filter: plan…" allowClear />
              <EntityPicker valueId={filters.provider.id} valueLabel={filters.provider.label} onChange={(id, label) => setFilters((f) => ({ ...f, provider: { id: id as string | null, label } }))} search={searchProviders} placeholder="Filter: provider…" allowClear />
              <EntityPicker valueId={filters.office.id} valueLabel={filters.office.label} onChange={(id, label) => setFilters((f) => ({ ...f, office: { id: id as number | null, label } }))} search={searchOffices} placeholder="Filter: office…" allowClear />
            </div>
            <div className="flex items-center gap-3 mt-3">
              {hasFilters && (
                <button onClick={() => setFilters(EMPTY_FILTERS)} className="flex items-center gap-1.5 text-xs font-bold text-[#3A6EA5] hover:underline">
                  <Filter className="w-3.5 h-3.5" /> Clear all filters
                </button>
              )}
              {selected.size > 0 && (
                <button onClick={() => void deleteSelected()} disabled={bulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#FCA5A5] text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] font-bold text-xs disabled:opacity-50">
                  {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete selected ({selected.size})
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
              <span className="text-sm font-bold">Loading assignments…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load assignments</p>
              <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
              <button onClick={() => void loadData()} className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white">
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Network className="w-12 h-12 text-[#CBD5E1]" />
              <p className="text-[#64748B] font-bold text-sm">{hasFilters ? "No assignments match your filters" : "No fee schedule assignments yet"}</p>
              {!hasFilters && (
                <button onClick={() => setAssignOpen(true)} className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm">
                  <Plus className="w-4 h-4" /> Assign your first fee schedule
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} className="w-4 h-4 accent-[#3A6EA5]" />
                      </th>
                      {["Office", "Carrier", "Carrier ID", "Plan", "Specialty", "Provider", "Fee ID", "Fee Schedule", "Created By", "Created On", ""].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F7F9FC]">
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} className="w-4 h-4 accent-[#3A6EA5]" />
                        </td>
                        <td className="px-3 py-2.5 text-sm text-[#64748B]">{officeName(r.office_id)}</td>
                        <td className="px-3 py-2.5 text-sm text-[#1E293B] font-semibold">{r.carrier_id != null ? carrierName(r.carrier_id) : "—"}</td>
                        <td className="px-3 py-2.5 text-sm text-[#64748B]">{r.carrier_id ?? "—"}</td>
                        <td className="px-3 py-2.5 text-sm text-[#64748B]">{r.ins_plan_id != null ? planLabel(r.ins_plan_id) : "—"}</td>
                        <td className="px-3 py-2.5 text-sm text-[#64748B]">{r.specialty_id || "—"}</td>
                        <td className="px-3 py-2.5 text-sm text-[#64748B]">{providerName(r.provider_id)}</td>
                        <td className="px-3 py-2.5 text-sm text-[#64748B]">{r.fee_schedule_id}</td>
                        <td className="px-3 py-2.5 text-sm text-[#1E293B] font-semibold">{feeScheduleName(r.fee_schedule_id)}</td>
                        <td className="px-3 py-2.5 text-sm text-[#64748B]">{r.created_by || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-[#64748B] whitespace-nowrap">{r.created_at ? r.created_at.slice(0, 10) : "—"}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => void deleteOne(r)} disabled={deletingId === r.id} className="p-2 hover:bg-[#FEE2E2] rounded-lg disabled:opacity-50" title="Delete">
                            {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" /> : <Trash2 className="w-4 h-4 text-[#DC2626]" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t-2 border-[#E2E8F0] bg-[#F7F9FC]">
                <span className="text-xs font-bold text-[#64748B]">
                  Page {page} of {totalPages} · {total.toLocaleString()} assignments
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-40">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {assignOpen && (
        <AssignModal
          onClose={() => setAssignOpen(false)}
          onDone={async () => {
            setAssignOpen(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assign New modal
// ---------------------------------------------------------------------------

function AssignModal({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [form, setForm] = useState<AssignmentForm>(() => emptyAssignmentForm());
  const [labels, setLabels] = useState({ feeSchedule: "", carrier: "", plan: "", provider: "", office: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.fee_schedule_id == null) {
      toast.error("A fee schedule is required");
      return;
    }
    setSaving(true);
    try {
      await createFeeScheduleAssignment(buildAssignmentCreate(form));
      toast.success("Fee schedule assigned");
      await onDone();
    } catch (e: unknown) {
      toast.error("Assign failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <h2 className="text-lg font-bold text-[#1F3A5F]">Assign Fee Schedule</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#E8EFF7] rounded-lg">
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#64748B]">
            Pick the fee schedule and the target(s) it applies to. Leave a target blank to make it apply broadly.
          </p>
          <Labeled label="Fee Schedule" required>
            <EntityPicker valueId={form.fee_schedule_id} valueLabel={labels.feeSchedule} onChange={(id, label) => { setForm((f) => ({ ...f, fee_schedule_id: id as number | null })); setLabels((l) => ({ ...l, feeSchedule: label })); }} search={searchFeeSchedules} placeholder="Select fee schedule…" />
          </Labeled>
          <div className="grid grid-cols-2 gap-4">
            <Labeled label="Carrier">
              <EntityPicker valueId={form.carrier_id} valueLabel={labels.carrier} onChange={(id, label) => { setForm((f) => ({ ...f, carrier_id: id as number | null })); setLabels((l) => ({ ...l, carrier: label })); }} search={searchCarriers} placeholder="Any carrier…" allowClear />
            </Labeled>
            <Labeled label="Plan">
              <EntityPicker valueId={form.ins_plan_id} valueLabel={labels.plan} onChange={(id, label) => { setForm((f) => ({ ...f, ins_plan_id: id as number | null })); setLabels((l) => ({ ...l, plan: label })); }} search={searchPlans} placeholder="Any plan…" allowClear />
            </Labeled>
            <Labeled label="Provider">
              <EntityPicker valueId={form.provider_id} valueLabel={labels.provider} onChange={(id, label) => { setForm((f) => ({ ...f, provider_id: id as string | null })); setLabels((l) => ({ ...l, provider: label })); }} search={searchProviders} placeholder="Any provider…" allowClear />
            </Labeled>
            <Labeled label="Office">
              <EntityPicker valueId={form.office_id} valueLabel={labels.office} onChange={(id, label) => { setForm((f) => ({ ...f, office_id: id as number | null })); setLabels((l) => ({ ...l, office: label })); }} search={searchOffices} placeholder="Any office…" allowClear />
            </Labeled>
            <Labeled label="Specialty (code)">
              <input value={form.specialty_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, specialty_id: e.target.value || null }))} className={INPUT_CLS} placeholder="optional" />
            </Labeled>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg font-bold text-sm disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => void save()} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg font-bold text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Assign
          </button>
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#1F3A5F] mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

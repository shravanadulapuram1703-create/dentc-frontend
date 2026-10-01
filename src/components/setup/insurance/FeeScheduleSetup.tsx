import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Coins,
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  listFeeSchedules,
  createFeeSchedule,
  updateFeeSchedule,
  listFeeScheduleEntries,
  createFeeScheduleEntry,
  updateFeeScheduleEntry,
  deleteFeeScheduleEntry,
  adjustFeeScheduleEntries,
  retireFeeSchedule,
} from "@/api/generated/endpoints/procedures/procedures";
import { todayIsoDate } from "@/utils/datetime";
import type { FeeScheduleRead, FeeScheduleEntryRead } from "@/api/generated/model";
import {
  type FeeScheduleForm,
  type EntryForm,
  emptyFeeScheduleForm,
  feeScheduleToForm,
  buildFeeScheduleCreate,
  buildFeeScheduleUpdate,
  emptyEntryForm,
  entryToForm,
  buildEntryCreate,
  buildEntryUpdate,
} from "./feeScheduleData";
import { loadProcedureCodes, codeDescription, searchProcedureCodes } from "./procedureCodeService";
import { feeScheduleName, ensureFeeScheduleNames } from "./lookupService";
import EntityPicker from "./EntityPicker";
import { useFeeVocab, isCopayCapableFeeType, useFeeScheduleUsage, PricingHealthPanel } from "@/features/pricing";

// ============================================================================
// Fee Schedule Setup — two-pane (schedule list ⇄ code table) over
// /api/v1/fee-schedules + /fee-schedule-entries. "View by Schedule" shows a
// schedule's code/fee table; "View by Codes" finds a procedure code's fee
// across every schedule. Descriptions are joined from procedure-codes.
// Mirrors the legacy Fee Schedule Setup workflow in the app design system.
// ============================================================================

const PAGE_SIZE = 200;
const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

function fmtFee(v: string | null | undefined): string {
  if (v == null || v === "") return "—";
  return `$${v}`;
}

export default function FeeScheduleSetup() {
  const [tab, setTab] = useState<"schedule" | "codes">("schedule");

  // Procedure-code map is needed by both tabs for descriptions.
  const [codesReady, setCodesReady] = useState(false);
  useEffect(() => {
    void loadProcedureCodes()
      .then(() => setCodesReady(true))
      .catch(() => setCodesReady(true));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <PricingHealthPanel />
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header + tabs */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Fee Schedule Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Manage fee schedules and their procedure-code fees
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {(["schedule", "codes"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-all ${
                    tab === t
                      ? "bg-white text-[#3A6EA5] border-t-4 border-[#3A6EA5]"
                      : "text-[#64748B] hover:text-[#1F3A5F] hover:bg-[#E8EFF7]"
                  }`}
                >
                  {t === "schedule" ? "View by Schedule" : "View by Codes"}
                </button>
              ))}
            </div>
          </div>

          {tab === "schedule" ? <ViewBySchedule codesReady={codesReady} /> : <ViewByCodes codesReady={codesReady} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View by Schedule
// ---------------------------------------------------------------------------

function ViewBySchedule({ codesReady }: { codesReady: boolean }) {
  const [schedules, setSchedules] = useState<FeeScheduleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "id">("name");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Schedule editor modal.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<FeeScheduleForm>(() => emptyFeeScheduleForm());
  const [savingSchedule, setSavingSchedule] = useState(false);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      // Active-only: the backend soft-deletes schedules (DELETE flips is_active
      // → false rather than removing the row), so filtering here makes a deleted
      // schedule disappear from the rail as users expect. See devreport FEE-1.
      const res = await listFeeSchedules({ size: PAGE_SIZE, sort: "name", order: "asc", is_active: true });
      const items = res.items ?? [];
      setSchedules(items);
      setSelectedId((cur) => cur ?? items[0]?.id ?? null);
    } catch (e: unknown) {
      toast.error("Failed to load fee schedules", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const types = useMemo(() => {
    const s = new Set<string>();
    for (const f of schedules) if (f.fee_type) s.add(f.fee_type);
    return [...s].sort();
  }, [schedules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules
      .filter((f) => (typeFilter === "all" || f.fee_type === typeFilter) && (!q || f.name.toLowerCase().includes(q) || String(f.id).includes(q)))
      .sort((a, b) => (sortBy === "id" ? a.id - b.id : a.name.localeCompare(b.name)));
  }, [schedules, search, typeFilter, sortBy]);

  const selected = schedules.find((s) => s.id === selectedId) ?? null;

  const openAdd = () => {
    setForm(emptyFeeScheduleForm());
    setEditorMode("add");
    setEditorOpen(true);
  };
  const openEdit = () => {
    if (!selected) return;
    setForm(feeScheduleToForm(selected));
    setEditorMode("edit");
    setEditorOpen(true);
  };

  const saveSchedule = async () => {
    if (!form.name.trim()) {
      toast.error("Schedule name is required");
      return;
    }
    setSavingSchedule(true);
    try {
      if (editorMode === "add") {
        const created = await createFeeSchedule(buildFeeScheduleCreate(form));
        toast.success("Fee schedule created");
        setSelectedId(created.id);
      } else if (selected) {
        await updateFeeSchedule(selected.id, buildFeeScheduleUpdate(form));
        toast.success("Fee schedule updated");
      }
      setEditorOpen(false);
      await loadSchedules();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSavingSchedule(false);
    }
  };

  const deleteSchedule = async () => {
    if (!selected) return;
    if (!confirm(`Retire fee schedule "${selected.name}"? It will stop pricing new charges. Posted history is unaffected, and it can be restored.`)) return;
    try {
      // Retire (deactivate) rather than delete — the server refuses (409) while the
      // schedule is still referenced by an assignment, office pointer or patient.
      await retireFeeSchedule(selected.id);
      toast.success("Fee schedule retired");
      setSelectedId(null);
      await loadSchedules();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined;
      toast.error("Cannot retire — this schedule is still in use", { description: msg });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
      {/* Left rail */}
      <div className="border-r-2 border-[#E2E8F0] bg-[#FBFCFE]">
        <div className="p-3 space-y-2 border-b-2 border-[#E2E8F0]">
          <button
            onClick={openAdd}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
          >
            <Plus className="w-4 h-4" /> Add New Schedule
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search schedules…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
            />
          </div>
          <div className="flex gap-2">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 px-2 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#3A6EA5]">
              <option value="all">All Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="flex-1 px-2 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#3A6EA5]">
              <option value="name">Sort: Name</option>
              <option value="id">Sort: ID</option>
            </select>
          </div>
        </div>
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[#64748B]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-[#64748B]">No schedules found.</p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`w-full text-left px-4 py-3 border-b border-[#EEF2F7] transition-colors ${
                  selectedId === f.id ? "bg-[#E8EFF7] border-l-4 border-l-[#3A6EA5]" : "hover:bg-[#F1F5F9]"
                }`}
              >
                <div className="text-sm font-bold text-[#1E293B] truncate">{f.name}</div>
                <div className="text-xs text-[#94A3B8]">
                  #{f.id}
                  {f.fee_type ? ` · ${f.fee_type}` : ""}
                  {!f.is_active ? " · inactive" : ""}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right detail */}
      <div className="p-5">
        {!selected ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
            <Coins className="w-12 h-12 text-[#CBD5E1] mb-3" />
            <p className="text-sm font-bold">Select a fee schedule</p>
          </div>
        ) : (
          <ScheduleDetail
            schedule={selected}
            codesReady={codesReady}
            onEdit={openEdit}
            onDelete={() => void deleteSchedule()}
          />
        )}
      </div>

      {editorOpen && (
        <ScheduleEditorModal
          mode={editorMode}
          form={form}
          setForm={setForm}
          saving={savingSchedule}
          onSave={() => void saveSchedule()}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule detail — entries table + entry CRUD + bulk adjust
// ---------------------------------------------------------------------------

function ScheduleDetail({
  schedule,
  codesReady,
  onEdit,
  onDelete,
}: {
  schedule: FeeScheduleRead;
  codesReady: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [entries, setEntries] = useState<FeeScheduleEntryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [effFilter, setEffFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [entryForm, setEntryForm] = useState<EntryForm>(() => emptyEntryForm());
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { usage } = useFeeScheduleUsage(schedule.id);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const first = await listFeeScheduleEntries({
        fee_schedule_id: schedule.id,
        size: PAGE_SIZE,
        page: 1,
        sort: "procedure_code",
        order: "asc",
      });
      const all: FeeScheduleEntryRead[] = [...(first.items ?? [])];
      const pages = first.meta?.pages ?? 1;
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            listFeeScheduleEntries({
              fee_schedule_id: schedule.id,
              size: PAGE_SIZE,
              page: i + 2,
              sort: "procedure_code",
              order: "asc",
            }),
          ),
        );
        for (const r of rest) all.push(...(r.items ?? []));
      }
      setEntries(all);
    } catch (e: unknown) {
      toast.error("Failed to load entries", { description: e instanceof Error ? e.message : undefined });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [schedule.id]);

  useEffect(() => {
    void loadEntries();
    setEditingId(null);
    setEffFilter("all");
  }, [loadEntries]);

  const effectiveDates = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) if (e.effective_date) s.add(e.effective_date);
    return [...s].sort().reverse();
  }, [entries]);

  const visible = useMemo(
    () => (effFilter === "all" ? entries : entries.filter((e) => e.effective_date === effFilter)),
    [entries, effFilter],
  );

  const startAdd = () => {
    setEntryForm(emptyEntryForm(effFilter !== "all" ? effFilter : effectiveDates[0] ?? ""));
    setEditingId("new");
  };
  const startEdit = (e: FeeScheduleEntryRead) => {
    setEntryForm(entryToForm(e));
    setEditingId(e.id);
  };
  const cancelEntry = () => {
    setEditingId(null);
    setEntryForm(emptyEntryForm());
  };

  const saveEntry = async () => {
    if (!entryForm.procedure_code.trim()) {
      toast.error("Procedure code is required");
      return;
    }
    setSavingEntry(true);
    try {
      if (editingId === "new") {
        await createFeeScheduleEntry(buildEntryCreate(schedule.id, entryForm));
        toast.success("Entry added");
      } else if (typeof editingId === "number") {
        await updateFeeScheduleEntry(editingId, buildEntryUpdate(entryForm));
        toast.success("Entry updated");
      }
      cancelEntry();
      await loadEntries();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSavingEntry(false);
    }
  };

  const removeEntry = async (e: FeeScheduleEntryRead) => {
    if (!confirm(`Delete entry ${e.procedure_code}?`)) return;
    setDeletingId(e.id);
    try {
      await deleteFeeScheduleEntry(e.id);
      toast.success("Entry deleted");
      await loadEntries();
    } catch (err: unknown) {
      toast.error("Delete failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeletingId(null);
    }
  };

  const isCopay = schedule.pricing_model === "copay";

  return (
    <div>
      {/* Schedule header */}
      <div className="flex items-start justify-between mb-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          <div>
            <span className="text-xs font-bold text-[#94A3B8] uppercase">Fee ID</span>
            <div className="font-bold text-[#1E293B]">{schedule.id}</div>
          </div>
          <div>
            <span className="text-xs font-bold text-[#94A3B8] uppercase">Type</span>
            <div className="font-bold text-[#1E293B]">
              {schedule.fee_type || "—"}
              {isCopay && (
                <span className="ml-1.5 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded align-middle">COPAY</span>
              )}
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-[#94A3B8] uppercase">Name</span>
            <div className="font-bold text-[#1E293B]">{schedule.name}</div>
          </div>
          {usage && (
            <div className="col-span-2">
              <span className="text-xs font-bold text-[#94A3B8] uppercase">Where used</span>
              <div className="text-xs text-[#64748B]">
                {usage.counts.assignments} assignment{usage.counts.assignments === 1 ? "" : "s"} ·{" "}
                {usage.counts.offices} office{usage.counts.offices === 1 ? "" : "s"} ·{" "}
                {usage.counts.patients.toLocaleString()} patient{usage.counts.patients === 1 ? "" : "s"} ·{" "}
                {usage.counts.entries} code{usage.counts.entries === 1 ? "" : "s"}
                {!usage.can_retire && (
                  <span className="ml-1.5 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">IN USE — cannot retire</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-xs">
            <Pencil className="w-3.5 h-3.5" /> Edit Schedule
          </button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#FCA5A5] text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] font-bold text-xs">
            <Trash2 className="w-3.5 h-3.5" /> Retire
          </button>
        </div>
      </div>

      {/* Code information toolbar */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide">
          Code Information {entries.length > 0 && <span className="text-[#94A3B8]">({visible.length})</span>}
        </h3>
        <div className="flex items-center gap-2">
          {effectiveDates.length > 0 && (
            <select value={effFilter} onChange={(e) => setEffFilter(e.target.value)} className="px-2 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#3A6EA5]">
              <option value="all">All Effective Dates</option>
              {effectiveDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setBulkOpen(true)}
            disabled={visible.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-xs disabled:opacity-40"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Increase/Decrease
          </button>
          <button
            onClick={startAdd}
            disabled={editingId !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-xs disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add Code
          </button>
        </div>
      </div>

      {editingId === "new" && (
        <EntryEditor form={entryForm} setForm={setEntryForm} onSave={() => void saveEntry()} onCancel={cancelEntry} saving={savingEntry} isCopay={isCopay} />
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading codes…
        </div>
      ) : visible.length === 0 && editingId !== "new" ? (
        <p className="text-sm text-[#64748B] py-8 text-center">No codes on this schedule yet. Add a code to set its fee.</p>
      ) : (
        <div className="overflow-auto border-2 border-[#E2E8F0] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Code", "Description", isCopay ? "Patient Copay" : "Patient Fee", ...(isCopay ? ["Plan Pays"] : []), "Effective", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {visible.map((e) =>
                editingId === e.id ? (
                  <tr key={e.id}>
                    <td colSpan={isCopay ? 6 : 5} className="p-2 bg-[#F7F9FC]">
                      <EntryEditor form={entryForm} setForm={setEntryForm} onSave={() => void saveEntry()} onCancel={cancelEntry} saving={savingEntry} isCopay={isCopay} lockCode />
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="hover:bg-[#F7F9FC]">
                    <td className="px-3 py-2 font-bold text-[#1E293B]">{e.procedure_code}</td>
                    <td className="px-3 py-2 text-[#64748B]">{codesReady ? codeDescription(e.procedure_code) || "—" : "…"}</td>
                    <td className="px-3 py-2 text-[#64748B]">{e.is_no_charge ? <span className="text-[#059669] font-semibold">No charge</span> : fmtFee(e.patient_fee)}</td>
                    {isCopay && <td className="px-3 py-2 text-[#64748B]">{fmtFee(e.insurance_fee)}</td>}
                    <td className="px-3 py-2 text-[#64748B]">{e.effective_date || "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(e)} disabled={editingId !== null} className="p-1.5 hover:bg-[#E8EFF7] rounded disabled:opacity-40" title="Edit">
                        <Pencil className="w-3.5 h-3.5 text-[#3A6EA5]" />
                      </button>
                      <button onClick={() => void removeEntry(e)} disabled={deletingId === e.id} className="p-1.5 hover:bg-[#FEE2E2] rounded disabled:opacity-40" title="Delete">
                        {deletingId === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DC2626]" /> : <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {bulkOpen && (
        <BulkAdjustModal
          scheduleId={schedule.id}
          count={visible.length}
          entries={visible}
          onClose={() => setBulkOpen(false)}
          onDone={async () => {
            setBulkOpen(false);
            await loadEntries();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry editor row
// ---------------------------------------------------------------------------

function EntryEditor({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isCopay,
  lockCode,
}: {
  form: EntryForm;
  setForm: (f: EntryForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  /** Copay list → the entry carries a Plan-Pays amount and the fee is the patient copay. */
  isCopay?: boolean;
  lockCode?: boolean;
}) {
  const upd = (u: Partial<EntryForm>) => setForm({ ...form, ...u });
  return (
    <div className="bg-[#F7F9FC] border-2 border-[#3A6EA5]/30 rounded-lg p-3 mb-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <div>
          <span className="text-xs font-bold text-[#1F3A5F]">Procedure Code*</span>
          {lockCode ? (
            <input value={form.procedure_code} disabled className={`${INPUT_CLS} bg-[#F1F5F9]`} />
          ) : (
            <EntityPicker
              valueId={form.procedure_code || null}
              valueLabel={form.procedure_code}
              onChange={(id) => upd({ procedure_code: id == null ? "" : String(id) })}
              search={searchProcedureCodes}
              placeholder="Search code…"
            />
          )}
        </div>
        <label className="text-xs font-bold text-[#1F3A5F]">
          {isCopay ? "Patient Copay" : "Patient Fee"}
          <input value={form.patient_fee} onChange={(e) => upd({ patient_fee: e.target.value })} className={INPUT_CLS} inputMode="decimal" placeholder="0.00" disabled={form.is_no_charge} />
        </label>
        {isCopay && (
          <label className="text-xs font-bold text-[#1F3A5F]">
            Plan Pays
            <input value={form.insurance_fee} onChange={(e) => upd({ insurance_fee: e.target.value })} className={INPUT_CLS} inputMode="decimal" placeholder="0.00" />
          </label>
        )}
        <label className="text-xs font-bold text-[#1F3A5F]">
          Effective Date
          <input type="date" value={form.effective_date} onChange={(e) => upd({ effective_date: e.target.value })} className={INPUT_CLS} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs font-bold text-[#1F3A5F] mb-2">
        <input type="checkbox" checked={form.is_no_charge} onChange={(e) => upd({ is_no_charge: e.target.checked })} className="w-4 h-4 accent-[#3A6EA5]" />
        No charge (this code is deliberately $0 — not a blank/unpriced entry)
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg font-bold text-xs disabled:opacity-50">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg font-bold text-xs disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule editor modal
// ---------------------------------------------------------------------------

function ScheduleEditorModal({
  mode,
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  form: FeeScheduleForm;
  setForm: (f: FeeScheduleForm) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const { vocab } = useFeeVocab();
  // Copay pricing is only valid on payer-bound lists (plan/carrier); on any other
  // type the model is forced to percentage (docs/pricing §3.1).
  const copayCapable = isCopayCapableFeeType(form.fee_type, vocab);
  const upd = (u: Partial<FeeScheduleForm>) => {
    const next = { ...form, ...u };
    // Keep pricing_model consistent with the type: a non-payer type can only be percentage.
    if (!isCopayCapableFeeType(next.fee_type, vocab)) next.pricing_model = "percentage";
    setForm(next);
  };
  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <h2 className="text-lg font-bold text-[#1F3A5F]">{mode === "add" ? "Add Fee Schedule" : "Edit Fee Schedule"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#E8EFF7] rounded-lg">
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
            Name*
            <input value={form.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} placeholder="e.g. CIGNA PPO HAMILTON" />
          </label>
          <label className="block text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
            Type
            <select value={form.fee_type} onChange={(e) => upd({ fee_type: e.target.value })} className={INPUT_CLS}>
              <option value="">Select a type…</option>
              {vocab.fee_types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
            Pricing Model
            <select
              value={form.pricing_model}
              onChange={(e) => upd({ pricing_model: e.target.value })}
              disabled={!copayCapable}
              className={`${INPUT_CLS} disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]`}
            >
              {vocab.pricing_models.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
            {!copayCapable && (
              <span className="block mt-1 text-[10px] font-normal normal-case text-[#94A3B8]">
                Copay pricing is only available on Assign-to-Plan / Assign-to-Carrier lists.
              </span>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F]">
            <input type="checkbox" checked={form.is_active} onChange={(e) => upd({ is_active: e.target.checked })} className="w-4 h-4 accent-[#3A6EA5]" />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg font-bold text-sm disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg font-bold text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {mode === "add" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk increase/decrease fee modal
// ---------------------------------------------------------------------------

function BulkAdjustModal({
  scheduleId,
  count,
  entries,
  onClose,
  onDone,
}: {
  scheduleId: number;
  count: number;
  entries: FeeScheduleEntryRead[];
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayIsoDate());
  const [running, setRunning] = useState(false);

  const run = async () => {
    const v = Number(value);
    if (!value.trim() || Number.isNaN(v)) {
      toast.error("Enter a numeric value");
      return;
    }
    if (!effectiveDate) {
      toast.error("Pick an effective date for the new prices");
      return;
    }
    setRunning(true);
    try {
      // Server writes a NEW dated set adjusted from each code's most recent entry
      // (docs/pricing §3.5) — history is preserved, unlike overwriting in place.
      // `value` sign carries the direction; the server floors results at 0.
      const codes = [...new Set(entries.map((e) => e.procedure_code))];
      await adjustFeeScheduleEntries(scheduleId, {
        mode,
        value: direction === "decrease" ? -Math.abs(v) : Math.abs(v),
        effective_date: effectiveDate,
        codes,
      });
      toast.success(`New prices effective ${effectiveDate} written for ${count} ${count === 1 ? "code" : "codes"}`);
      await onDone();
    } catch (e: unknown) {
      toast.error("Adjustment failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <h2 className="text-lg font-bold text-[#1F3A5F]">Increase / Decrease Fees</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#E8EFF7] rounded-lg">
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-[#64748B]">
            Writes a <strong>new dated set of prices</strong> for the <strong>{count}</strong> displayed{" "}
            {count === 1 ? "code" : "codes"}, adjusted from each code's most recent fee. The old prices are
            kept — charges before the effective date keep pricing at the old fee.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-[#1F3A5F]">
              Direction
              <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className={INPUT_CLS}>
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#1F3A5F]">
              By
              <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className={INPUT_CLS}>
                <option value="percent">Percent (%)</option>
                <option value="amount">Amount ($)</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#1F3A5F]">
              Value
              <input value={value} onChange={(e) => setValue(e.target.value)} className={INPUT_CLS} inputMode="decimal" placeholder={mode === "percent" ? "e.g. 5" : "e.g. 10.00"} />
            </label>
            <label className="text-xs font-bold text-[#1F3A5F]">
              New Effective Date
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={INPUT_CLS} />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <button onClick={onClose} disabled={running} className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg font-bold text-sm disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => void run()} disabled={running} className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg font-bold text-sm disabled:opacity-50">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <SlidersHorizontal className="w-4 h-4" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View by Codes — a procedure code's fee across all schedules
// ---------------------------------------------------------------------------

function ViewByCodes({ codesReady }: { codesReady: boolean }) {
  const [code, setCode] = useState<string>("");
  const [entries, setEntries] = useState<FeeScheduleEntryRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduleIds, setScheduleIds] = useState<number[]>([]);

  const search = useCallback(async (procedureCode: string) => {
    if (!procedureCode) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const res = await listFeeScheduleEntries({ procedure_code: procedureCode, size: PAGE_SIZE, sort: "fee_schedule_id", order: "asc" });
      const items = res.items ?? [];
      setEntries(items);
      const ids = [...new Set(items.map((e) => e.fee_schedule_id))];
      setScheduleIds(ids);
      // Resolve schedule names for display.
      await ensureFeeScheduleNames(ids);
    } catch (e: unknown) {
      toast.error("Search failed", { description: e instanceof Error ? e.message : undefined });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-5">
      <div className="max-w-md mb-4">
        <label className="block text-xs font-bold text-[#1F3A5F] uppercase tracking-wide mb-1">Procedure Code</label>
        <EntityPicker
          valueId={code || null}
          valueLabel={code}
          onChange={(id) => {
            const c = id == null ? "" : String(id);
            setCode(c);
            void search(c);
          }}
          search={searchProcedureCodes}
          placeholder="Search a procedure code…"
          allowClear
        />
        {code && codesReady && <p className="text-xs text-[#64748B] mt-1">{codeDescription(code)}</p>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching…
        </div>
      ) : !code ? (
        <p className="text-sm text-[#64748B] py-8 text-center">Pick a procedure code to see its fee across all schedules.</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[#64748B] py-8 text-center">No fee schedule has a fee for {code}.</p>
      ) : (
        <div className="overflow-auto border-2 border-[#E2E8F0] rounded-lg max-w-3xl">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Fee Schedule", "Patient Fee", "Insurance Fee", "Effective"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-[#F7F9FC]">
                  <td className="px-3 py-2 font-bold text-[#1E293B]">
                    {feeScheduleName(e.fee_schedule_id)} <span className="text-[10px] text-[#94A3B8]">(#{e.fee_schedule_id})</span>
                  </td>
                  <td className="px-3 py-2 text-[#64748B]">{fmtFee(e.patient_fee)}</td>
                  <td className="px-3 py-2 text-[#64748B]">{fmtFee(e.insurance_fee)}</td>
                  <td className="px-3 py-2 text-[#64748B]">{e.effective_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {scheduleIds.length > 0 && <p className="text-xs text-[#94A3B8] mt-2">{scheduleIds.length} schedule(s)</p>}
    </div>
  );
}

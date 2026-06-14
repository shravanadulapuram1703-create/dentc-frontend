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
  deleteFeeSchedule,
  listFeeScheduleEntries,
  createFeeScheduleEntry,
  updateFeeScheduleEntry,
  deleteFeeScheduleEntry,
} from "@/api/generated/endpoints/procedures/procedures";
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
    if (!confirm(`Delete fee schedule "${selected.name}" and its entries? This cannot be undone.`)) return;
    try {
      await deleteFeeSchedule(selected.id);
      toast.success("Fee schedule deleted");
      setSelectedId(null);
      await loadSchedules();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
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
            <div className="font-bold text-[#1E293B]">{schedule.fee_type || "—"}</div>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-[#94A3B8] uppercase">Name</span>
            <div className="font-bold text-[#1E293B]">{schedule.name}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-xs">
            <Pencil className="w-3.5 h-3.5" /> Edit Schedule
          </button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#FCA5A5] text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] font-bold text-xs">
            <Trash2 className="w-3.5 h-3.5" /> Delete
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
        <EntryEditor form={entryForm} setForm={setEntryForm} onSave={() => void saveEntry()} onCancel={cancelEntry} saving={savingEntry} />
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
                {["Code", "Description", "Patient Fee", "Insurance Fee", "Effective", ""].map((h) => (
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
                    <td colSpan={6} className="p-2 bg-[#F7F9FC]">
                      <EntryEditor form={entryForm} setForm={setEntryForm} onSave={() => void saveEntry()} onCancel={cancelEntry} saving={savingEntry} lockCode />
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="hover:bg-[#F7F9FC]">
                    <td className="px-3 py-2 font-bold text-[#1E293B]">{e.procedure_code}</td>
                    <td className="px-3 py-2 text-[#64748B]">{codesReady ? codeDescription(e.procedure_code) || "—" : "…"}</td>
                    <td className="px-3 py-2 text-[#64748B]">{fmtFee(e.patient_fee)}</td>
                    <td className="px-3 py-2 text-[#64748B]">{fmtFee(e.insurance_fee)}</td>
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
  lockCode,
}: {
  form: EntryForm;
  setForm: (f: EntryForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
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
          Patient Fee
          <input value={form.patient_fee} onChange={(e) => upd({ patient_fee: e.target.value })} className={INPUT_CLS} inputMode="decimal" placeholder="0.00" />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          Insurance Fee
          <input value={form.insurance_fee} onChange={(e) => upd({ insurance_fee: e.target.value })} className={INPUT_CLS} inputMode="decimal" placeholder="0.00" />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          Effective Date
          <input type="date" value={form.effective_date} onChange={(e) => upd({ effective_date: e.target.value })} className={INPUT_CLS} />
        </label>
      </div>
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
  const upd = (u: Partial<FeeScheduleForm>) => setForm({ ...form, ...u });
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
            <input value={form.fee_type} onChange={(e) => upd({ fee_type: e.target.value })} className={INPUT_CLS} list="fee-types" placeholder="e.g. carrier, plan, office" />
            <datalist id="fee-types">
              {["carrier", "plan", "office", "provider", "specialty"].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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
  count,
  entries,
  onClose,
  onDone,
}: {
  count: number;
  entries: FeeScheduleEntryRead[];
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [target, setTarget] = useState<"both" | "patient" | "insurance">("both");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const apply = (fee: string | null | undefined): string | null => {
    if (fee == null || fee === "") return fee ?? null;
    const n = Number(fee);
    if (Number.isNaN(n)) return fee;
    const v = Number(value);
    if (Number.isNaN(v)) return fee;
    const delta = mode === "percent" ? (n * v) / 100 : v;
    const next = direction === "increase" ? n + delta : n - delta;
    return Math.max(0, next).toFixed(2);
  };

  const run = async () => {
    if (!value.trim() || Number.isNaN(Number(value))) {
      toast.error("Enter a numeric value");
      return;
    }
    setRunning(true);
    setProgress(0);
    let ok = 0;
    let fail = 0;
    for (const e of entries) {
      const body: { patient_fee?: string | null; insurance_fee?: string | null } = {};
      if (target !== "insurance") body.patient_fee = apply(e.patient_fee);
      if (target !== "patient") body.insurance_fee = apply(e.insurance_fee);
      try {
        await updateFeeScheduleEntry(e.id, body);
        ok++;
      } catch {
        fail++;
      }
      setProgress((p) => p + 1);
    }
    setRunning(false);
    if (fail === 0) toast.success(`Adjusted ${ok} ${ok === 1 ? "entry" : "entries"}`);
    else toast.warning(`Adjusted ${ok}, ${fail} failed`);
    await onDone();
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
            Applies to <strong>{count}</strong> displayed {count === 1 ? "entry" : "entries"}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-[#1F3A5F]">
              Fees
              <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className={INPUT_CLS}>
                <option value="both">Patient + Insurance</option>
                <option value="patient">Patient only</option>
                <option value="insurance">Insurance only</option>
              </select>
            </label>
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
          </div>
          {running && (
            <div className="text-xs font-bold text-[#3A6EA5]">
              Updating… {progress}/{count}
            </div>
          )}
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

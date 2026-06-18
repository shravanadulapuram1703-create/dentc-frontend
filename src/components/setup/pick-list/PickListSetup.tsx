import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  Pencil,
  ListChecks,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import type { QuestionnaireHeaderRead, QuestionnaireOptionRead } from "@/api/generated/model";
import {
  listAllPickLists,
  listPickListItems,
  createPickList,
  updatePickList,
  deletePickListCascadeById,
  replacePickListItemsById,
} from "./pickListService";
import {
  type PickListForm,
  type PickListItemForm,
  emptyPickListForm,
  pickListToForm,
  buildHeaderCreate,
  buildHeaderUpdate,
  yesNo,
} from "./pickListData";

// ============================================================================
// Pick List Setup — master-detail screen mirroring the legacy "PickList Setup".
// Left rail: Sort By (ID#/Description) + search text + list (ADD). Right pane:
// a header summary bar (ID#, Description, Multi Select, Active) over the ITEMS
// list, with Edit/Delete footer. Edit/Add opens an inline form that also manages
// the items (add/remove/reorder/activate).
//
// Backed by the questionnaire pair (tag: metadata):
//   questionnaire-headers = the pick list, questionnaire-options = its items.
// Backend gaps are documented in docs/pick-list/pick_list_setup_backend_devreport.md.
// ============================================================================

type Mode = "view" | "add" | "edit";
type SortBy = "id" | "description";

export default function PickListSetup() {
  const [pickLists, setPickLists] = useState<QuestionnaireHeaderRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Left rail controls.
  const [sortBy, setSortBy] = useState<SortBy>("description");
  const [searchText, setSearchText] = useState("");

  // Detail state.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [items, setItems] = useState<QuestionnaireOptionRead[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<PickListForm>(() => emptyPickListForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const lists = await listAllPickLists();
      setPickLists(lists);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load pick lists");
      setPickLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Load items whenever a pick list is selected (view mode).
  const loadItems = useCallback(async (questionnaireId: number) => {
    setItemsLoading(true);
    try {
      const opts = await listPickListItems(questionnaireId);
      setItems(opts);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId != null) void loadItems(selectedId);
    else setItems([]);
  }, [selectedId, loadItems]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = pickLists.filter((p) => !q || (p.description ?? "").toLowerCase().includes(q));
    return list.sort((a, b) =>
      sortBy === "id" ? a.id - b.id : (a.description ?? "").localeCompare(b.description ?? ""),
    );
  }, [pickLists, searchText, sortBy]);

  const selected = useMemo(
    () => pickLists.find((p) => p.id === selectedId) ?? null,
    [pickLists, selectedId],
  );

  const updateForm = (updates: Partial<PickListForm>) => setForm((p) => ({ ...p, ...updates }));

  const openPickList = (p: QuestionnaireHeaderRead) => {
    setSelectedId(p.id);
    setMode("view");
  };

  const openAdd = () => {
    setForm(emptyPickListForm());
    setSelectedId(null);
    setItems([]);
    setMode("add");
  };

  const openEdit = () => {
    if (!selected) return;
    setForm(pickListToForm(selected, items));
    setMode("edit");
  };

  const handleCancel = () => {
    if (saving) return;
    setMode("view");
    setForm(emptyPickListForm());
  };

  // ----- Items editor (within the form) -----
  const updateItem = (idx: number, updates: Partial<PickListItemForm>) =>
    setForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, ...updates } : it)),
    }));

  const addItem = () =>
    setForm((p) => ({
      ...p,
      items: [...p.items, { answer_code: "", sort_order: p.items.length + 1, is_active: true }],
    }));

  const removeItem = (idx: number) =>
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const moveItem = (idx: number, dir: -1 | 1) =>
    setForm((p) => {
      const next = p.items.slice();
      const target = idx + dir;
      const a = next[idx];
      const b = next[target];
      if (a === undefined || b === undefined) return p;
      next[idx] = b;
      next[target] = a;
      return { ...p, items: next };
    });

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error("Validation Failed", { description: "Enter a description for the pick list" });
      return;
    }
    if (form.items.some((it) => !it.answer_code.trim())) {
      toast.error("Validation Failed", { description: "Every item needs a value" });
      return;
    }
    setSaving(true);
    try {
      // Items are written atomically in row order via the bulk-replace endpoint
      // (PICK-2). Existing rows keep their id so the backend can preserve them.
      const itemsBody = form.items.map((it) => ({
        ...(it.id != null ? { id: it.id } : {}),
        answer_code: it.answer_code.trim(),
        is_active: it.is_active,
      }));

      if (mode === "add") {
        const created = await createPickList(buildHeaderCreate(form));
        await replacePickListItemsById(created.id, itemsBody);
        toast.success("Pick list created");
        await loadData();
        setSelectedId(created.id);
      } else if (selectedId != null) {
        await updatePickList(selectedId, buildHeaderUpdate(form));
        await replacePickListItemsById(selectedId, itemsBody);
        toast.success("Pick list updated");
        await loadData();
        await loadItems(selectedId);
      }
      setMode("view");
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save pick list",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete pick list "${selected.description}"? This also removes its items and cannot be undone.`))
      return;
    setDeleting(true);
    try {
      // Single atomic cascade delete (PICK-1) — removes the header and its items.
      await deletePickListCascadeById(selected.id);
      toast.success("Pick list deleted");
      setSelectedId(null);
      setMode("view");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete pick list",
      });
    } finally {
      setDeleting(false);
    }
  };

  const editing = mode === "add" || mode === "edit";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Pick List Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Manage pick lists and their selectable items
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            {/* -------------------- LEFT SEARCH RAIL -------------------- */}
            <aside className="bg-[#F8FAFC] border-r-2 border-[#E2E8F0] flex flex-col min-h-[600px]">
              <div className="px-4 py-2.5 text-xs font-bold tracking-wide text-[#1F3A5F] uppercase border-b-2 border-[#E2E8F0] bg-white">
                Pick Lists
              </div>

              <div className="p-4 space-y-4 border-b border-[#E2E8F0]">
                {/* Sort By */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SORT BY</div>
                  <div className="flex items-center gap-4 text-sm">
                    {([
                      ["id", "ID#"],
                      ["description", "Description"],
                    ] as [SortBy, string][]).map(([val, lbl]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === val}
                          onChange={() => setSortBy(val)}
                          className="accent-[#3A6EA5]"
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Search text */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SEARCH TEXT</div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-[#64748B] text-sm font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" /> Loading…
                  </div>
                ) : loadError ? (
                  <div className="px-4 py-6 text-center text-sm text-[#DC2626]">
                    {loadError}
                    <button
                      onClick={() => void loadData()}
                      className="mt-2 block mx-auto px-3 py-1 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded text-xs font-bold hover:bg-[#E8EFF7]"
                    >
                      Retry
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[#64748B] font-bold">No pick lists found</div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPickList(p)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-[#E2E8F0] border-l-4 transition-colors ${
                        p.id === selectedId
                          ? "bg-[#E8EFF7] text-[#1F3A5F] font-bold border-l-[#3A6EA5]"
                          : "text-[#1E293B] hover:bg-[#F1F5F9] border-l-transparent"
                      }`}
                    >
                      {p.description}{" "}
                      <span className="text-[#94A3B8] font-normal">({p.id})</span>
                    </button>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-[#E2E8F0]">
                <button
                  onClick={openAdd}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3A6EA5] text-white hover:bg-[#1F3A5F] rounded-lg font-bold text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  ADD
                </button>
              </div>
            </aside>

            {/* -------------------- RIGHT DETAIL PANE -------------------- */}
            <section className="flex flex-col bg-white min-h-[600px]">
              <div className="flex-1 overflow-y-auto p-6">
                {!selected && !editing ? (
                  <div className="flex flex-col items-center justify-center h-full py-24 text-center text-[#64748B]">
                    <ListChecks className="w-12 h-12 text-[#CBD5E1] mb-3" />
                    <p className="text-sm font-bold">Select a pick list from the list</p>
                    <p className="text-xs">or add a new pick list</p>
                  </div>
                ) : editing ? (
                  /* ---------- EDIT / ADD FORM ---------- */
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                          Description
                        </span>
                        <input
                          type="text"
                          value={form.description}
                          onChange={(e) => updateForm({ description: e.target.value })}
                          className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={form.is_multi_select}
                          onChange={(e) => updateForm({ is_multi_select: e.target.checked })}
                          className="w-4 h-4 accent-[#3A6EA5]"
                        />
                        <span className="text-sm font-bold text-[#1F3A5F]">Multi Select</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(e) => updateForm({ is_active: e.target.checked })}
                          className="w-4 h-4 accent-[#3A6EA5]"
                        />
                        <span className="text-sm font-bold text-[#1F3A5F]">Active</span>
                      </label>
                    </div>

                    {/* Items editor */}
                    <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-[#1B7BC0] text-white px-4 py-2.5">
                        <span className="text-sm font-bold uppercase tracking-wide">Items</span>
                        <button
                          onClick={addItem}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded text-xs font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Item
                        </button>
                      </div>
                      {form.items.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                          No items yet — use “Add Item” to create the first.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E2E8F0]">
                          {form.items.map((it, idx) => (
                            <div
                              key={it.id ?? `new-${idx}`}
                              className="flex items-center gap-3 px-3 py-2 odd:bg-[#F8FAFC]"
                            >
                              <GripVertical className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                              <input
                                type="text"
                                value={it.answer_code}
                                onChange={(e) => updateItem(idx, { answer_code: e.target.value })}
                                placeholder="Item value"
                                className="flex-1 px-3 py-1.5 border-2 border-[#E2E8F0] rounded text-sm focus:outline-none focus:border-[#3A6EA5]"
                              />
                              <label className="flex items-center gap-1.5 text-xs font-bold text-[#64748B] cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={it.is_active}
                                  onChange={(e) => updateItem(idx, { is_active: e.target.checked })}
                                  className="w-3.5 h-3.5 accent-[#3A6EA5]"
                                />
                                Active
                              </label>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => moveItem(idx, -1)}
                                  disabled={idx === 0}
                                  className="p-1 text-[#64748B] hover:text-[#3A6EA5] disabled:opacity-30"
                                  title="Move up"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveItem(idx, 1)}
                                  disabled={idx === form.items.length - 1}
                                  className="p-1 text-[#64748B] hover:text-[#3A6EA5] disabled:opacity-30"
                                  title="Move down"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeItem(idx)}
                                  className="p-1 text-[#64748B] hover:text-[#DC2626]"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ---------- READ-ONLY VIEW ---------- */
                  <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <SummaryCell label="ID#" value={String(selected?.id ?? "")} strong />
                      <SummaryCell label="Description" value={selected?.description ?? ""} strong />
                      <SummaryCell label="Multi Select" value={yesNo(selected?.is_multi_select)} />
                      <SummaryCell label="Active" value={yesNo(selected?.is_active)} />
                    </div>

                    {/* Items */}
                    <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <div className="bg-[#1B7BC0] text-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide">
                        Items
                      </div>
                      {itemsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-[#64748B] text-sm font-bold">
                          <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" /> Loading items…
                        </div>
                      ) : items.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                          This pick list has no items.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E2E8F0]">
                          {items.map((it) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between px-4 py-2.5 text-sm odd:bg-[#F8FAFC]"
                            >
                              <span className={it.is_active ? "text-[#1E293B]" : "text-[#94A3B8] line-through"}>
                                {it.answer_code}
                              </span>
                              {!it.is_active ? (
                                <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Inactive</span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="border-t-2 border-[#E2E8F0] bg-white px-6 py-3 flex justify-end gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {mode === "add" ? "Create Pick List" : "Save Pick List"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={openEdit}
                      disabled={!selected}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-40"
                    >
                      <Pencil className="w-4 h-4" />
                      EDIT
                    </button>
                    <button
                      onClick={() => void handleDelete()}
                      disabled={!selected || deleting}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#FEE2E2] hover:text-[#DC2626] hover:border-[#FECACA] font-bold text-sm disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      DELETE
                    </button>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="px-4 py-3 border-r border-b lg:border-b-0 border-[#E2E8F0] last:border-r-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">{label}</div>
      <div className={`text-sm ${strong ? "font-bold text-[#1F3A5F]" : "text-[#1E293B]"}`}>
        {value || "—"}
      </div>
    </div>
  );
}

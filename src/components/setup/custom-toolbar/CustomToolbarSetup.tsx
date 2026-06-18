import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  Pencil,
  Copy,
  Wrench,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import type { DefinitionGroupRead, DefinitionRead } from "@/api/generated/model";
import {
  GROUP_TYPE,
  listGroupsByType,
  listDefinitionsByGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  createDef,
  updateDef,
  deleteDef,
  makeGroupCode,
} from "@/components/setup/medical/definitionsService";
import { TOOLBAR_FUNCTIONS, resolveFunction } from "./toolbarCatalog";

// ============================================================================
// Custom Toolbar Setup — mirrors the legacy "Toolbar Setup" screen. A toolbar is
// a definition-group (group_type = TOOLBAR); its ordered functions are definitions
// (key1 = function code, description = label, sort_order = position). The function
// catalog is frontend-defined (toolbarCatalog). Repurposes the generic definitions
// system; backend gaps in docs/pick-list/pick_list_setup_backend_devreport.md (§5).
// ============================================================================

const GTYPE = GROUP_TYPE.TOOLBAR;

type Mode = "view" | "add" | "edit";
type SortBy = "name" | "id";

interface FnItem {
  id?: number; // existing definition id (undefined = new)
  code: string;
  label: string;
}

interface ToolbarForm {
  name: string;
  items: FnItem[];
}

export default function CustomToolbarSetup() {
  const [toolbars, setToolbars] = useState<DefinitionGroupRead[]>([]);
  const [funcsByGroup, setFuncsByGroup] = useState<Record<string, DefinitionRead[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [searchText, setSearchText] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<ToolbarForm>({ name: "", items: [] });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const gs = await listGroupsByType(GTYPE);
      const entries = await Promise.all(
        gs.map(async (g) => [g.group_code, await listDefinitionsByGroup(g.group_code)] as const),
      );
      setToolbars(gs);
      setFuncsByGroup(Object.fromEntries(entries));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load toolbars");
      setToolbars([]);
      setFuncsByGroup({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return toolbars
      .filter((t) => !q || t.description.toLowerCase().includes(q) || String(t.id).includes(q))
      .sort((a, b) => (sortBy === "id" ? a.id - b.id : a.description.localeCompare(b.description)));
  }, [toolbars, searchText, sortBy]);

  const selected = useMemo(() => toolbars.find((t) => t.id === selectedId) ?? null, [toolbars, selectedId]);
  const selectedFuncs = selected ? funcsByGroup[selected.group_code] ?? [] : [];

  // Catalog functions not yet in the form.
  const availableToAdd = useMemo(() => {
    const used = new Set(form.items.map((i) => i.code));
    return TOOLBAR_FUNCTIONS.filter((f) => !used.has(f.code));
  }, [form.items]);

  const openToolbar = (t: DefinitionGroupRead) => {
    setSelectedId(t.id);
    setMode("view");
  };

  const openAdd = () => {
    setForm({ name: "", items: [] });
    setSelectedId(null);
    setMode("add");
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({
      name: selected.description,
      items: selectedFuncs.map((d) => ({ id: d.id, code: d.key1, label: d.description })),
    });
    setMode("edit");
  };

  const handleCancel = () => {
    if (saving) return;
    setMode("view");
    setForm({ name: "", items: [] });
  };

  // ----- Items editor -----
  const addFunction = (code: string) => {
    const fn = TOOLBAR_FUNCTIONS.find((f) => f.code === code);
    if (!fn) return;
    setForm((p) => ({ ...p, items: [...p.items, { code: fn.code, label: fn.label }] }));
  };
  const removeItem = (idx: number) => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
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

  /** Persist the form's items as ordered definitions under groupCode (diff vs original). */
  const syncItems = async (groupCode: string, original: DefinitionRead[]) => {
    const items = form.items;
    const keptIds = new Set(items.filter((i) => i.id != null).map((i) => i.id));
    for (const o of original) if (!keptIds.has(o.id)) await deleteDef(o.id);
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const order = i + 1;
      if (it.id != null) {
        await updateDef(it.id, { group_code: groupCode, key1: it.code, description: it.label, sort_order: order });
      } else {
        await createDef({ group_code: groupCode, key1: it.code, description: it.label, sort_order: order });
      }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Enter a toolbar name" });
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        const created = await createGroup({
          group_code: makeGroupCode(GTYPE, form.name),
          description: form.name.trim(),
          group_type: GTYPE,
          can_add: true,
        });
        await syncItems(created.group_code, []);
        toast.success("Toolbar created");
        await loadData();
        setSelectedId(created.id);
      } else if (selected) {
        await updateGroup(selected.id, {
          group_code: selected.group_code,
          description: form.name.trim(),
          group_type: GTYPE,
        });
        await syncItems(selected.group_code, selectedFuncs);
        toast.success("Toolbar updated");
        await loadData();
      }
      setMode("view");
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not save toolbar" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!selected) return;
    setCopying(true);
    try {
      const name = `Copy of ${selected.description}`;
      const created = await createGroup({
        group_code: makeGroupCode(GTYPE, name + "_" + selected.id),
        description: name,
        group_type: GTYPE,
        can_add: true,
      });
      for (let i = 0; i < selectedFuncs.length; i++) {
        const d = selectedFuncs[i]!;
        await createDef({ group_code: created.group_code, key1: d.key1, description: d.description, sort_order: i + 1 });
      }
      toast.success("Toolbar copied");
      await loadData();
      setSelectedId(created.id);
      setMode("view");
    } catch (e: unknown) {
      toast.error("Copy failed", { description: e instanceof Error ? e.message : "Could not copy toolbar" });
    } finally {
      setCopying(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete toolbar "${selected.description}" and its functions? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      for (const d of selectedFuncs) await deleteDef(d.id).catch(() => undefined);
      await deleteGroup(selected.id);
      toast.success("Toolbar deleted");
      setSelectedId(null);
      setMode("view");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Could not delete toolbar" });
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
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Toolbar Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">Manage custom toolbars and their function order</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            {/* -------------------- LEFT RAIL -------------------- */}
            <aside className="bg-[#F8FAFC] border-r-2 border-[#E2E8F0] flex flex-col min-h-[600px]">
              <div className="px-4 py-2.5 text-xs font-bold tracking-wide text-[#1F3A5F] uppercase border-b-2 border-[#E2E8F0] bg-white">
                Custom Toolbars
              </div>

              <div className="p-4 space-y-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SORT BY</div>
                  <div className="flex items-center gap-4 text-sm">
                    {([
                      ["name", "Toolbar Name"],
                      ["id", "Toolbar ID"],
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
                  <div className="px-4 py-6 text-center text-sm text-[#64748B] font-bold">No toolbars found</div>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openToolbar(t)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-[#E2E8F0] border-l-4 transition-colors ${
                        t.id === selectedId
                          ? "bg-[#E8EFF7] text-[#1F3A5F] font-bold border-l-[#3A6EA5]"
                          : "text-[#1E293B] hover:bg-[#F1F5F9] border-l-transparent"
                      }`}
                    >
                      {t.description} <span className="text-[#94A3B8] font-normal">({t.id})</span>
                    </button>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-[#E2E8F0]">
                <button
                  onClick={openAdd}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3A6EA5] text-white hover:bg-[#1F3A5F] rounded-lg font-bold text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> ADD TOOLBAR
                </button>
              </div>
            </aside>

            {/* -------------------- RIGHT DETAIL PANE -------------------- */}
            <section className="flex flex-col bg-white min-h-[600px]">
              <div className="flex items-start justify-between px-6 pt-4 pb-3 border-b border-[#E2E8F0]">
                <div className="text-sm font-bold uppercase tracking-wide text-[#3A6EA5]">
                  {editing
                    ? mode === "add"
                      ? "New Toolbar"
                      : "Edit Toolbar"
                    : selected
                      ? "This toolbar has the following functions with the same order given below"
                      : "Toolbar Functions"}
                </div>
                {!editing && selected ? (
                  <div className="text-right text-[11px] text-[#64748B] font-semibold shrink-0 pl-4">
                    <div>Created On: {new Date(selected.created_at).toLocaleDateString()}</div>
                  </div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!selected && !editing ? (
                  <div className="flex flex-col items-center justify-center h-full py-24 text-center text-[#64748B]">
                    <Wrench className="w-12 h-12 text-[#CBD5E1] mb-3" />
                    <p className="text-sm font-bold">Select a toolbar from the list</p>
                    <p className="text-xs">or add a new toolbar</p>
                  </div>
                ) : editing ? (
                  /* ---------- EDIT / ADD ---------- */
                  <div className="space-y-5 max-w-3xl">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Toolbar Name</span>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                      />
                    </label>

                    <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-[#1B7BC0] text-white px-4 py-2.5">
                        <span className="text-sm font-bold uppercase tracking-wide">Functions (in order)</span>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) addFunction(e.target.value);
                            e.target.value = "";
                          }}
                          disabled={availableToAdd.length === 0}
                          className="text-xs text-[#1E293B] bg-white rounded px-2 py-1 font-bold disabled:opacity-60"
                        >
                          <option value="">+ Add function…</option>
                          {availableToAdd.map((f) => (
                            <option key={f.code} value={f.code}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {form.items.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                          No functions yet — use “Add function…” above.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E2E8F0]">
                          {form.items.map((it, idx) => {
                            const fn = resolveFunction(it.code, it.label);
                            const Icon = fn.icon;
                            return (
                              <div key={`${it.code}-${idx}`} className="flex items-center gap-3 px-3 py-2 odd:bg-[#F8FAFC]">
                                <GripVertical className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                                <Icon className="w-4 h-4 text-[#3A6EA5] shrink-0" />
                                <span className="flex-1 text-sm text-[#1E293B]">{fn.label}</span>
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
                                    title="Remove"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ---------- READ-ONLY VIEW ---------- */
                  selectedFuncs.length === 0 ? (
                    <div className="py-16 text-center text-sm text-[#94A3B8]">This toolbar has no functions.</div>
                  ) : (
                    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                      {selectedFuncs.map((d) => {
                        const fn = resolveFunction(d.key1, d.description);
                        const Icon = fn.icon;
                        return (
                          <div
                            key={d.id}
                            className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E2E8F0] last:border-b-0 odd:bg-[#F8FAFC] text-sm"
                          >
                            <span className="w-7 h-7 rounded bg-[#3A6EA5] flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-white" />
                            </span>
                            <span className="text-[#1E293B]">{fn.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div className="border-t-2 border-[#E2E8F0] bg-white px-6 py-3 flex justify-end gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {mode === "add" ? "Create Toolbar" : "Save Toolbar"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => void handleCopy()}
                      disabled={!selected || copying}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-40"
                    >
                      {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      COPY TOOLBAR
                    </button>
                    <button
                      onClick={openEdit}
                      disabled={!selected}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-40"
                    >
                      <Pencil className="w-4 h-4" /> EDIT TOOLBAR
                    </button>
                    <button
                      onClick={() => void handleDelete()}
                      disabled={!selected || deleting}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#FEE2E2] hover:text-[#DC2626] hover:border-[#FECACA] font-bold text-sm disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      DELETE TOOLBAR
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

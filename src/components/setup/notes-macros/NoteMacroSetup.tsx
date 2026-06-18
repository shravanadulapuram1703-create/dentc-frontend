import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Save, X, Trash2, Loader2, Pencil, FileEdit } from "lucide-react";
import { toast } from "sonner";
import type { NoteMacroRead } from "@/api/generated/model";
import {
  listAllNoteMacros,
  createNoteMacroEntry,
  updateNoteMacroEntry,
  deleteNoteMacroEntry,
} from "./noteMacroService";
import {
  type NoteMacroForm,
  emptyNoteMacroForm,
  noteMacroToForm,
  buildNoteMacroCreate,
  buildNoteMacroUpdate,
} from "./noteMacroData";

// ============================================================================
// Notes Macros Setup — master-detail screen mirroring the legacy "Notes Macros".
// Left rail: Select Macro Category dropdown + search text + macro list (ADD MACRO).
// Right pane: "Macro Information" (Macro Name / Macro Category rows) over the macro
// content, with Edit/Delete footer. Edit/Add opens an inline form.
//
// Backed by /api/v1/note-macros (tag: Procedures). Category is a free-text string
// with no server-side filter — categories are derived client-side from the data.
// Backend gaps are documented in docs/pick-list/pick_list_setup_backend_devreport.md.
// ============================================================================

type Mode = "view" | "add" | "edit";
const ALL = "__all__";

export default function NoteMacroSetup() {
  const [macros, setMacros] = useState<NoteMacroRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Left rail controls.
  const [category, setCategory] = useState<string>(ALL);
  const [searchText, setSearchText] = useState("");

  // Detail state.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<NoteMacroForm>(() => emptyNoteMacroForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listAllNoteMacros();
      setMacros(list);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load note macros");
      setMacros([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Distinct categories derived from the data (legacy "Select Macro Category").
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of macros) if (m.category?.trim()) set.add(m.category.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [macros]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return macros
      .filter((m) => {
        if (category !== ALL && (m.category?.trim() ?? "") !== category) return false;
        if (!q) return true;
        return (
          (m.name ?? "").toLowerCase().includes(q) ||
          (m.content ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [macros, category, searchText]);

  const selected = useMemo(
    () => macros.find((m) => m.id === selectedId) ?? null,
    [macros, selectedId],
  );

  const updateForm = (updates: Partial<NoteMacroForm>) => setForm((p) => ({ ...p, ...updates }));

  const openMacro = (m: NoteMacroRead) => {
    setSelectedId(m.id);
    setMode("view");
  };

  const openAdd = () => {
    // Pre-fill category with the active filter when one is selected.
    setForm({ ...emptyNoteMacroForm(), category: category !== ALL ? category : "" });
    setSelectedId(null);
    setMode("add");
  };

  const openEdit = () => {
    if (!selected) return;
    setForm(noteMacroToForm(selected));
    setMode("edit");
  };

  const handleCancel = () => {
    if (saving) return;
    setMode("view");
    setForm(emptyNoteMacroForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Enter a macro name" });
      return;
    }
    if (!form.content.trim()) {
      toast.error("Validation Failed", { description: "Enter the macro text" });
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        const created = await createNoteMacroEntry(buildNoteMacroCreate(form));
        toast.success("Macro created");
        await loadData();
        setSelectedId(created.id);
      } else if (selectedId != null) {
        await updateNoteMacroEntry(selectedId, buildNoteMacroUpdate(form));
        toast.success("Macro updated");
        await loadData();
      }
      setMode("view");
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save macro",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete macro "${selected.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteNoteMacroEntry(selected.id);
      toast.success("Macro deleted");
      setSelectedId(null);
      setMode("view");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete macro",
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
                <FileEdit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Notes Macros</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Manage reusable progress-note text macros by category
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            {/* -------------------- LEFT SEARCH RAIL -------------------- */}
            <aside className="bg-[#F8FAFC] border-r-2 border-[#E2E8F0] flex flex-col min-h-[600px]">
              <div className="px-4 py-2.5 text-xs font-bold tracking-wide text-[#1F3A5F] uppercase border-b-2 border-[#E2E8F0] bg-white">
                Search
              </div>

              <div className="p-4 space-y-4 border-b border-[#E2E8F0]">
                {/* Category */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">
                    SELECT MACRO CATEGORY
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
                  >
                    <option value={ALL}>All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
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
                  <div className="px-4 py-6 text-center text-sm text-[#64748B] font-bold">No macros found</div>
                ) : (
                  filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => openMacro(m)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-[#E2E8F0] border-l-4 transition-colors ${
                        m.id === selectedId
                          ? "bg-[#E8EFF7] text-[#1F3A5F] font-bold border-l-[#3A6EA5]"
                          : "text-[#1E293B] hover:bg-[#F1F5F9] border-l-transparent"
                      }`}
                    >
                      {m.name}
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
                  ADD MACRO
                </button>
              </div>
            </aside>

            {/* -------------------- RIGHT DETAIL PANE -------------------- */}
            <section className="flex flex-col bg-white min-h-[600px]">
              <div className="px-6 pt-4 pb-2 text-sm font-bold uppercase tracking-wide text-[#3A6EA5]">
                Macro Information
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {!selected && !editing ? (
                  <div className="flex flex-col items-center justify-center h-full py-24 text-center text-[#64748B]">
                    <FileEdit className="w-12 h-12 text-[#CBD5E1] mb-3" />
                    <p className="text-sm font-bold">Select a macro from the list</p>
                    <p className="text-xs">or add a new macro</p>
                  </div>
                ) : editing ? (
                  /* ---------- EDIT / ADD FORM ---------- */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                          Macro Name
                        </span>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => updateForm({ name: e.target.value })}
                          className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                          Macro Category
                        </span>
                        <input
                          type="text"
                          list="note-macro-categories"
                          value={form.category}
                          onChange={(e) => updateForm({ category: e.target.value })}
                          placeholder="e.g. DIAGNOSTIC"
                          className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                        />
                        <datalist id="note-macro-categories">
                          {categories.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </label>
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                        Macro Text
                      </span>
                      <textarea
                        value={form.content}
                        onChange={(e) => updateForm({ content: e.target.value })}
                        rows={18}
                        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 resize-y leading-relaxed"
                      />
                    </label>
                  </div>
                ) : (
                  /* ---------- READ-ONLY VIEW ---------- */
                  <div className="space-y-4">
                    <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[200px_1fr] border-b border-[#E2E8F0]">
                        <div className="px-4 py-2.5 text-sm font-semibold text-[#1F3A5F] border-r border-[#E2E8F0] bg-[#F8FAFC]">
                          Macro Name
                        </div>
                        <div className="px-4 py-2.5 text-sm text-[#1E293B] font-bold">{selected?.name}</div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr]">
                        <div className="px-4 py-2.5 text-sm font-semibold text-[#1F3A5F] border-r border-[#E2E8F0] bg-[#F8FAFC]">
                          Macro Category
                        </div>
                        <div className="px-4 py-2.5 text-sm text-[#1E293B]">{selected?.category || "—"}</div>
                      </div>
                    </div>

                    <div className="border-2 border-[#E2E8F0] rounded-lg px-4 py-3 min-h-[300px] text-sm text-[#1E293B] whitespace-pre-wrap leading-relaxed">
                      {selected?.content || (
                        <span className="text-[#94A3B8]">This macro has no text.</span>
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
                      {mode === "add" ? "Create Macro" : "Save Macro"}
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
                      EDIT MACRO
                    </button>
                    <button
                      onClick={() => void handleDelete()}
                      disabled={!selected || deleting}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#FEE2E2] hover:text-[#DC2626] hover:border-[#FECACA] font-bold text-sm disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      DELETE MACRO
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

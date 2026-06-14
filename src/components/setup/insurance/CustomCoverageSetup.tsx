import { useCallback, useEffect, useMemo, useState } from "react";
import { Percent, Search, Plus, Save, X, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  listInsCustomCoverage,
  createInsCustomCoverage,
  updateInsCustomCoverage,
  deleteInsCustomCoverage,
} from "@/api/generated/endpoints/insurance/insurance";
import type { InsCustomCoverageRead } from "@/api/generated/model";
import {
  type CustomCoverageForm,
  emptyCustomCoverageForm,
  customCoverageToForm,
  buildCustomCoverageCreate,
  buildCustomCoverageUpdate,
} from "./planData";

// ============================================================================
// Custom Coverage Setup — tenant-wide coverage defaults over
// /api/v1/ins-custom-coverage (procedure-code range → coverage %). Flat list
// CRUD; no per-plan scoping. Mirrors the app's setup design system.
// ============================================================================

const PAGE_SIZE = 200;

const INPUT_CLS =
  "w-full px-2 py-1.5 border-2 border-[#E2E8F0] rounded text-sm focus:outline-none focus:border-[#3A6EA5]";

export default function CustomCoverageSetup() {
  const [rows, setRows] = useState<InsCustomCoverageRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<CustomCoverageForm>(() => emptyCustomCoverageForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const first = await listInsCustomCoverage({ size: PAGE_SIZE, page: 1, sort: "start_code", order: "asc" });
      const all: InsCustomCoverageRead[] = [...(first.items ?? [])];
      const pages = first.meta?.pages ?? 1;
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            listInsCustomCoverage({ size: PAGE_SIZE, page: i + 2, sort: "start_code", order: "asc" }),
          ),
        );
        for (const res of rest) all.push(...(res.items ?? []));
      }
      setRows(all);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load custom coverage");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.start_code.toLowerCase().includes(q) ||
        r.end_code.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const upd = (u: Partial<CustomCoverageForm>) => setForm((p) => ({ ...p, ...u }));
  const startAdd = () => {
    setForm(emptyCustomCoverageForm());
    setEditingId("new");
  };
  const startEdit = (r: InsCustomCoverageRead) => {
    setForm(customCoverageToForm(r));
    setEditingId(r.id);
  };
  const cancel = () => {
    setEditingId(null);
    setForm(emptyCustomCoverageForm());
  };

  const save = async () => {
    if (!form.start_code.trim()) {
      toast.error("Start code is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        await createInsCustomCoverage(buildCustomCoverageCreate(form));
        toast.success("Custom coverage added");
      } else if (typeof editingId === "number") {
        await updateInsCustomCoverage(editingId, buildCustomCoverageUpdate(form));
        toast.success("Custom coverage updated");
      }
      cancel();
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: InsCustomCoverageRead) => {
    if (!confirm(`Delete custom coverage ${r.start_code}–${r.end_code}?`)) return;
    setDeletingId(r.id);
    try {
      await deleteInsCustomCoverage(r.id);
      toast.success("Custom coverage deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Percent className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">Custom Coverage</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    Tenant-wide coverage defaults by procedure-code range
                  </p>
                </div>
              </div>
              <button
                onClick={startAdd}
                disabled={editingId !== null}
                className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add Coverage
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by code or description…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-1/2 pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {editingId === "new" && <CoverageEditor form={form} upd={upd} onSave={save} onCancel={cancel} saving={saving} />}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                <span className="text-sm font-bold">Loading custom coverage…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold text-[#DC2626]">Unable to load custom coverage</p>
                <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
                <button
                  onClick={() => void loadData()}
                  className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 && editingId !== "new" ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Percent className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">
                  {rows.length === 0 ? "No custom coverage defined yet" : "No rows match your search"}
                </p>
                {rows.length === 0 && (
                  <button
                    onClick={startAdd}
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first coverage rule
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      {["Codes", "Description", "Coverage %", "Ded Waived", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filtered.map((r) =>
                      editingId === r.id ? (
                        <tr key={r.id}>
                          <td colSpan={5} className="p-2">
                            <CoverageEditor form={form} upd={upd} onSave={save} onCancel={cancel} saving={saving} />
                          </td>
                        </tr>
                      ) : (
                        <tr key={r.id} className="hover:bg-[#F7F9FC]">
                          <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                            {r.start_code}
                            {r.end_code && r.end_code !== r.start_code ? `–${r.end_code}` : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">{r.description || "—"}</td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">{r.coverage_pct != null ? `${r.coverage_pct}%` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">{r.ded_waived ? "Yes" : "No"}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => startEdit(r)}
                              disabled={editingId !== null}
                              className="p-2 hover:bg-[#E8EFF7] rounded-lg disabled:opacity-40"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-[#3A6EA5]" />
                            </button>
                            <button
                              onClick={() => void remove(r)}
                              disabled={deletingId === r.id}
                              className="p-2 hover:bg-[#FEE2E2] rounded-lg disabled:opacity-40"
                              title="Delete"
                            >
                              {deletingId === r.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverageEditor({
  form,
  upd,
  onSave,
  onCancel,
  saving,
}: {
  form: CustomCoverageForm;
  upd: (u: Partial<CustomCoverageForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="bg-[#F7F9FC] border-2 border-[#3A6EA5]/30 rounded-lg p-3 mb-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <label className="text-xs font-bold text-[#1F3A5F]">
          Start Code*
          <input value={form.start_code} onChange={(e) => upd({ start_code: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          End Code
          <input value={form.end_code} onChange={(e) => upd({ end_code: e.target.value })} className={INPUT_CLS} placeholder="= start" />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          Coverage %
          <input value={form.coverage_pct} onChange={(e) => upd({ coverage_pct: e.target.value })} className={INPUT_CLS} inputMode="decimal" />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-[#1F3A5F] mt-5">
          <input type="checkbox" checked={form.ded_waived} onChange={(e) => upd({ ded_waived: e.target.checked })} className="w-4 h-4 accent-[#3A6EA5]" />
          Ded Waived
        </label>
      </div>
      <label className="text-xs font-bold text-[#1F3A5F] block mb-2">
        Description
        <input value={form.description} onChange={(e) => upd({ description: e.target.value })} className={INPUT_CLS} />
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

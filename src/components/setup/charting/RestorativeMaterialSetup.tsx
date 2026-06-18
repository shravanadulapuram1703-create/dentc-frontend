import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Search, Plus, Save, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listChartMaterials,
  createChartMaterial,
  updateChartMaterial,
  deleteChartMaterial,
} from "@/api/generated/endpoints/procedures/procedures";
import type { ChartMaterialRead } from "@/api/generated/model";
import { CHART_PATTERN_CATALOG, fmtDateTime } from "./chartingAssets";
import { PatternSwatch } from "./chartingSwatches";

// ============================================================================
// Restorative Charting Materials Setup — chart-materials (Orval tag Procedures).
//   Read-grid (Name | Sample | Modified By | Modified On) + an "Add New Chart
//   Material" row. Full CRUD: POST {name, pattern}; PATCH /{id}; DELETE /{id}
//   (hard delete — registered soft_field=None).
//
// The pattern catalog is FE-static (key → SVG preview; see backend dev report
// CHART-3c). "Modified On" falls back to created_at and "Modified By" shows "—"
// until the backend adds updated_at / modified_by (CHART-3a / CHART-3b).
// ============================================================================

interface MaterialForm {
  id: number | null;
  name: string;
  pattern: string;
  color: string;
}

const emptyForm = (): MaterialForm => ({ id: null, name: "", pattern: "hash", color: "" });

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function RestorativeMaterialSetup() {
  const [rows, setRows] = useState<ChartMaterialRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editing, setEditing] = useState<MaterialForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listChartMaterials({ size: 200, sort: "name", order: "asc" });
      setRows(res.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load chart materials");
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
    return rows
      .filter((r) => {
        if (!q) return true;
        return r.name.toLowerCase().includes(q) || (r.pattern ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, searchQuery]);

  const updateEdit = (u: Partial<MaterialForm>) => setEditing((p) => (p ? { ...p, ...u } : p));

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Validation Failed", { description: "Name is required" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: editing.name.trim(),
        pattern: editing.pattern || null,
        color: editing.color.trim() || null,
      };
      if (editing.id == null) {
        await createChartMaterial(body);
        toast.success("Chart material added");
      } else {
        await updateChartMaterial(editing.id, body);
        toast.success("Chart material updated");
      }
      setEditing(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save chart material",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: ChartMaterialRead) => {
    if (!confirm(`Delete chart material "${r.name}"? This cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await deleteChartMaterial(r.id);
      toast.success("Chart material deleted");
      if (editing?.id === r.id) setEditing(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete chart material",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1500px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">Restorative Charting Materials Setup</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    Restorative materials and the fill pattern used to render each on the chart
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditing(emptyForm())}
                className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by material name or pattern…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              />
            </div>
          </div>

          {/* Editor */}
          {editing && (
            <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#1F3A5F]">
                  {editing.id == null ? "Add New Chart Material" : "Edit Chart Material"}
                </h4>
                <button onClick={() => setEditing(null)} className="p-1 hover:bg-[#E8EFF7] rounded" title="Cancel">
                  <X className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className={labelCls}>
                    Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => updateEdit({ name: e.target.value })}
                    placeholder="Enter Material Name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sample (Pattern)</label>
                  <select
                    value={editing.pattern}
                    onChange={(e) => updateEdit({ pattern: e.target.value })}
                    className={inputCls}
                  >
                    {CHART_PATTERN_CATALOG.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Preview</label>
                  <div className="h-[42px] flex items-center px-3 border-2 border-[#E2E8F0] rounded-lg bg-white">
                    <PatternSwatch pattern={editing.pattern} color={editing.color} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setEditing(null)}
                  disabled={saving}
                  className="px-3 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
              <span className="text-sm font-bold">Loading chart materials…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load chart materials</p>
              <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
              <button
                onClick={() => void loadData()}
                className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
              <Layers className="w-12 h-12 text-[#CBD5E1]" />
              <p className="text-[#64748B] font-bold text-sm">
                {rows.length === 0 ? "No chart materials yet" : "No materials match your search"}
              </p>
              {rows.length === 0 && (
                <p className="text-xs text-[#94A3B8] max-w-md">
                  New tenants start empty until the default material set is seeded (see backend dev report CHART-3d).
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    {["Name", "Sample", "Modified By", "Modified On", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() =>
                        setEditing({ id: r.id, name: r.name, pattern: r.pattern ?? "hash", color: r.color ?? "" })
                      }
                      className={`hover:bg-[#F7F9FC] cursor-pointer transition-colors ${editing?.id === r.id ? "bg-[#E8EFF7]" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">{r.name}</td>
                      <td className="px-4 py-3">
                        <PatternSwatch pattern={r.pattern} color={r.color} />
                      </td>
                      {/* CHART-3b: no created_by/modified_by on chart_materials yet */}
                      <td className="px-4 py-3 text-sm text-[#64748B]">—</td>
                      {/* CHART-3a: no updated_at yet; falls back to created_at */}
                      <td className="px-4 py-3 text-sm text-[#64748B] tabular-nums">{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => void handleDelete(r)}
                          disabled={deletingId === r.id}
                          className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

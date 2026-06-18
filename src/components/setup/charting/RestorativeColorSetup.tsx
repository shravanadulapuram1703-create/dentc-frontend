import { useCallback, useEffect, useMemo, useState } from "react";
import { Palette, Search, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listChartColors,
  updateChartColor,
} from "@/api/generated/endpoints/metadata/metadata";
import type { ChartColorRead } from "@/api/generated/model";
import { CHART_COLOR_PALETTE, fmtDateTime } from "./chartingAssets";
import { ColorSwatch } from "./chartingSwatches";

// ============================================================================
// Restorative Charting Color Setup — chart-colors (Orval tag Metadata).
//   Read-grid (Condition | Stroke | Fill | Sample | Modified By | Modified On)
//   + an inline "Edit Chart Colors" panel. EDIT-ONLY: the legacy condition set
//   is fixed (no add / delete). PATCH {stroke_color, fill_color}.
//
// The stroke/fill options are an FE-static palette (presentation, not business
// data — see backend dev report CHART-2b). "Modified By" binds created_by until
// the backend adds modified_by (CHART-2a).
// ============================================================================

interface ColorForm {
  id: number;
  name: string;
  stroke_color: string;
  fill_color: string;
}

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function RestorativeColorSetup() {
  const [rows, setRows] = useState<ChartColorRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editing, setEditing] = useState<ColorForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listChartColors({ size: 200, sort: "name", order: "asc" });
      setRows(res.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load chart colors");
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
        return (
          r.name.toLowerCase().includes(q) ||
          (r.stroke_color ?? "").toLowerCase().includes(q) ||
          (r.fill_color ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, searchQuery]);

  const updateEdit = (u: Partial<ColorForm>) => setEditing((p) => (p ? { ...p, ...u } : p));

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateChartColor(editing.id, {
        stroke_color: editing.stroke_color || null,
        fill_color: editing.fill_color || null,
      });
      toast.success("Chart color updated");
      setEditing(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save chart color",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1500px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Restorative Charting Color Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Stroke and fill colors used to render each charting condition
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by condition or color…"
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
                <h4 className="text-sm font-bold text-[#1F3A5F]">Edit Chart Colors</h4>
                <button onClick={() => setEditing(null)} className="p-1 hover:bg-[#E8EFF7] rounded" title="Cancel">
                  <X className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className={labelCls}>Condition</label>
                  <input type="text" value={editing.name} readOnly className={`${inputCls} bg-[#EEF2F7] text-[#64748B]`} />
                </div>
                <div>
                  <label className={labelCls}>Stroke Color</label>
                  <select
                    value={editing.stroke_color}
                    onChange={(e) => updateEdit({ stroke_color: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {CHART_COLOR_PALETTE.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fill Color</label>
                  <select
                    value={editing.fill_color}
                    onChange={(e) => updateEdit({ fill_color: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {CHART_COLOR_PALETTE.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sample</label>
                  <div className="h-[42px] flex items-center px-3 border-2 border-[#E2E8F0] rounded-lg bg-white">
                    <ColorSwatch stroke={editing.stroke_color} fill={editing.fill_color} />
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
              <span className="text-sm font-bold">Loading chart colors…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load chart colors</p>
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
              <Palette className="w-12 h-12 text-[#CBD5E1]" />
              <p className="text-[#64748B] font-bold text-sm">
                {rows.length === 0 ? "No chart colors configured yet" : "No conditions match your search"}
              </p>
              {rows.length === 0 && (
                <p className="text-xs text-[#94A3B8] max-w-md">
                  New tenants start empty until the default condition set is seeded (see backend dev report CHART-2c).
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    {["Condition", "Stroke Color", "Fill Color", "Sample", "Modified By", "Modified On"].map((h) => (
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
                        setEditing({
                          id: r.id,
                          name: r.name,
                          stroke_color: r.stroke_color ?? "",
                          fill_color: r.fill_color ?? "",
                        })
                      }
                      className={`hover:bg-[#F7F9FC] cursor-pointer transition-colors ${editing?.id === r.id ? "bg-[#E8EFF7]" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-[#1E293B]">{r.stroke_color || "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#1E293B]">{r.fill_color || "—"}</td>
                      <td className="px-4 py-3">
                        <ColorSwatch stroke={r.stroke_color} fill={r.fill_color} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{r.created_by || "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B] tabular-nums">{fmtDateTime(r.updated_at)}</td>
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

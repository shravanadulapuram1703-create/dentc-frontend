import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Search, Plus, Save, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listDefinitions,
  createDefinition,
  updateDefinition,
  deleteDefinition,
} from "@/api/generated/endpoints/metadata/metadata";
import type { DefinitionRead } from "@/api/generated/model";

// ============================================================================
// Reusable single-table setup screen for a `definitions` lookup group
// (Modifier Codes → group MODIFIER, Type of Service → group TYPEOFSERVICE).
//   key1 = code, description = label, is_active, sort_order.
// Small editable reference sets — loaded in full (size 200) and filtered client-side.
// ============================================================================

interface DefinitionCodeSetupProps {
  groupCode: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  /** Column header for the code (default "Code"). */
  codeLabel?: string;
  /** Placeholder shown in the code input. */
  codePlaceholder?: string;
  /** Display transform for the stored code (e.g. modifier "50" → "-50"). */
  formatCode?: (raw: string) => string;
  /** Persist transform for the typed code (e.g. "-50" → "50"). */
  normalizeCode?: (input: string) => string;
  /** Optional hint under the code field in the editor. */
  codeHint?: string;
}

interface DefForm {
  id: number | null;
  key1: string;
  description: string;
  is_active: boolean;
}

const emptyForm = (): DefForm => ({ id: null, key1: "", description: "", is_active: true });

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function DefinitionCodeSetup({
  groupCode,
  title,
  subtitle,
  icon,
  codeLabel = "Code",
  codePlaceholder,
  formatCode = (c) => c,
  normalizeCode = (c) => c.trim(),
  codeHint,
}: DefinitionCodeSetupProps) {
  const [rows, setRows] = useState<DefinitionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "description">("code");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  const [editing, setEditing] = useState<DefForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listDefinitions({ group_code: groupCode, size: 200, sort: "sort_order", order: "asc" });
      setRows(res.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load codes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [groupCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (activeFilter === "active" && !r.is_active) return false;
      if (activeFilter === "inactive" && r.is_active) return false;
      if (!q) return true;
      return r.key1.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    });
    return list.sort((a, b) =>
      sortBy === "description"
        ? a.description.localeCompare(b.description)
        : a.key1.localeCompare(b.key1, undefined, { numeric: true }),
    );
  }, [rows, searchQuery, sortBy, activeFilter]);

  const handleSave = async () => {
    if (!editing) return;
    const code = normalizeCode(editing.key1);
    if (!code) {
      toast.error("Validation Failed", { description: `${codeLabel} is required` });
      return;
    }
    if (!editing.description.trim()) {
      toast.error("Validation Failed", { description: "Description is required" });
      return;
    }
    setSaving(true);
    try {
      if (editing.id == null) {
        await createDefinition({
          group_code: groupCode,
          key1: code,
          description: editing.description.trim(),
          is_active: editing.is_active,
        });
        toast.success("Code added");
      } else {
        await updateDefinition(editing.id, {
          key1: code,
          description: editing.description.trim(),
          is_active: editing.is_active,
        });
        toast.success("Code updated");
      }
      setEditing(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save code",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: DefinitionRead) => {
    if (!confirm(`Delete "${formatCode(r.key1)} — ${r.description}"? This cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await deleteDefinition(r.id);
      toast.success("Code deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete code",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const updateEdit = (u: Partial<DefForm>) => setEditing((p) => (p ? { ...p, ...u } : p));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">{title}</h1>
                  <p className="text-xs text-[#64748B] font-bold">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setEditing(emptyForm())}
                className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Code
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search by code or description…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
                className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
              >
                <option value="code">Sort: {codeLabel}</option>
                <option value="description">Sort: Description</option>
              </select>
            </div>
          </div>

          {/* Editor */}
          {editing && (
            <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#1F3A5F]">
                  {editing.id == null ? `New ${codeLabel}` : `Edit ${codeLabel}`}
                </h4>
                <button onClick={() => setEditing(null)} className="p-1 hover:bg-[#E8EFF7] rounded" title="Cancel">
                  <X className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start">
                <div>
                  <label className={labelCls}>
                    {codeLabel} <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editing.key1}
                    onChange={(e) => updateEdit({ key1: e.target.value })}
                    placeholder={codePlaceholder}
                    className={inputCls}
                  />
                  {codeHint && <p className="mt-1 text-[11px] text-[#94A3B8]">{codeHint}</p>}
                </div>
                <div>
                  <label className={labelCls}>
                    Description <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editing.description}
                    onChange={(e) => updateEdit({ description: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={editing.is_active ? "active" : "inactive"}
                    onChange={(e) => updateEdit({ is_active: e.target.value === "active" })}
                    className={inputCls}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
              <span className="text-sm font-bold">Loading codes…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load codes</p>
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
              <p className="text-[#64748B] font-bold text-sm">
                {rows.length === 0 ? "No codes yet" : "No codes match your filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    {[codeLabel, "Description", "Active", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide"
                      >
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
                          key1: r.key1,
                          description: r.description,
                          is_active: r.is_active,
                        })
                      }
                      className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-bold text-[#1E293B] tabular-nums">
                        {formatCode(r.key1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1E293B]">{r.description}</td>
                      <td className="px-4 py-3">
                        {r.is_active ? (
                          <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">
                            Inactive
                          </span>
                        )}
                      </td>
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

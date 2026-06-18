import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  listIcdCodes,
  createIcdCode,
  updateIcdCode,
  deleteIcdCode,
  bulkSetIcdCodeStatus,
} from "@/api/generated/endpoints/procedures/procedures";
import type { IcdCodeRead } from "@/api/generated/model";

// ============================================================================
// ICD Codes — dedicated global catalog `icd-codes`. The set is large, so the list
// stays SERVER-paginated + search-driven (never fetch-all). Supports add/edit,
// soft per-row delete, and bulk activate/deactivate (legacy "Edit ICD Codes").
// ============================================================================

const PAGE_SIZE = 50;

interface IcdForm {
  id: number | null;
  code: string;
  description: string;
  icd9: string;
  icd10: string;
  snomed: string;
  is_active: boolean;
}

const emptyForm = (): IcdForm => ({
  id: null,
  code: "",
  description: "",
  icd9: "",
  icd10: "",
  snomed: "",
  is_active: true,
});

const orNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function IcdCodeSetup() {
  const [rows, setRows] = useState<IcdCodeRead[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<IcdForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const isActiveParam = activeFilter === "all" ? undefined : activeFilter === "active";

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listIcdCodes({
        page,
        size: PAGE_SIZE,
        sort: "code",
        order: "asc",
        search: search.trim() || undefined,
        is_active: isActiveParam,
      });
      setRows(res.items ?? []);
      setTotal(res.meta?.total ?? 0);
      setPages(res.meta?.pages ?? 1);
      setSelected(new Set());
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load ICD codes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, isActiveParam]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Debounce the search box → reset to page 1.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [searchInput]);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };
  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const updateEdit = (u: Partial<IcdForm>) => setEditing((p) => (p ? { ...p, ...u } : p));

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.code.trim()) {
      toast.error("Validation Failed", { description: "Code is required" });
      return;
    }
    if (!editing.description.trim()) {
      toast.error("Validation Failed", { description: "Description is required" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        code: editing.code.trim(),
        description: editing.description.trim(),
        icd9: orNull(editing.icd9),
        icd10: orNull(editing.icd10),
        snomed: orNull(editing.snomed),
        is_active: editing.is_active,
      };
      if (editing.id == null) {
        await createIcdCode(body);
        toast.success("ICD code added");
      } else {
        await updateIcdCode(editing.id, body);
        toast.success("ICD code updated");
      }
      setEditing(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save ICD code",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: IcdCodeRead) => {
    if (!confirm(`Delete ICD code "${r.code} — ${r.description}"? This cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await deleteIcdCode(r.id);
      toast.success("ICD code deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete ICD code",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const bulkSetStatus = async (is_active: boolean) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await bulkSetIcdCodeStatus({ ids, is_active });
      toast.success(`${res.updated ?? ids.length} code(s) ${is_active ? "activated" : "deactivated"}`);
      await loadData();
    } catch (e: unknown) {
      toast.error("Bulk update failed", {
        description: e instanceof Error ? e.message : "Could not update statuses",
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">ICD Codes Setup</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    Diagnosis codes with ICD-9 / ICD-10 / SNOMED crosswalk
                  </p>
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

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search by code, description, ICD-10, or SNOMED…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setPage(1);
                  setActiveFilter(e.target.value as typeof activeFilter);
                }}
                className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 bg-[#EFF6FF] border-b-2 border-[#BFDBFE] px-4 py-2.5">
              <span className="text-sm font-bold text-[#1F3A5F]">{selected.size} selected</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void bulkSetStatus(true)}
                  disabled={bulkBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] text-white rounded-lg hover:bg-[#047857] font-bold text-xs disabled:opacity-50"
                >
                  {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Activate
                </button>
                <button
                  onClick={() => void bulkSetStatus(false)}
                  disabled={bulkBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] font-bold text-xs disabled:opacity-50"
                >
                  {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Deactivate
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-2 py-1.5 text-xs font-bold text-[#64748B] hover:text-[#1F3A5F]"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Editor */}
          {editing && (
            <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#1F3A5F]">
                  {editing.id == null ? "New ICD Code" : "Edit ICD Code"}
                </h4>
                <button onClick={() => setEditing(null)} className="p-1 hover:bg-[#E8EFF7] rounded" title="Cancel">
                  <X className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>
                    Code <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editing.code}
                    onChange={(e) => updateEdit({ code: e.target.value })}
                    placeholder="e.g., 327.2"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2">
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
                  <label className={labelCls}>ICD-9</label>
                  <input
                    type="text"
                    value={editing.icd9}
                    onChange={(e) => updateEdit({ icd9: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>ICD-10</label>
                  <input
                    type="text"
                    value={editing.icd10}
                    onChange={(e) => updateEdit({ icd10: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>SNOMED</label>
                  <input
                    type="text"
                    value={editing.snomed}
                    onChange={(e) => updateEdit({ snomed: e.target.value })}
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
              <span className="text-sm font-bold">Loading ICD codes…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load ICD codes</p>
              <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
              <button
                onClick={() => void loadData()}
                className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
              >
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
              <Activity className="w-12 h-12 text-[#CBD5E1]" />
              <p className="text-[#64748B] font-bold text-sm">
                {search ? "No ICD codes match your search" : "No ICD codes loaded yet"}
              </p>
              {!search && (
                <p className="text-xs text-[#94A3B8] max-w-md">
                  ICD codes are imported from the practice's diagnosis file. Add one, or import the set.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleAll}
                          className="w-4 h-4"
                          aria-label="Select all on page"
                        />
                      </th>
                      {["Code", "Description", "ICD-9", "ICD-10", "SNOMED", "Active", ""].map((h) => (
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
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() =>
                          setEditing({
                            id: r.id,
                            code: r.code,
                            description: r.description,
                            icd9: r.icd9 ?? "",
                            icd10: r.icd10 ?? "",
                            snomed: r.snomed ?? "",
                            is_active: r.is_active,
                          })
                        }
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggleOne(r.id)}
                            className="w-4 h-4"
                            aria-label={`Select ${r.code}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B] tabular-nums">{r.code}</td>
                        <td className="px-4 py-3 text-sm text-[#1E293B]">{r.description}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{r.icd9 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{r.icd10 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{r.snomed || "—"}</td>
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

              {/* Pagination */}
              <div className="flex items-center justify-between gap-3 border-t-2 border-[#E2E8F0] px-4 py-3">
                <span className="text-xs text-[#64748B] font-bold">{rangeLabel}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  <span className="text-xs text-[#64748B] font-bold tabular-nums">
                    Page {page} / {pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page >= pages}
                    className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

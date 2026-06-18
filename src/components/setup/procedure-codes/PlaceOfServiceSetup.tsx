import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Search, Plus, Save, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listPlaceOfServiceCodes,
  createPlaceOfServiceCode,
  updatePlaceOfServiceCode,
  deletePlaceOfServiceCode,
} from "@/api/generated/endpoints/procedures/procedures";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import type { PlaceOfServiceCodeRead, OfficeRead } from "@/api/generated/model";

// ============================================================================
// Place of Service Codes — dedicated tenant-scoped resource place-of-service-codes.
//   code, type, name, tax_id, office_id, is_active. Soft-delete (is_active→false).
// Small set (~19 seeded); loaded in full and filtered client-side.
// ============================================================================

interface PosForm {
  id: number | null;
  code: string;
  type: string;
  name: string;
  tax_id: string;
  office_id: number | null;
  is_active: boolean;
}

const emptyForm = (): PosForm => ({
  id: null,
  code: "",
  type: "",
  name: "",
  tax_id: "",
  office_id: null,
  is_active: true,
});

const orNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function PlaceOfServiceSetup() {
  const [rows, setRows] = useState<PlaceOfServiceCodeRead[]>([]);
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  const [editing, setEditing] = useState<PosForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const officeName = useCallback(
    (id: number | null | undefined) => {
      if (id == null) return "—";
      return offices.find((o) => o.id === id)?.name ?? String(id);
    },
    [offices],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [posRes, offRes] = await Promise.all([
        listPlaceOfServiceCodes({ size: 200, sort: "code", order: "asc" }),
        listOffices({ size: 200 }).catch(() => null),
      ]);
      setRows(posRes.items ?? []);
      setOffices(offRes?.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load place-of-service codes");
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
        if (activeFilter === "active" && !r.is_active) return false;
        if (activeFilter === "inactive" && r.is_active) return false;
        if (!q) return true;
        return (
          r.code.toLowerCase().includes(q) ||
          (r.type ?? "").toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.tax_id ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [rows, searchQuery, activeFilter]);

  const updateEdit = (u: Partial<PosForm>) => setEditing((p) => (p ? { ...p, ...u } : p));

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.code.trim()) {
      toast.error("Validation Failed", { description: "Code is required" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        code: editing.code.trim(),
        type: orNull(editing.type),
        name: orNull(editing.name),
        tax_id: orNull(editing.tax_id),
        office_id: editing.office_id,
        is_active: editing.is_active,
      };
      if (editing.id == null) {
        await createPlaceOfServiceCode(body);
        toast.success("Place of service added");
      } else {
        await updatePlaceOfServiceCode(editing.id, body);
        toast.success("Place of service updated");
      }
      setEditing(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save place of service",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: PlaceOfServiceCodeRead) => {
    if (!confirm(`Deactivate place of service "${r.code} — ${r.name ?? r.type ?? ""}"?`)) return;
    setDeletingId(r.id);
    try {
      await deletePlaceOfServiceCode(r.id);
      toast.success("Place of service deactivated");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not deactivate place of service",
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
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">Place of Service Codes Setup</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    CMS place-of-service codes and the practice Tax IDs billed under them
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
                  placeholder="Search by code, type, name, or Tax ID…"
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
            </div>
          </div>

          {/* Editor */}
          {editing && (
            <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#1F3A5F]">
                  {editing.id == null ? "New Place of Service" : "Edit Place of Service"}
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
                    placeholder="e.g., 11"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <input
                    type="text"
                    value={editing.type}
                    onChange={(e) => updateEdit({ type: e.target.value })}
                    placeholder="e.g., Office"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Name of Place</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => updateEdit({ name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tax ID</label>
                  <input
                    type="text"
                    value={editing.tax_id}
                    onChange={(e) => updateEdit({ tax_id: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Office</label>
                  <select
                    value={editing.office_id ?? ""}
                    onChange={(e) =>
                      updateEdit({ office_id: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
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
              <span className="text-sm font-bold">Loading place-of-service codes…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load place-of-service codes</p>
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
              <MapPin className="w-12 h-12 text-[#CBD5E1]" />
              <p className="text-[#64748B] font-bold text-sm">
                {rows.length === 0 ? "No place-of-service codes yet" : "No codes match your filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    {["Code", "Type", "Name of Place", "Tax ID", "Office", "Active", ""].map((h) => (
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
                          code: r.code,
                          type: r.type ?? "",
                          name: r.name ?? "",
                          tax_id: r.tax_id ?? "",
                          office_id: r.office_id ?? null,
                          is_active: r.is_active,
                        })
                      }
                      className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-bold text-[#1E293B] tabular-nums">{r.code}</td>
                      <td className="px-4 py-3 text-sm text-[#1E293B]">{r.type || "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{r.name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B] tabular-nums">{r.tax_id || "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{officeName(r.office_id)}</td>
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
                          title="Deactivate"
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

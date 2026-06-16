import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Search, Plus, Save, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listCodeBundles,
  getCodeBundle,
  createCodeBundle,
  updateCodeBundle,
  deleteCodeBundle,
} from "@/api/generated/endpoints/procedures/procedures";
import type { CodeBundleRead } from "@/api/generated/model";
import IncludedCodes from "./IncludedCodes";

// ============================================================================
// Explosion Codes Setup — master-detail on /api/v1/code-bundles (tag: Procedures).
// A "code bundle" IS a legacy explosion code: a named group that posts several
// procedure codes at once. Mirrors the ProcedureCodeSetup pattern. Field mapping
// (confirmed against live data):
//   legacy_id   → "ID#" (read-only; migration-assigned, not in the create body)
//   name        → "Description"
//   display_code→ "Short Description"
//   same_tooth  → "Default Same Tooth No."
//   code-bundle-items → the "Included Codes" grid (see IncludedCodes).
// ============================================================================

interface BundleForm {
  name: string; // "Description"
  display_code: string; // "Short Description"
  same_tooth: boolean;
}

const emptyForm = (): BundleForm => ({
  name: "",
  display_code: "",
  same_tooth: false,
});

function bundleToForm(b: CodeBundleRead): BundleForm {
  return {
    name: b.name,
    display_code: b.display_code ?? "",
    same_tooth: Boolean(b.same_tooth),
  };
}

/** Legacy "ID#" — the migration id when present, else the numeric pk. */
function bundleDisplayId(b: CodeBundleRead): string {
  return b.legacy_id ?? String(b.id);
}

const orNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function ExplosionCodeSetup() {
  const [bundles, setBundles] = useState<CodeBundleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // List controls.
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"id" | "description">("id");

  // Detail state.
  const [showList, setShowList] = useState(true);
  const [mode, setMode] = useState<"add" | "edit">("edit");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [displayId, setDisplayId] = useState<string>(""); // legacy "ID#" (read-only)
  const [form, setForm] = useState<BundleForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const first = await listCodeBundles({ size: 200, page: 1, sort: "display_code", order: "asc" });
      const all = [...(first.items ?? [])];
      const pages = first.meta?.pages ?? 1;
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            listCodeBundles({ size: 200, page: i + 2, sort: "display_code", order: "asc" }),
          ),
        );
        for (const res of rest) all.push(...(res.items ?? []));
      }
      setBundles(all);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load explosion codes");
      setBundles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = bundles.filter((b) => {
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.legacy_id ?? "").toLowerCase().includes(q) ||
        (b.display_code ?? "").toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) =>
      sortBy === "description"
        ? a.name.localeCompare(b.name)
        : bundleDisplayId(a).localeCompare(bundleDisplayId(b), undefined, { numeric: true }),
    );
  }, [bundles, searchQuery, sortBy]);

  const updateForm = (updates: Partial<BundleForm>) => setForm((p) => ({ ...p, ...updates }));

  const openAdd = () => {
    setForm(emptyForm());
    setSelectedId(null);
    setDisplayId("");
    setMode("add");
    setShowList(false);
  };

  const openBundle = async (b: CodeBundleRead) => {
    try {
      const full = await getCodeBundle(b.id);
      setForm(bundleToForm(full));
      setSelectedId(full.id);
      setDisplayId(bundleDisplayId(full));
      setMode("edit");
      setShowList(false);
    } catch (e: unknown) {
      toast.error("Failed to open explosion code", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setShowList(true);
    setSelectedId(null);
    setDisplayId("");
    setForm(emptyForm());
    setMode("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Description is required" });
      return;
    }
    setSaving(true);
    try {
      // `description` mirrors `name` — the legacy UI exposes only Description +
      // Short Description (display_code); migrated rows keep description == name.
      const body = {
        name: form.name.trim(),
        display_code: orNull(form.display_code),
        description: form.name.trim(),
        same_tooth: form.same_tooth,
      };
      if (selectedId == null) {
        const created = await createCodeBundle(body);
        toast.success("Explosion code created");
        setSelectedId(created.id);
        setDisplayId(bundleDisplayId(created));
        setMode("edit");
      } else {
        await updateCodeBundle(selectedId, body);
        toast.success("Explosion code updated");
      }
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save explosion code",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: CodeBundleRead) => {
    if (!confirm(`Delete explosion code "${bundleDisplayId(b)} - ${b.name}"? This cannot be undone.`))
      return;
    setDeletingId(b.id);
    try {
      await deleteCodeBundle(b.id);
      toast.success("Explosion code deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete explosion code",
      });
    } finally {
      setDeletingId(null);
    }
  };

  /* -------------------- LIST VIEW -------------------- */
  if (showList) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1600px] mx-auto p-6">
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            {/* Header */}
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                    <Boxes className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">Explosion Codes Setup</h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      Group multiple procedure codes that post together as one explosion
                    </p>
                  </div>
                </div>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              </div>

              {/* Search + sort */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search by ID# or description…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                >
                  <option value="id">Sort: ID#</option>
                  <option value="description">Sort: Description</option>
                </select>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                <span className="text-sm font-bold">Loading explosion codes…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold text-[#DC2626]">Unable to load explosion codes</p>
                <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
                <button
                  onClick={() => void loadData()}
                  className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Boxes className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">
                  {bundles.length === 0
                    ? "No explosion codes yet"
                    : "No explosion codes match your search"}
                </p>
                {bundles.length === 0 && (
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first explosion code
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      {["ID#", "Description", "Short Description", "Same Tooth", "Created", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filtered.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => void openBundle(b)}
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {bundleDisplayId(b)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1E293B]">{b.name}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{b.display_code || "—"}</td>
                        <td className="px-4 py-3">
                          {b.same_tooth ? (
                            <span className="px-2 py-1 bg-[#DBEAFE] text-[#2563EB] text-xs font-bold rounded">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-[#F1F5F9] text-[#64748B] text-xs font-bold rounded">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">{fmtDateTime(b.created_at)}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => void handleDelete(b)}
                            disabled={deletingId === b.id}
                            className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === b.id ? (
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

  /* -------------------- DETAIL VIEW -------------------- */
  const isNew = selectedId == null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors"
                  title="Back to list"
                >
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">
                    {mode === "add"
                      ? "Add New Explosion Code"
                      : `${displayId ? `${displayId} — ` : ""}${form.name || "Explosion Code"}`}
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    {selectedId ? `Bundle ID: ${selectedId}` : "Bundle ID: (assigned on save)"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold transition-all text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {mode === "add" ? "Create Explosion Code" : "Save Explosion Code"}
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto space-y-8">
            {/* Explosion code info */}
            <section>
              <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
                Explosion Code Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>ID#</label>
                  <input
                    type="text"
                    value={displayId || "(assigned on save)"}
                    disabled
                    className={`${inputCls} disabled:bg-[#F1F5F9] disabled:text-[#64748B]`}
                  />
                  <p className="mt-1 text-[11px] text-[#94A3B8]">System-assigned identifier.</p>
                </div>
                <div>
                  <label className={labelCls}>
                    Description <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    placeholder="e.g., New Pt Exam"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Short Description</label>
                  <input
                    type="text"
                    value={form.display_code}
                    onChange={(e) => updateForm({ display_code: e.target.value })}
                    placeholder="e.g., Newptadult4"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Default Same Tooth No.</label>
                  <select
                    value={form.same_tooth ? "yes" : "no"}
                    onChange={(e) => updateForm({ same_tooth: e.target.value === "yes" })}
                    className={inputCls}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  <p className="mt-1 text-[11px] text-[#94A3B8]">
                    When Yes, all included codes default to the same tooth number when posted.
                  </p>
                </div>
              </div>
            </section>

            {/* Included codes (gated until the bundle exists) */}
            {isNew ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-t-2 border-[#F1F5F9]">
                <div className="w-14 h-14 rounded-full bg-[#E8EFF7] flex items-center justify-center mb-4">
                  <Save className="w-7 h-7 text-[#3A6EA5]" />
                </div>
                <h3 className="text-lg font-bold text-[#1F3A5F] mb-2">Create the explosion code first</h3>
                <p className="text-sm text-[#64748B] max-w-md">
                  Save the info above, then add the procedure codes this explosion should post.
                </p>
              </div>
            ) : (
              <div className="border-t-2 border-[#F1F5F9] pt-6">
                <IncludedCodes bundleId={selectedId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

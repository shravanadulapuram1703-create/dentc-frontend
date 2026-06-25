import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  listProcedureCodes,
  createProcedureCode,
  updateProcedureCode,
  deleteProcedureCode,
  getProcedureCodeStats,
  listChartMaterials,
  listNoteMacros,
} from "@/api/generated/endpoints/procedures/procedures";
import { listProviders } from "@/api/generated/endpoints/organization/organization";
import type {
  ProcedureCodeRead,
  ProcedureCodeStats,
  ProviderRead,
  NoteMacroRead,
  ChartMaterialRead,
} from "@/api/generated/model";
import KpiStat from "@/components/dashboard/components/KpiStat";
import {
  type ProcedureCodeForm,
  emptyProcedureCodeForm,
  procedureCodeToForm,
  buildProcedureCodeCreate,
  buildProcedureCodeUpdate,
  formatFee,
} from "./procedureCodeData";
import MainTab from "./tabs/MainTab";
import ChartingTab from "./tabs/ChartingTab";
import InsuranceTab from "./tabs/InsuranceTab";
import FeeSchedulesTab from "./tabs/FeeSchedulesTab";

// ============================================================================
// Procedure Code Setup — master-detail screen on /api/v1/procedure-codes
// (tag: Procedures). Mirrors the ProviderSetup pattern: a KPI dashboard strip +
// filterable list ⇄ a tabbed detail (Main / Charting / Fee Schedules), all
// backend-driven and snake_case. The resource is keyed by `code` (no numeric id).
// Backend gaps documented in docs/procedure-codes/procedure_codes_backend_devreport.md.
// ============================================================================

type TabName = "main" | "charting" | "insurance" | "fee_schedules";

const TAB_LABELS: Record<TabName, string> = {
  main: "Main",
  charting: "Charting",
  insurance: "Insurance",
  fee_schedules: "Fee Schedules",
};

const PAGE_SIZE = 200;

function SaveCodeFirst({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[#E8EFF7] flex items-center justify-center mb-4">
        <Save className="w-7 h-7 text-[#3A6EA5]" />
      </div>
      <h3 className="text-lg font-bold text-[#1F3A5F] mb-2">Create the code first</h3>
      <p className="text-sm text-[#64748B] max-w-md">
        Save the procedure on the <strong>Main</strong> tab before managing {what}.
      </p>
    </div>
  );
}

function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Pull a human-friendly description out of an axios/HTTP error.
 *
 * Backend wraps errors as { error: { code, message, details } } and FastAPI
 * 422 returns `detail` as an array of {loc, msg, type}. The previous handler
 * just rendered `e.message`, which was always axios's generic "Request failed
 * with status code 4xx" — masking real causes like a duplicate code (KAN-16).
 */
function describeSaveError(e: unknown, fallback: string): string {
  const err = e as { response?: { status?: number; data?: unknown }; message?: string };
  const status = err?.response?.status;
  const data = err?.response?.data as
    | { error?: { message?: string; details?: string }; detail?: unknown }
    | undefined;
  // FastAPI validation array → "field: message" lines.
  if (Array.isArray(data?.detail)) {
    const lines = (data.detail as Array<{ loc?: unknown; msg?: string }>)
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? (d.loc as unknown[])[d.loc.length - 1] : d?.loc;
        return loc ? `${loc}: ${d?.msg ?? "invalid value"}` : d?.msg;
      })
      .filter(Boolean)
      .join("\n");
    return lines || fallback;
  }
  if (status === 409) {
    return "A procedure code with that value already exists — please choose another.";
  }
  return (
    data?.error?.message ||
    (typeof data?.detail === "string" ? data.detail : undefined) ||
    err?.message ||
    fallback
  );
}

export default function ProcedureCodeSetup() {
  const [codes, setCodes] = useState<ProcedureCodeRead[]>([]);
  const [stats, setStats] = useState<ProcedureCodeStats | null>(null);
  const [providers, setProviders] = useState<ProviderRead[]>([]);
  const [noteMacros, setNoteMacros] = useState<NoteMacroRead[]>([]);
  const [materials, setMaterials] = useState<ChartMaterialRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // List controls (mirror the legacy left rail).
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "description">("code");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  // Detail state.
  const [showList, setShowList] = useState(true);
  const [mode, setMode] = useState<"add" | "edit">("edit");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [form, setForm] = useState<ProcedureCodeForm>(() => emptyProcedureCodeForm());
  const [activeTab, setActiveTab] = useState<TabName>("main");
  const [saving, setSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  // Load the catalog + the backend stats aggregation (PROC-5) + the lookup sets
  // used by the detail tabs (default provider / notes macro / chart material).
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [first, statsRes, provRes, macroRes, matRes] = await Promise.all([
        listProcedureCodes({ size: PAGE_SIZE, page: 1, sort: "code", order: "asc" }),
        getProcedureCodeStats().catch(() => null),
        listProviders({ size: 200, sort: "name", order: "asc" }).catch(() => null),
        listNoteMacros({ size: 200 }).catch(() => null),
        listChartMaterials({ size: 200 }).catch(() => null),
      ]);
      const all = [...(first.items ?? [])];
      const pages = first.meta?.pages ?? 1;
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            listProcedureCodes({ size: PAGE_SIZE, page: i + 2, sort: "code", order: "asc" }),
          ),
        );
        for (const res of rest) all.push(...(res.items ?? []));
      }
      setCodes(all);
      setStats(statsRes);
      setProviders(provRes?.items ?? []);
      setNoteMacros(macroRes?.items ?? []);
      setMaterials(matRes?.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load procedure codes");
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Category options — prefer the backend stats aggregation (by_category), fall
  // back to distinct values derived from the loaded codes. Never hardcoded.
  const categories = useMemo(() => {
    const set = new Set<string>();
    if (stats?.by_category) for (const k of Object.keys(stats.by_category)) set.add(k);
    for (const c of codes) if (c.category) set.add(c.category);
    return Array.from(set).sort();
  }, [codes, stats]);

  // KPI metrics — backend-driven via /procedure-codes/stats (PROC-5), with a
  // client-side fallback if the stats endpoint is unavailable.
  const kpis = useMemo(() => {
    if (stats) {
      return {
        total: stats.total ?? 0,
        active: stats.active ?? 0,
        inactive: stats.inactive ?? 0,
        ortho: stats.ortho ?? 0,
        categories: stats.by_category ? Object.keys(stats.by_category).length : categories.length,
      };
    }
    let active = 0;
    let ortho = 0;
    for (const c of codes) {
      if (c.is_active) active += 1;
      if (c.is_ortho) ortho += 1;
    }
    return {
      total: codes.length,
      active,
      inactive: codes.length - active,
      ortho,
      categories: categories.length,
    };
  }, [stats, codes, categories.length]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = codes.filter((c) => {
      if (activeFilter === "active" && !c.is_active) return false;
      if (activeFilter === "inactive" && c.is_active) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q) ||
        (c.legacy_code ?? "").toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) =>
      sortBy === "description"
        ? a.description.localeCompare(b.description)
        : a.code.localeCompare(b.code),
    );
  }, [codes, searchQuery, activeFilter, categoryFilter, sortBy]);

  const updateForm = (updates: Partial<ProcedureCodeForm>) => setForm((p) => ({ ...p, ...updates }));

  const openAdd = () => {
    setForm(emptyProcedureCodeForm());
    setSelectedCode(null);
    setMode("add");
    setActiveTab("main");
    setShowList(false);
  };

  const openCode = (c: ProcedureCodeRead) => {
    setForm(procedureCodeToForm(c));
    setSelectedCode(c.code);
    setMode("edit");
    setActiveTab("main");
    setShowList(false);
  };

  const handleCancel = () => {
    if (saving) return;
    setShowList(true);
    setSelectedCode(null);
    setForm(emptyProcedureCodeForm());
    setMode("edit");
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error("Validation Failed", { description: "Code is required" });
      setActiveTab("main");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Validation Failed", { description: "Description is required" });
      setActiveTab("main");
      return;
    }
    if (!form.category.trim()) {
      toast.error("Validation Failed", { description: "Category is required" });
      setActiveTab("main");
      return;
    }

    setSaving(true);
    try {
      if (selectedCode == null) {
        const created = await createProcedureCode(buildProcedureCodeCreate(form));
        toast.success("Procedure code created");
        setSelectedCode(created.code);
        setMode("edit");
      } else {
        await updateProcedureCode(selectedCode, buildProcedureCodeUpdate(form));
        toast.success("Procedure code updated");
      }
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: describeSaveError(e, "Could not save procedure code"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: ProcedureCodeRead) => {
    if (!confirm(`Delete procedure code "${c.code} — ${c.description}"? This cannot be undone.`)) return;
    setDeletingCode(c.code);
    try {
      await deleteProcedureCode(c.code);
      toast.success("Procedure code deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: describeSaveError(e, "Could not delete procedure code"),
      });
    } finally {
      setDeletingCode(null);
    }
  };

  const orderedTabs: TabName[] = ["main", "charting", "insurance", "fee_schedules"];

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
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">Procedure Code Setup</h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      Manage CDT/procedure codes, fees, clinical rules and fee-schedule pricing
                    </p>
                  </div>
                </div>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Code
                </button>
              </div>

              {/* KPI dashboard strip */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <KpiStat
                  label="Total Codes"
                  value={loading ? "—" : kpis.total}
                  icon={<FileText className="w-4 h-4" />}
                  tone="blue"
                  loading={loading}
                />
                <KpiStat
                  label="Active"
                  value={loading ? "—" : kpis.active}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  tone="teal"
                  loading={loading}
                />
                <KpiStat
                  label="Inactive"
                  value={loading ? "—" : kpis.inactive}
                  icon={<XCircle className="w-4 h-4" />}
                  tone="red"
                  loading={loading}
                />
                <KpiStat
                  label="Categories"
                  value={loading ? "—" : kpis.categories}
                  icon={<Layers className="w-4 h-4" />}
                  tone="slate"
                  loading={loading}
                />
                <KpiStat
                  label="Ortho"
                  value={loading ? "—" : kpis.ortho}
                  icon={<Sparkles className="w-4 h-4" />}
                  tone="amber"
                  loading={loading}
                />
              </div>

              {/* Search + filters */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search by code, description, or category…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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
                  <option value="code">Sort: Code</option>
                  <option value="description">Sort: Description</option>
                </select>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                <span className="text-sm font-bold">Loading procedure codes…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold text-[#DC2626]">Unable to load procedure codes</p>
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
                <FileText className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">
                  {codes.length === 0 ? "No procedure codes yet" : "No codes match your filters"}
                </p>
                {codes.length === 0 && (
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first code
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      {["Code", "Description", "Category", "Fee", "Status", "Updated", ""].map((h) => (
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
                    {filtered.map((c) => (
                      <tr
                        key={c.code}
                        onClick={() => openCode(c)}
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {c.code}
                          {c.is_ortho ? (
                            <span className="ml-2 px-1.5 py-0.5 bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold rounded">
                              ORTHO
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1E293B]">{c.description}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{c.category || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B] tabular-nums">
                          {formatFee(c.default_fee)}
                        </td>
                        <td className="px-4 py-3">
                          {c.is_active ? (
                            <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">{fmtDateTime(c.created_at)}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => void handleDelete(c)}
                            disabled={deletingCode === c.code}
                            className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingCode === c.code ? (
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
  const isNew = selectedCode == null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
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
                      ? "Add New Procedure Code"
                      : `${form.code} — ${form.description || "Procedure"}`}
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    {selectedCode ? `Code: ${selectedCode}` : "Code: (set on the Main tab)"}
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
                  {mode === "add" ? "Create Code" : "Save Code"}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-1">
              {orderedTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-semibold text-sm whitespace-nowrap rounded-t-lg transition-all ${
                    activeTab === tab
                      ? "bg-white text-[#3A6EA5] border-t-4 border-[#3A6EA5]"
                      : "text-[#64748B] hover:text-[#1F3A5F] hover:bg-[#E8EFF7]"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="p-6 max-h-[calc(100vh-240px)] overflow-y-auto">
            {activeTab === "main" && (
              <MainTab
                formData={form}
                updateFormData={updateForm}
                categories={categories}
                providers={providers}
                noteMacros={noteMacros}
                codeLocked={!isNew}
              />
            )}

            {activeTab === "charting" && (
              <ChartingTab formData={form} updateFormData={updateForm} materials={materials} />
            )}

            {activeTab === "insurance" &&
              (isNew ? (
                <SaveCodeFirst what="insurance rules" />
              ) : (
                <InsuranceTab code={selectedCode} />
              ))}

            {activeTab === "fee_schedules" &&
              (isNew ? (
                <SaveCodeFirst what="fee-schedule pricing" />
              ) : (
                <FeeSchedulesTab code={selectedCode} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

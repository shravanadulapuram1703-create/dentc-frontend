import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Building2, Search, Plus, Save, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listEmployers,
  getEmployer,
  createEmployer,
  updateEmployer,
  deleteEmployer,
} from "@/api/generated/endpoints/insurance/insurance";
import type { EmployerRead } from "@/api/generated/model";
import { US_STATES } from "@/components/modals/patient/constants";
import {
  type EmployerForm,
  emptyEmployerForm,
  employerToForm,
  buildEmployerCreate,
  buildEmployerUpdate,
} from "./insuranceData";

// ============================================================================
// Employer Setup — master-detail over /api/v1/employers (tag: Insurance).
// Employers are a standalone table (linked to insurance plans via
// InsurancePlan.employer_id). Mirrors the ProviderSetup pattern.
// Backend gaps (e.g. salesrep / contact-person fields) documented in
// docs/insurance/insurance_backend_devreport.md.
// ============================================================================

const PAGE_SIZE = 200;

export default function EmployerSetup() {
  const [employers, setEmployers] = useState<EmployerRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "id">("name");

  const [showList, setShowList] = useState(true);
  const [mode, setMode] = useState<"add" | "edit">("edit");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployerForm>(() => emptyEmployerForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Page through the full set so search/sort are reliable client-side.
      // Dedupe by id — the list sorts by `name` with no stable tiebreaker, so
      // rows can repeat across page boundaries (devreport INS-8).
      const first = await listEmployers({ size: PAGE_SIZE, page: 1, sort: "name", order: "asc" });
      const pages = first.meta?.pages ?? 1;
      const byId = new Map<number, EmployerRead>();
      for (const e of first.items ?? []) byId.set(e.id, e);
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            listEmployers({ size: PAGE_SIZE, page: i + 2, sort: "name", order: "asc" }),
          ),
        );
        for (const res of rest) for (const e of res.items ?? []) byId.set(e.id, e);
      }
      setEmployers(Array.from(byId.values()));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load employers");
      setEmployers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = employers.filter((e) => {
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.city ?? "").toLowerCase().includes(q) ||
        (e.state ?? "").toLowerCase().includes(q) ||
        String(e.id).includes(q)
      );
    });
    return list.sort((a, b) =>
      sortBy === "id" ? a.id - b.id : a.name.localeCompare(b.name),
    );
  }, [employers, searchQuery, sortBy]);

  const updateForm = (updates: Partial<EmployerForm>) => setForm((p) => ({ ...p, ...updates }));

  const openAdd = () => {
    setForm(emptyEmployerForm());
    setSelectedId(null);
    setMode("add");
    setShowList(false);
  };

  const openEmployer = async (e: EmployerRead) => {
    try {
      const full = await getEmployer(e.id);
      setForm(employerToForm(full));
      setSelectedId(full.id);
      setMode("edit");
      setShowList(false);
    } catch (err: unknown) {
      toast.error("Failed to open employer", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setShowList(true);
    setSelectedId(null);
    setForm(emptyEmployerForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Employer Name is required" });
      return;
    }
    setSaving(true);
    try {
      if (selectedId == null) {
        await createEmployer(buildEmployerCreate(form));
        toast.success("Employer created");
      } else {
        await updateEmployer(selectedId, buildEmployerUpdate(form));
        toast.success("Employer updated");
      }
      await loadData();
      setShowList(true);
      setSelectedId(null);
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save employer",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: EmployerRead) => {
    if (!confirm(`Delete employer "${e.name}"? This cannot be undone.`)) return;
    setDeletingId(e.id);
    try {
      await deleteEmployer(e.id);
      toast.success("Employer deleted");
      await loadData();
    } catch (err: unknown) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Could not delete employer",
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
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">Employers</h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      Manage employers linked to insurance plans
                    </p>
                  </div>
                </div>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Employer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search by name, city, state, or ID…"
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
                  <option value="name">Sort: Name</option>
                  <option value="id">Sort: ID</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                <span className="text-sm font-bold">Loading employers…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold text-[#DC2626]">Unable to load employers</p>
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
                <Building2 className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">
                  {employers.length === 0 ? "No employers yet" : "No employers match your search"}
                </p>
                {employers.length === 0 && (
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first employer
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      {["Name", "City, State", "Zip", "Phone", ""].map((h) => (
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
                    {filtered.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => void openEmployer(e)}
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {e.name}
                          <span className="ml-2 text-[10px] text-[#94A3B8]">({e.id})</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {[e.city, e.state].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{e.zip || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{e.phone || "—"}</td>
                        <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                          <button
                            onClick={() => void handleDelete(e)}
                            disabled={deletingId === e.id}
                            className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === e.id ? (
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
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[900px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
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
                    {mode === "add" ? "Add Employer" : `Employer: ${form.name || "Loading…"}`}
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    {selectedId ? `Employer ID: ${selectedId}` : "Employer ID: (assigned on save)"}
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
                  {mode === "add" ? "Create Employer" : "Save Employer"}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <EmpField label="Employer Name" required>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    className={INPUT_CLS}
                    placeholder="e.g. ANSYS, Inc."
                  />
                </EmpField>
              </div>
              <div className="md:col-span-2">
                <EmpField label="Address">
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => updateForm({ address: e.target.value })}
                    className={INPUT_CLS}
                  />
                </EmpField>
              </div>
              <EmpField label="City">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateForm({ city: e.target.value })}
                  className={INPUT_CLS}
                />
              </EmpField>
              <div className="grid grid-cols-2 gap-3">
                <EmpField label="State">
                  <select
                    value={form.state}
                    onChange={(e) => updateForm({ state: e.target.value })}
                    className={INPUT_CLS}
                  >
                    <option value="">—</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </EmpField>
                <EmpField label="Zip">
                  <input
                    type="text"
                    value={form.zip}
                    onChange={(e) => updateForm({ zip: e.target.value })}
                    className={INPUT_CLS}
                  />
                </EmpField>
              </div>
              <EmpField label="Phone">
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => updateForm({ phone: e.target.value })}
                  className={INPUT_CLS}
                />
              </EmpField>
              <EmpField label="Sales Rep">
                <input
                  type="text"
                  value={form.salesrep}
                  onChange={(e) => updateForm({ salesrep: e.target.value })}
                  className={INPUT_CLS}
                />
              </EmpField>
              <EmpField label="Contact Person">
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => updateForm({ contact_person: e.target.value })}
                  className={INPUT_CLS}
                />
              </EmpField>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

function EmpField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#1F3A5F] mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

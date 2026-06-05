import { useCallback, useEffect, useMemo, useState } from "react";
import { Stethoscope, Search, Plus, Save, X, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../styles/theme";
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  listOffices,
} from "@/api/generated/endpoints/organization/organization";
import type { ProviderRead, OfficeRead } from "@/api/generated/model";

// ========================================
// Provider Setup — CRUD on /api/v1/providers (tag: Organization).
// ProviderRead: id(string), office_id, name, title, short_id, role, npi,
// license, tax_id, dea_id, specialty, is_active. Provider id is a
// client-supplied string (ProviderCreate.id is required).
// See docs/setup/providers/PROVIDERS_INTEGRATION.md.
// ========================================

interface ProviderForm {
  name: string;
  officeId: string; // kept as string for the select; sent as number
  role: string;
  title: string;
  shortId: string;
  npi: string;
  license: string;
  taxId: string;
  deaId: string;
  specialty: string;
  isActive: boolean;
}

function emptyForm(): ProviderForm {
  return {
    name: "",
    officeId: "",
    role: "",
    title: "",
    shortId: "",
    npi: "",
    license: "",
    taxId: "",
    deaId: "",
    specialty: "",
    isActive: true,
  };
}

function providerToForm(p: ProviderRead): ProviderForm {
  return {
    name: p.name ?? "",
    officeId: p.office_id != null ? String(p.office_id) : "",
    role: p.role ?? "",
    title: p.title ?? "",
    shortId: p.short_id ?? "",
    npi: p.npi ?? "",
    license: p.license ?? "",
    taxId: p.tax_id ?? "",
    deaId: p.dea_id ?? "",
    specialty: p.specialty ?? "",
    isActive: p.is_active ?? true,
  };
}

const labelCls = "block text-xs font-bold text-[#1E293B] mb-2";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function ProviderSetup() {
  const [providers, setProviders] = useState<ProviderRead[]>([]);
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // null = closed; { id: null } = add; { id } = edit (provider id is a string)
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState<ProviderForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const officeName = useCallback(
    (id: number | null | undefined) => {
      if (id == null) return "—";
      const o = offices.find((x) => x.id === id);
      return o ? o.name : String(id);
    },
    [offices]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [provRes, offRes] = await Promise.all([
        listProviders({ size: 200, sort: "name", order: "asc" }),
        listOffices({ size: 200 }).catch(() => null),
      ]);
      setProviders(provRes.items ?? []);
      setOffices(offRes?.items ?? []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Failed to load providers";
      setLoadError(msg);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.role ?? "").toLowerCase().includes(q) ||
        (p.npi ?? "").toLowerCase().includes(q) ||
        officeName(p.office_id).toLowerCase().includes(q)
    );
  }, [providers, searchQuery, officeName]);

  const openAdd = () => {
    setForm(emptyForm());
    setEditing({ id: null });
  };

  const openEdit = (p: ProviderRead) => {
    setForm(providerToForm(p));
    setEditing({ id: p.id });
  };

  const closeModal = () => {
    if (saving) return;
    setEditing(null);
  };

  const updateForm = (updates: Partial<ProviderForm>) => setForm((p) => ({ ...p, ...updates }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Provider Name is required" });
      return;
    }
    if (!form.officeId) {
      toast.error("Validation Failed", { description: "Office is required" });
      return;
    }

    const common = {
      office_id: Number(form.officeId),
      name: form.name.trim(),
      title: form.title.trim() || null,
      short_id: form.shortId.trim() || null,
      role: form.role.trim() || null,
      npi: form.npi.trim() || null,
      license: form.license.trim() || null,
      tax_id: form.taxId.trim() || null,
      dea_id: form.deaId.trim() || null,
      specialty: form.specialty.trim() || null,
      is_active: form.isActive,
    };

    setSaving(true);
    try {
      if (editing?.id == null) {
        // Provider id is a client-supplied string per ProviderCreate.
        const id = `prov-${form.shortId.trim() || form.name.trim().replace(/\s+/g, "-").toLowerCase()}-${form.officeId}`;
        await createProvider({ id, ...common });
        toast.success("Provider created");
      } else {
        await updateProvider(editing.id, common);
        toast.success("Provider updated");
      }
      setEditing(null);
      await loadData();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Save failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: ProviderRead) => {
    if (!confirm(`Delete provider "${p.name}"? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await deleteProvider(p.id);
      toast.success("Provider deleted");
      await loadData();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Delete failed";
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">Provider Setup</h1>
                  <p className="text-xs text-[#64748B] font-bold">Manage providers and their credentials</p>
                </div>
              </div>
              <button onClick={openAdd} className={components.buttonPrimary + " inline-flex items-center gap-2"}>
                <Plus className="w-4 h-4" />
                Add Provider
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by name, role, NPI, or office..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              />
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
              <span className="text-sm font-bold">Loading providers…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load providers</p>
              <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
              <button onClick={() => void loadData()} className={components.buttonOutline + " mt-2"}>
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Stethoscope className="w-12 h-12 text-[#CBD5E1]" />
              <p className="text-[#64748B] font-bold text-sm">
                {providers.length === 0 ? "No providers yet" : "No providers match your search"}
              </p>
              {providers.length === 0 && (
                <button onClick={openAdd} className={components.buttonPrimary + " inline-flex items-center gap-2 mt-1"}>
                  <Plus className="w-4 h-4" />
                  Add your first provider
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Office</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">NPI</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F7F9FC] transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                        {p.name}
                        {p.title ? <span className="text-[#64748B] font-normal">, {p.title}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{p.role || "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{officeName(p.office_id)}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{p.npi || "—"}</td>
                      <td className="px-4 py-3">
                        {p.is_active ? (
                          <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">Active</span>
                        ) : (
                          <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4 text-[#3A6EA5]" />
                          </button>
                          <button
                            onClick={() => void handleDelete(p)}
                            disabled={deletingId === p.id}
                            className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-[#DC2626]" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#E2E8F0] p-4 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-[#1F3A5F]">
                {editing.id == null ? "Add Provider" : "Edit Provider"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>
                  Provider Name <span className="text-[#DC2626]">*</span>
                </label>
                <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="e.g., Dr. Jane Smith" className={inputCls} autoFocus />
              </div>

              <div>
                <label className={labelCls}>
                  Office <span className="text-[#DC2626]">*</span>
                </label>
                <select value={form.officeId} onChange={(e) => updateForm({ officeId: e.target.value })} className={inputCls}>
                  <option value="">Select Office</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <input type="text" value={form.role} onChange={(e) => updateForm({ role: e.target.value })} placeholder="e.g., Dentist, Hygienist" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Title</label>
                <input type="text" value={form.title} onChange={(e) => updateForm({ title: e.target.value })} placeholder="DDS, DMD…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Short ID</label>
                <input type="text" value={form.shortId} onChange={(e) => updateForm({ shortId: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>NPI</label>
                <input type="text" value={form.npi} onChange={(e) => updateForm({ npi: e.target.value })} placeholder="10-digit NPI" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>License #</label>
                <input type="text" value={form.license} onChange={(e) => updateForm({ license: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Tax ID</label>
                <input type="text" value={form.taxId} onChange={(e) => updateForm({ taxId: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>DEA ID</label>
                <input type="text" value={form.deaId} onChange={(e) => updateForm({ deaId: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Specialty</label>
                <input type="text" value={form.specialty} onChange={(e) => updateForm({ specialty: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(e) => updateForm({ isActive: e.target.value === "active" })}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t-2 border-[#E2E8F0] p-4 bg-[#F7F9FC] sticky bottom-0">
              <button onClick={closeModal} disabled={saving} className={components.buttonOutline + " inline-flex items-center gap-2 disabled:opacity-50"}>
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className={components.buttonPrimary + " inline-flex items-center gap-2 disabled:opacity-50"}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id == null ? "Create Provider" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

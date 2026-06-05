import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Search, Plus, Save, X, Edit, Trash2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../styles/theme";
import {
  listOfficeGroups,
  createOfficeGroup,
  updateOfficeGroup,
  deleteOfficeGroup,
} from "@/api/generated/endpoints/organization/organization";
import type { OfficeGroupRead } from "@/api/generated/model";

// ========================================
// Manage Office Groups
// Backed entirely by /api/v1/office-groups (tag: Organization).
// OfficeGroupRead: id, name, address, address2, city, state, zip, phone (+ tenant_id, created_at).
// See docs/setup/office-groups/OFFICE_GROUPS_INTEGRATION.md.
// ========================================

interface GroupForm {
  name: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

function emptyForm(): GroupForm {
  return { name: "", address: "", address2: "", city: "", state: "", zip: "", phone: "" };
}

function groupToForm(g: OfficeGroupRead): GroupForm {
  return {
    name: g.name ?? "",
    address: g.address ?? "",
    address2: g.address2 ?? "",
    city: g.city ?? "",
    state: g.state ?? "",
    zip: g.zip ?? "",
    phone: g.phone ?? "",
  };
}

const labelCls = "block text-xs font-bold text-[#1E293B] mb-2";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function OfficeGroupsSetup() {
  const [groups, setGroups] = useState<OfficeGroupRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // null = closed; { id: null } = add; { id: number } = edit
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);
  const [form, setForm] = useState<GroupForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listOfficeGroups({ size: 200, sort: "name", order: "asc" });
      setGroups(res.items ?? []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Failed to load office groups";
      setLoadError(msg);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.city ?? "").toLowerCase().includes(q) ||
        (g.state ?? "").toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const openAdd = () => {
    setForm(emptyForm());
    setEditing({ id: null });
  };

  const openEdit = (g: OfficeGroupRead) => {
    setForm(groupToForm(g));
    setEditing({ id: g.id });
  };

  const closeModal = () => {
    if (saving) return;
    setEditing(null);
    setForm(emptyForm());
  };

  const updateForm = (updates: Partial<GroupForm>) => setForm((p) => ({ ...p, ...updates }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Group Name is required" });
      return;
    }

    const body = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      address2: form.address2.trim() || null,
      city: form.city.trim() || null,
      state: form.state || null,
      zip: form.zip.trim() || null,
      phone: form.phone.trim() || null,
    };

    setSaving(true);
    try {
      if (editing?.id == null) {
        await createOfficeGroup(body);
        toast.success("Office group created");
      } else {
        await updateOfficeGroup(editing.id, body);
        toast.success("Office group updated");
      }
      setEditing(null);
      setForm(emptyForm());
      await loadGroups();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Save failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: OfficeGroupRead) => {
    if (!confirm(`Delete office group "${g.name}"? This cannot be undone.`)) return;
    setDeletingId(g.id);
    try {
      await deleteOfficeGroup(g.id);
      toast.success("Office group deleted");
      await loadGroups();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Delete failed";
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
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">Office Groups</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    Group offices for enterprise reporting and configuration
                  </p>
                </div>
              </div>
              <button onClick={openAdd} className={components.buttonPrimary + " inline-flex items-center gap-2"}>
                <Plus className="w-4 h-4" />
                Add Office Group
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by name, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                <span className="text-sm font-bold">Loading office groups…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold text-[#DC2626]">Unable to load office groups</p>
                <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
                <button onClick={() => void loadGroups()} className={components.buttonOutline + " mt-2"}>
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Layers className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">
                  {groups.length === 0 ? "No office groups yet" : "No groups match your search"}
                </p>
                {groups.length === 0 && (
                  <button onClick={openAdd} className={components.buttonPrimary + " inline-flex items-center gap-2 mt-1"}>
                    <Plus className="w-4 h-4" />
                    Create your first group
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">City, State</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Phone</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filtered.map((g) => (
                      <tr key={g.id} className="hover:bg-[#F7F9FC] transition-colors">
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">{g.name}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {[g.city, g.state].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{g.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(g)}
                              className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors"
                              title="Edit group"
                            >
                              <Edit className="w-4 h-4 text-[#3A6EA5]" />
                            </button>
                            <button
                              onClick={() => void handleDelete(g)}
                              disabled={deletingId === g.id}
                              className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                              title="Delete group"
                            >
                              {deletingId === g.id ? (
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
      </div>

      {/* Add/Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between border-b-2 border-[#E2E8F0] p-4">
              <h2 className="text-lg font-bold text-[#1F3A5F]">
                {editing.id == null ? "Add Office Group" : "Edit Office Group"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>
                  Group Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="e.g., Bay Area Group"
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
                  <MapPin className="w-4 h-4 text-[#3A6EA5]" />
                  Address
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Address Line 1</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => updateForm({ address: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Address Line 2</label>
                    <input
                      type="text"
                      value={form.address2}
                      onChange={(e) => updateForm({ address2: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className={labelCls}>City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => updateForm({ city: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>State</label>
                      <select
                        value={form.state}
                        onChange={(e) => updateForm({ state: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">—</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>ZIP</label>
                      <input
                        type="text"
                        value={form.zip}
                        onChange={(e) => updateForm({ zip: e.target.value })}
                        maxLength={10}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm({ phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t-2 border-[#E2E8F0] p-4 bg-[#F7F9FC]">
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
                {editing.id == null ? "Create Group" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

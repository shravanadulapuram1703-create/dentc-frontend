import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import type { LabCreate, LabRead, LabUpdate, OfficeRead } from "@/api/generated/model";
import {
  createLabVendor,
  deactivateLabVendor,
  isDuplicateLabName,
  labErrorMessage,
  listAllLabs,
  updateLabVendor,
} from "./labService";

// ============================================================================
// Lab Setup — master-detail screen on /api/v1/labs (the lab-vendor catalog
// behind the appointment's `lab_vendor_id`, LAB-1). Left rail: search +
// active filter + list. Right: detail (view) or form (add/edit). Delete is a
// soft delete (is_active=false); a retired lab stays on its existing cases.
// snake_case form keys bind directly to LabCreate / LabUpdate.
// ============================================================================

type Mode = "view" | "add" | "edit";

interface LabForm {
  name: string;
  code: string;
  office_id: string; // '' = every office
  contact_name: string;
  phone: string;
  fax: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  default_turnaround_days: string;
  notes: string;
  is_active: boolean;
}

const emptyForm = (): LabForm => ({
  name: "",
  code: "",
  office_id: "",
  contact_name: "",
  phone: "",
  fax: "",
  email: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip: "",
  default_turnaround_days: "",
  notes: "",
  is_active: true,
});

const labToForm = (l: LabRead): LabForm => ({
  name: l.name ?? "",
  code: l.code ?? "",
  office_id: l.office_id != null ? String(l.office_id) : "",
  contact_name: l.contact_name ?? "",
  phone: l.phone ?? "",
  fax: l.fax ?? "",
  email: l.email ?? "",
  address_line1: l.address_line1 ?? "",
  address_line2: l.address_line2 ?? "",
  city: l.city ?? "",
  state: l.state ?? "",
  zip: l.zip ?? "",
  default_turnaround_days: l.default_turnaround_days != null ? String(l.default_turnaround_days) : "",
  notes: l.notes ?? "",
  is_active: l.is_active,
});

const nz = (v: string): string | null => (v.trim() === "" ? null : v.trim());

const buildBody = (f: LabForm): LabUpdate => ({
  name: f.name.trim(),
  code: nz(f.code),
  office_id: f.office_id ? Number(f.office_id) : null,
  contact_name: nz(f.contact_name),
  phone: nz(f.phone),
  fax: nz(f.fax),
  email: nz(f.email),
  address_line1: nz(f.address_line1),
  address_line2: nz(f.address_line2),
  city: nz(f.city),
  state: nz(f.state),
  zip: nz(f.zip),
  default_turnaround_days: f.default_turnaround_days.trim() === "" ? null : Number(f.default_turnaround_days),
  notes: nz(f.notes),
  is_active: f.is_active,
});

function InfoRow({ label, value, strong }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[220px_1fr] border-b border-[#E2E8F0] last:border-b-0 odd:bg-[#F8FAFC]">
      <div className="px-4 py-2.5 text-sm text-[#1F3A5F] font-semibold border-r border-[#E2E8F0]">{label}</div>
      <div className={`px-4 py-2.5 text-sm text-[#1E293B] ${strong ? "font-bold" : ""}`}>{value || " "}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
      />
    </label>
  );
}

export default function LabSetup() {
  const [labs, setLabs] = useState<LabRead[]>([]);
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<LabForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, offs] = await Promise.all([
        listAllLabs(),
        listOffices({ size: 200 }).then((r) => r.items ?? []).catch(() => [] as OfficeRead[]),
      ]);
      setLabs(rows);
      setOffices(offs);
    } catch (e: unknown) {
      toast.error("Could not load labs", { description: labErrorMessage(e, "Request failed") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const officeName = useCallback(
    (id: number | null | undefined) => {
      if (id == null) return "All offices";
      const o = offices.find((x) => x.id === id);
      return o ? o.name : `Office #${id}`;
    },
    [offices],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return labs.filter((l) => {
      if (!showInactive && !l.is_active) return false;
      if (!q) return true;
      return [l.name, l.code, l.contact_name, l.phone, l.email, l.city]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [labs, search, showInactive]);

  const selected = useMemo(() => labs.find((l) => l.id === selectedId) ?? null, [labs, selectedId]);

  const startAdd = () => {
    setSelectedId(null);
    setForm(emptyForm());
    setMode("add");
  };
  const startEdit = () => {
    if (!selected) return;
    setForm(labToForm(selected));
    setMode("edit");
  };
  const cancel = () => {
    setMode("view");
    setForm(emptyForm());
  };
  const patch = (p: Partial<LabForm>) => setForm((f) => ({ ...f, ...p }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Lab name is required" });
      return;
    }
    const days = form.default_turnaround_days.trim();
    if (days !== "" && (!/^\d+$/.test(days) || Number(days) < 0)) {
      toast.error("Validation Failed", { description: "Default turnaround must be a whole number of days" });
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        const body: LabCreate = { ...buildBody(form), name: form.name.trim() };
        let created: LabRead;
        try {
          created = await createLabVendor(body);
        } catch (e: unknown) {
          if (!isDuplicateLabName(e)) throw e;
          const ok = window.confirm(
            `An active lab named "${form.name.trim()}" already exists. Create another lab with the same name anyway?`,
          );
          if (!ok) return;
          created = await createLabVendor({ ...body, allow_duplicate_name: true });
        }
        toast.success("Lab created");
        await loadData();
        setSelectedId(created.id);
      } else if (selectedId != null) {
        await updateLabVendor(selectedId, buildBody(form));
        toast.success("Lab updated");
        await loadData();
      }
      setMode("view");
    } catch (e: unknown) {
      toast.error("Save failed", { description: labErrorMessage(e, "Could not save lab") });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Deactivate lab "${selected.name}"? Existing cases keep it; it will no longer be offered for new cases.`)) return;
    setDeleting(true);
    try {
      await deactivateLabVendor(selected.id);
      toast.success("Lab deactivated");
      await loadData();
      setMode("view");
    } catch (e: unknown) {
      toast.error("Delete failed", { description: labErrorMessage(e, "Could not deactivate lab") });
    } finally {
      setDeleting(false);
    }
  };

  const editing = mode === "add" || mode === "edit";
  const cityStateZip = selected
    ? [selected.city, selected.state].filter(Boolean).join(", ") + (selected.zip ? ` ${selected.zip}` : "")
    : "";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Lab Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Dental labs available to Lab Tracking and the appointment LAB section
                </p>
              </div>
            </div>
            <button
              onClick={startAdd}
              disabled={editing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3A6EA5] text-white text-sm font-semibold hover:bg-[#2F5B8A] disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add Lab
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            {/* LEFT RAIL */}
            <aside className="bg-[#F8FAFC] border-r-2 border-[#E2E8F0] flex flex-col min-h-[600px]">
              <div className="px-4 py-2.5 text-xs font-bold tracking-wide text-[#1F3A5F] uppercase border-b-2 border-[#E2E8F0] bg-white">
                Labs
              </div>
              <div className="p-4 space-y-3 border-b border-[#E2E8F0]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, code, contact, phone…"
                    className="w-full pl-9 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm focus:outline-none focus:border-[#3A6EA5]"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="accent-[#3A6EA5]"
                  />
                  Show inactive labs
                </label>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-sm text-[#64748B]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#64748B]">
                    {labs.length === 0 ? "No labs yet. Use Add Lab to create the first one." : "No labs match."}
                  </div>
                ) : (
                  <ul>
                    {filtered.map((l) => (
                      <li key={l.id}>
                        <button
                          onClick={() => {
                            setSelectedId(l.id);
                            setMode("view");
                          }}
                          className={`w-full text-left px-4 py-2.5 border-b border-[#E2E8F0] text-sm hover:bg-white ${
                            selectedId === l.id ? "bg-white border-l-4 border-l-[#3A6EA5]" : ""
                          }`}
                        >
                          <div className="font-semibold text-[#1E293B] flex items-center gap-2">
                            {l.name}
                            {!l.is_active && (
                              <span className="text-[10px] uppercase font-bold text-[#94A3B8]">inactive</span>
                            )}
                          </div>
                          <div className="text-xs text-[#64748B]">
                            {[l.code, l.phone, l.city].filter(Boolean).join(" · ") || officeName(l.office_id)}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>

            {/* RIGHT DETAIL */}
            <section className="min-h-[600px] flex flex-col">
              {!editing && !selected ? (
                <div className="flex-1 flex items-center justify-center text-sm text-[#64748B] p-10 text-center">
                  Select a lab on the left, or click Add Lab.
                </div>
              ) : editing ? (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Lab Name" value={form.name} onChange={(v) => patch({ name: v })} maxLength={200} required />
                    <Field label="Code" value={form.code} onChange={(v) => patch({ code: v })} maxLength={50} />
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Office</span>
                      <select
                        value={form.office_id}
                        onChange={(e) => patch({ office_id: e.target.value })}
                        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
                      >
                        <option value="">All offices</option>
                        {offices.map((o) => (
                          <option key={o.id} value={String(o.id)}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Default Turnaround (days)"
                      value={form.default_turnaround_days}
                      onChange={(v) => patch({ default_turnaround_days: v })}
                      type="number"
                      placeholder="Pre-fills Due On = Sent On + days"
                    />
                    <Field label="Contact Name" value={form.contact_name} onChange={(v) => patch({ contact_name: v })} maxLength={200} />
                    <Field label="Phone" value={form.phone} onChange={(v) => patch({ phone: v })} maxLength={50} />
                    <Field label="Fax" value={form.fax} onChange={(v) => patch({ fax: v })} maxLength={50} />
                    <Field label="Email" value={form.email} onChange={(v) => patch({ email: v })} type="email" maxLength={255} />
                    <Field label="Address Line 1" value={form.address_line1} onChange={(v) => patch({ address_line1: v })} maxLength={255} />
                    <Field label="Address Line 2" value={form.address_line2} onChange={(v) => patch({ address_line2: v })} maxLength={255} />
                    <Field label="City" value={form.city} onChange={(v) => patch({ city: v })} maxLength={100} />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="State" value={form.state} onChange={(v) => patch({ state: v })} maxLength={50} />
                      <Field label="Zip" value={form.zip} onChange={(v) => patch({ zip: v })} maxLength={20} />
                    </div>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Notes</span>
                    <textarea
                      value={form.notes}
                      onChange={(e) => patch({ notes: e.target.value })}
                      rows={3}
                      className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => patch({ is_active: e.target.checked })}
                      className="accent-[#3A6EA5]"
                    />
                    Active (offered when booking lab cases)
                  </label>

                  <div className="flex items-center gap-2 pt-2 border-t-2 border-[#E2E8F0]">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3A6EA5] text-white text-sm font-semibold hover:bg-[#2F5B8A] disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {mode === "add" ? "Create Lab" : "Save Changes"}
                    </button>
                    <button
                      onClick={cancel}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm font-semibold text-[#1E293B] hover:bg-[#F8FAFC]"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              ) : selected ? (
                <div className="flex flex-col flex-1">
                  <div className="border-b-2 border-[#E2E8F0]">
                    <InfoRow label="Lab Name" value={selected.name} strong />
                    <InfoRow label="Code" value={selected.code} />
                    <InfoRow label="Office" value={officeName(selected.office_id)} />
                    <InfoRow
                      label="Default Turnaround"
                      value={selected.default_turnaround_days != null ? `${selected.default_turnaround_days} day(s)` : ""}
                    />
                    <InfoRow label="Contact" value={selected.contact_name} />
                    <InfoRow label="Phone" value={selected.phone} />
                    <InfoRow label="Fax" value={selected.fax} />
                    <InfoRow label="Email" value={selected.email} />
                    <InfoRow label="Address" value={[selected.address_line1, selected.address_line2].filter(Boolean).join(", ")} />
                    <InfoRow label="City / State / Zip" value={cityStateZip} />
                    <InfoRow label="Notes" value={selected.notes} />
                    <InfoRow label="Status" value={selected.is_active ? "Active" : "Inactive"} />
                    <InfoRow
                      label="Created / Modified"
                      value={[
                        selected.created_by_name ? `Created by ${selected.created_by_name}` : null,
                        selected.updated_by_name ? `modified by ${selected.updated_by_name}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    />
                  </div>
                  <div className="p-4 flex items-center gap-2 mt-auto">
                    <button
                      onClick={startEdit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3A6EA5] text-white text-sm font-semibold hover:bg-[#2F5B8A]"
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    {selected.is_active && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  Pencil,
  Network,
} from "lucide-react";
import { toast } from "sonner";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import type { OfficeRead, ReferralRead } from "@/api/generated/model";
import {
  listAllReferrals,
  createReferralSource,
  updateReferralSource,
  deleteReferralSource,
} from "./referralService";
import {
  type ReferralForm,
  emptyReferralForm,
  referralToForm,
  buildReferralCreate,
  buildReferralUpdate,
  referralDisplayName,
  referralDirectionLabel,
  REFERRAL_DIRECTIONS,
} from "./referralData";

// ============================================================================
// Referral Setup — master-detail screen on /api/v1/referrals (tag: Patients).
// Persistent left search rail (Sort By / Type / Search On / text) + right
// tabbed detail (Referral Info / Demographics) with Edit/Delete footer, mirroring
// the legacy Referral screen. snake_case forms bind directly to the generated
// client. Backend gaps (eReferral ID, Practice Name, Contact, Cost, demographics
// feed) are documented in docs/referrals/referral_setup_backend_devreport.md.
// ============================================================================

type TabName = "info" | "demographics";
type Mode = "view" | "add" | "edit";
type SortBy = "name" | "zip" | "phone";
type SearchOn = "all" | "0" | "1"; // referral_type direction code

const NA = "N/A"; // legacy field with no backend column

function InfoRow({ label, value, strong }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[260px_1fr] border-b border-[#E2E8F0] last:border-b-0 odd:bg-[#F8FAFC]">
      <div className="px-4 py-2.5 text-sm text-[#1F3A5F] font-semibold border-r border-[#E2E8F0]">
        {label}
      </div>
      <div className={`px-4 py-2.5 text-sm text-[#1E293B] ${strong ? "font-bold" : ""}`}>
        {value || " "}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
      />
      {hint ? <span className="text-[10px] text-[#94A3B8]">{hint}</span> : null}
    </label>
  );
}

export default function ReferralSetup() {
  const [referrals, setReferrals] = useState<ReferralRead[]>([]);
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Left rail controls.
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchOn, setSearchOn] = useState<SearchOn>("all");
  const [searchText, setSearchText] = useState("");

  // Detail state.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<ReferralForm>(() => emptyReferralForm());
  const [activeTab, setActiveTab] = useState<TabName>("info");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const officeName = useCallback(
    (id: number | null | undefined) => {
      if (id == null) return "";
      return offices.find((o) => o.id === id)?.name ?? String(id);
    },
    [offices],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [refs, offRes] = await Promise.all([
        listAllReferrals(),
        listOffices({ size: 200 }).catch(() => null),
      ]);
      setReferrals(refs);
      setOffices(offRes?.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load referrals");
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // TYPE dropdown options derived from data (reason_code = legacy "Type").
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of referrals) if (r.reason_code) set.add(r.reason_code);
    return Array.from(set).sort();
  }, [referrals]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = referrals.filter((r) => {
      if (typeFilter !== "all" && (r.reason_code ?? "") !== typeFilter) return false;
      if (searchOn !== "all" && (r.referral_type ?? "") !== searchOn) return false;
      if (!q) return true;
      return (
        referralDisplayName(r).toLowerCase().includes(q) ||
        (r.specialty ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.zip ?? "").toLowerCase().includes(q) ||
        (r.npi ?? "").toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => {
      if (sortBy === "zip") return (a.zip ?? "").localeCompare(b.zip ?? "");
      if (sortBy === "phone") return (a.phone ?? "").localeCompare(b.phone ?? "");
      return referralDisplayName(a).localeCompare(referralDisplayName(b));
    });
  }, [referrals, typeFilter, searchOn, searchText, sortBy]);

  const selected = useMemo(
    () => referrals.find((r) => r.id === selectedId) ?? null,
    [referrals, selectedId],
  );

  const updateForm = (updates: Partial<ReferralForm>) => setForm((p) => ({ ...p, ...updates }));

  const openReferral = (r: ReferralRead) => {
    setSelectedId(r.id);
    setMode("view");
    setActiveTab("info");
  };

  const openAdd = () => {
    setForm(emptyReferralForm());
    setSelectedId(null);
    setMode("add");
    setActiveTab("info");
  };

  const openEdit = () => {
    if (!selected) return;
    setForm(referralToForm(selected));
    setMode("edit");
    setActiveTab("info");
  };

  const handleCancel = () => {
    if (saving) return;
    setMode("view");
    setForm(emptyReferralForm());
  };

  const handleSave = async () => {
    if (!form.last_name.trim() && !form.first_name.trim()) {
      toast.error("Validation Failed", { description: "Enter at least a Last or First name" });
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        const created = await createReferralSource(buildReferralCreate(form));
        toast.success("Referral created");
        await loadData();
        setSelectedId(created.id);
      } else if (selectedId != null) {
        await updateReferralSource(selectedId, buildReferralUpdate(form));
        toast.success("Referral updated");
        await loadData();
      }
      setMode("view");
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save referral",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete referral "${referralDisplayName(selected)}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteReferralSource(selected.id);
      toast.success("Referral deleted");
      setSelectedId(null);
      setMode("view");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete referral",
      });
    } finally {
      setDeleting(false);
    }
  };

  const editing = mode === "add" || mode === "edit";

  const cityStateZip = selected
    ? [selected.city, selected.state].filter(Boolean).join(", ") +
      (selected.zip ? ` ${selected.zip}` : "")
    : "";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Referral Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Manage referral sources — referred-by and referred-to contacts
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            {/* -------------------- LEFT SEARCH RAIL -------------------- */}
            <aside className="bg-[#F8FAFC] border-r-2 border-[#E2E8F0] flex flex-col min-h-[600px]">
              <div className="px-4 py-2.5 text-xs font-bold tracking-wide text-[#1F3A5F] uppercase border-b-2 border-[#E2E8F0] bg-white">
                Search
              </div>

              <div className="p-4 space-y-4 border-b border-[#E2E8F0]">
                {/* Sort By */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SORT BY</div>
                  <div className="flex items-center gap-4 text-sm">
                    {(["name", "zip", "phone"] as SortBy[]).map((s) => (
                      <label key={s} className="flex items-center gap-1.5 cursor-pointer capitalize">
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === s}
                          onChange={() => setSortBy(s)}
                          className="accent-[#3A6EA5]"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">TYPE</div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
                  >
                    <option value="all">All</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search On */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SEARCH ON</div>
                  <div className="flex items-center gap-4 text-sm">
                    {([
                      ["all", "All"],
                      ["0", "Referred By"],
                      ["1", "Referred To"],
                    ] as [SearchOn, string][]).map(([val, lbl]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="searchOn"
                          checked={searchOn === val}
                          onChange={() => setSearchOn(val)}
                          className="accent-[#3A6EA5]"
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Search text */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SEARCH TEXT</div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-360px)]">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-[#64748B] text-sm font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" /> Loading…
                  </div>
                ) : loadError ? (
                  <div className="px-4 py-6 text-center text-sm text-[#DC2626]">
                    {loadError}
                    <button
                      onClick={() => void loadData()}
                      className="mt-2 block mx-auto px-3 py-1 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded text-xs font-bold hover:bg-[#E8EFF7]"
                    >
                      Retry
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[#64748B] font-bold">No referrals found</div>
                ) : (
                  filtered.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => openReferral(r)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-[#E2E8F0] border-l-4 transition-colors ${
                        r.id === selectedId
                          ? "bg-[#E8EFF7] text-[#1F3A5F] font-bold border-l-[#3A6EA5]"
                          : "text-[#1E293B] hover:bg-[#F1F5F9] border-l-transparent"
                      }`}
                    >
                      {referralDisplayName(r)}
                    </button>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-[#E2E8F0]">
                <button
                  onClick={openAdd}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3A6EA5] text-white hover:bg-[#1F3A5F] rounded-lg font-bold text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  ADD REFERRAL
                </button>
              </div>
            </aside>

            {/* -------------------- RIGHT DETAIL PANE -------------------- */}
            <section className="flex flex-col bg-white min-h-[600px]">
              {/* Tabs */}
              <div className="flex items-center gap-6 px-6 pt-4 border-b-2 border-[#E2E8F0] bg-white">
                {(["info", "demographics"] as TabName[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => !editing && setActiveTab(tab)}
                    disabled={editing && tab === "demographics"}
                    className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 -mb-0.5 transition-colors ${
                      activeTab === tab
                        ? "text-[#3A6EA5] border-[#3A6EA5]"
                        : "text-[#64748B] border-transparent hover:text-[#1F3A5F] disabled:opacity-40"
                    }`}
                  >
                    {tab === "info" ? "Referral Info" : "Demographics"}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {!selected && !editing ? (
                  <div className="flex flex-col items-center justify-center h-full py-24 text-center text-[#64748B]">
                    <Network className="w-12 h-12 text-[#CBD5E1] mb-3" />
                    <p className="text-sm font-bold">Select a referral from the list</p>
                    <p className="text-xs">or add a new referral source</p>
                  </div>
                ) : editing ? (
                  /* ---------- EDIT / ADD FORM ---------- */
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                          Referred By/To
                        </span>
                        <select
                          value={form.referral_type}
                          onChange={(e) => updateForm({ referral_type: e.target.value })}
                          className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                        >
                          {REFERRAL_DIRECTIONS.map((d) => (
                            <option key={d.code} value={d.code}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                          Office
                        </span>
                        <select
                          value={form.office_id ?? ""}
                          onChange={(e) =>
                            updateForm({ office_id: e.target.value ? Number(e.target.value) : null })
                          }
                          className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                        >
                          <option value="">— None —</option>
                          {offices.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field label="Last Name" value={form.last_name} onChange={(v) => updateForm({ last_name: v })} />
                      <Field label="First Name" value={form.first_name} onChange={(v) => updateForm({ first_name: v })} />
                      <Field label="Address" value={form.address} onChange={(v) => updateForm({ address: v })} />
                      <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
                        <Field label="City" value={form.city} onChange={(v) => updateForm({ city: v })} />
                        <Field label="State" value={form.state} onChange={(v) => updateForm({ state: v })} />
                        <Field label="Zip" value={form.zip} onChange={(v) => updateForm({ zip: v })} />
                      </div>
                      <Field label="Email" value={form.email} onChange={(v) => updateForm({ email: v })} />
                      <Field label="Phone" value={form.phone} onChange={(v) => updateForm({ phone: v })} />
                      <Field label="Specialty" value={form.specialty} onChange={(v) => updateForm({ specialty: v })} />
                      <Field label="Type" value={form.reason_code} onChange={(v) => updateForm({ reason_code: v })} />
                      <Field label="NPI ID" value={form.npi} onChange={(v) => updateForm({ npi: v })} />
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Notes</span>
                      <textarea
                        value={form.notes}
                        onChange={(e) => updateForm({ notes: e.target.value })}
                        rows={3}
                        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] resize-y"
                      />
                    </label>

                    <p className="text-[11px] text-[#94A3B8]">
                      eReferral ID, Practice Name, Contact, and Cost are not yet supported by the backend.
                    </p>
                  </div>
                ) : activeTab === "info" ? (
                  /* ---------- READ-ONLY INFO GRID ---------- */
                  <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                    <InfoRow label="Referral ID" value={selected?.legacy_id || String(selected?.id ?? "")} />
                    <InfoRow label="eReferral ID" value={NA} />
                    <InfoRow label="Referred By/To" value={referralDirectionLabel(selected?.referral_type)} strong />
                    <InfoRow label="Last, First" value={selected ? referralDisplayName(selected) : ""} strong />
                    <InfoRow label="Practice Name" value={NA} />
                    <InfoRow label="Address" value={selected?.address} />
                    <InfoRow label="City, State Zip" value={cityStateZip} />
                    <InfoRow label="Email" value={selected?.email} />
                    <InfoRow label="Phone" value={selected?.phone} />
                    <InfoRow label="Contact" value={NA} />
                    <InfoRow label="Specialty" value={selected?.specialty} />
                    <InfoRow label="Type" value={selected?.reason_code} />
                    <InfoRow label="NPI ID" value={selected?.npi} />
                    <InfoRow label="Cost" value={NA} />
                    <InfoRow label="Notes" value={selected?.notes} />
                    {selected?.office_id != null ? (
                      <InfoRow label="Office" value={officeName(selected.office_id)} />
                    ) : null}
                  </div>
                ) : (
                  /* ---------- DEMOGRAPHICS ---------- */
                  <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <div className="px-4 py-2.5 text-sm font-bold text-[#1F3A5F] border-r border-[#E2E8F0]">
                        Demographic
                      </div>
                      <div className="px-4 py-2.5 text-sm font-bold text-[#1F3A5F]">Data</div>
                    </div>
                    <div className="px-4 py-10 text-center text-sm text-[#94A3B8]">
                      No demographics available — the backend does not expose a referral demographics feed yet.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="border-t-2 border-[#E2E8F0] bg-white px-6 py-3 flex justify-end gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {mode === "add" ? "Create Referral" : "Save Referral"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={openEdit}
                      disabled={!selected}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-40"
                    >
                      <Pencil className="w-4 h-4" />
                      EDIT REFERRAL
                    </button>
                    <button
                      onClick={() => void handleDelete()}
                      disabled={!selected || deleting}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#FEE2E2] hover:text-[#DC2626] hover:border-[#FECACA] font-bold text-sm disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      DELETE REFERRAL
                    </button>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

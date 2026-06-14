import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ShieldCheck,
  HeartPulse,
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInsuranceCarrier,
  createInsuranceCarrier,
  updateInsuranceCarrier,
  deleteInsuranceCarrier,
} from "@/api/generated/endpoints/insurance/insurance";
import type { InsuranceCarrierRead } from "@/api/generated/model";
import { US_STATES } from "@/components/modals/patient/constants";
import {
  type CarrierForm,
  type CarrierVariant,
  emptyCarrierForm,
  carrierToForm,
  buildCarrierCreate,
  buildCarrierUpdate,
  carrierTypeFor,
} from "./insuranceData";
import { fetchCarriersByType, invalidateCarriers } from "./carrierService";

// ============================================================================
// Carrier Setup — master-detail over /api/v1/insurance-carriers (tag: Insurance).
// One component drives both the Dental and Medical Carrier setup screens; the
// `variant` prop selects which carrier_type the screen reads/writes ("True" =
// dental, "False" = medical). The dental/medical split is a client-side
// partition because the list endpoint has no carrier_type filter — see
// docs/insurance/insurance_backend_devreport.md (INS-1).
// Mirrors the ProviderSetup pattern (list ⇄ editable detail, snake_case form).
// ============================================================================

const VARIANT_META: Record<
  CarrierVariant,
  { title: string; subtitle: string; icon: typeof ShieldCheck; noun: string }
> = {
  dental: {
    title: "Dental Insurance Carriers",
    subtitle: "Manage dental insurance carriers, payer IDs and claims addresses",
    icon: ShieldCheck,
    noun: "dental carrier",
  },
  medical: {
    title: "Medical Insurance Carriers",
    subtitle: "Manage medical insurance carriers, payer IDs and claims addresses",
    icon: HeartPulse,
    noun: "medical carrier",
  },
};

export default function CarrierSetup({ variant }: { variant: CarrierVariant }) {
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  const [carriers, setCarriers] = useState<InsuranceCarrierRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // List controls.
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "id">("name");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  // Detail state.
  const [showList, setShowList] = useState(true);
  const [mode, setMode] = useState<"add" | "edit">("edit");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<CarrierForm>(() => emptyCarrierForm(variant));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(
    async (force = false) => {
      setLoading(true);
      setLoadError(null);
      try {
        const all = await fetchCarriersByType(carrierTypeFor(variant), force);
        setCarriers(all);
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : "Failed to load carriers");
        setCarriers([]);
      } finally {
        setLoading(false);
      }
    },
    [variant],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Switching between the Dental and Medical routes reuses this same component
  // instance (React keeps it mounted, only the `variant` prop changes), so reset
  // back to the list view and clear any open detail when the variant changes.
  useEffect(() => {
    setShowList(true);
    setSelectedId(null);
    setForm(emptyCarrierForm(variant));
  }, [variant]);

  // Distinct claim types present in this carrier set — data-driven, not hardcoded.
  const claimTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of carriers) if (c.claim_type) set.add(c.claim_type);
    return Array.from(set).sort();
  }, [carriers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = carriers.filter((c) => {
      if (activeFilter === "active" && !c.is_active) return false;
      if (activeFilter === "inactive" && c.is_active) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.payer_id ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.state ?? "").toLowerCase().includes(q) ||
        String(c.id).includes(q)
      );
    });
    return list.sort((a, b) =>
      sortBy === "id" ? a.id - b.id : a.name.localeCompare(b.name),
    );
  }, [carriers, searchQuery, activeFilter, sortBy]);

  const updateForm = (updates: Partial<CarrierForm>) => setForm((p) => ({ ...p, ...updates }));

  const openAdd = () => {
    setForm(emptyCarrierForm(variant));
    setSelectedId(null);
    setMode("add");
    setShowList(false);
  };

  const openCarrier = async (c: InsuranceCarrierRead) => {
    try {
      const full = await getInsuranceCarrier(c.id);
      setForm(carrierToForm(full));
      setSelectedId(full.id);
      setMode("edit");
      setShowList(false);
    } catch (e: unknown) {
      toast.error("Failed to open carrier", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setShowList(true);
    setSelectedId(null);
    setForm(emptyCarrierForm(variant));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Carrier Name is required" });
      return;
    }
    setSaving(true);
    try {
      if (selectedId == null) {
        await createInsuranceCarrier(buildCarrierCreate(form));
        toast.success(`${meta.noun.charAt(0).toUpperCase()}${meta.noun.slice(1)} created`);
      } else {
        await updateInsuranceCarrier(selectedId, buildCarrierUpdate(form));
        toast.success("Carrier updated");
      }
      invalidateCarriers();
      await loadData(true);
      setShowList(true);
      setSelectedId(null);
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save carrier",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: InsuranceCarrierRead) => {
    if (!confirm(`Delete carrier "${c.name}"? This cannot be undone.`)) return;
    setDeletingId(c.id);
    try {
      await deleteInsuranceCarrier(c.id);
      toast.success("Carrier deleted");
      invalidateCarriers();
      await loadData(true);
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete carrier",
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
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">{meta.title}</h1>
                    <p className="text-xs text-[#64748B] font-bold">{meta.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Carrier
                </button>
              </div>

              {/* Search + filters */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search by name, payer ID, city, state, or ID…"
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
                  <option value="name">Sort: Name</option>
                  <option value="id">Sort: ID</option>
                </select>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                <span className="text-sm font-bold">Loading carriers…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold text-[#DC2626]">Unable to load carriers</p>
                <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
                <button
                  onClick={() => void loadData(true)}
                  className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Icon className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">
                  {carriers.length === 0
                    ? `No ${meta.noun}s yet`
                    : "No carriers match your filters"}
                </p>
                {carriers.length === 0 && (
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first carrier
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      {["Name", "Payer ID", "Claim Type", "City, State", "Phone", "Status", ""].map(
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
                    {filtered.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => void openCarrier(c)}
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {c.name}
                          <span className="ml-2 text-[10px] text-[#94A3B8]">({c.id})</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{c.payer_id || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{c.claim_type || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{c.phone || "—"}</td>
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
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => void handleDelete(c)}
                            disabled={deletingId === c.id}
                            className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === c.id ? (
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
      <div className="max-w-[1100px] mx-auto p-6">
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
                    {mode === "add" ? `Add ${meta.title.slice(0, -1)}` : `Carrier: ${form.name || "Loading…"}`}
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    {selectedId ? `Carrier ID: ${selectedId}` : "Carrier ID: (assigned on save)"}
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
                  {mode === "add" ? "Create Carrier" : "Save Carrier"}
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <CarrierFormFields
              form={form}
              updateForm={updateForm}
              claimTypeOptions={claimTypeOptions}
              variant={variant}
            />
            {mode === "edit" && selectedId != null && (
              <FeeSchedulesNotice />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carrier form fields
// ---------------------------------------------------------------------------

function Field({
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

const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

function CarrierFormFields({
  form,
  updateForm,
  claimTypeOptions,
  variant,
}: {
  form: CarrierForm;
  updateForm: (u: Partial<CarrierForm>) => void;
  claimTypeOptions: string[];
  variant: CarrierVariant;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-3">
          Carrier Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Carrier Name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                className={INPUT_CLS}
                placeholder="e.g. Delta Dental Plan (KS) Advantage"
              />
            </Field>
          </div>
          <Field label="Address">
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateForm({ address: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Address 2">
            <input
              type="text"
              value={form.address2}
              onChange={(e) => updateForm({ address2: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="City">
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateForm({ city: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State">
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
            </Field>
            <Field label="Zip">
              <input
                type="text"
                value={form.zip}
                onChange={(e) => updateForm({ zip: e.target.value })}
                className={INPUT_CLS}
              />
            </Field>
          </div>
          <Field label="Phone">
            <input
              type="text"
              value={form.phone}
              onChange={(e) => updateForm({ phone: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Phone 2">
            <input
              type="text"
              value={form.phone2}
              onChange={(e) => updateForm({ phone2: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Fax">
            <input
              type="text"
              value={form.fax}
              onChange={(e) => updateForm({ fax: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm({ email: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-3">
          Electronic Claims
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Payer ID#">
            <input
              type="text"
              value={form.payer_id}
              onChange={(e) => updateForm({ payer_id: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="National ID">
            <input
              type="text"
              value={form.national_id}
              onChange={(e) => updateForm({ national_id: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Claim Type">
            <input
              type="text"
              list="carrier-claim-types"
              value={form.claim_type}
              onChange={(e) => updateForm({ claim_type: e.target.value })}
              className={INPUT_CLS}
              placeholder="e.g. EClaim"
            />
            <datalist id="carrier-claim-types">
              {claimTypeOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Fee Schedule ID">
            <input
              type="text"
              value={form.fee_id}
              onChange={(e) => updateForm({ fee_id: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          {variant === "medical" && (
            <Field label="Insurance Type">
              <input
                type="text"
                value={form.insurance_type}
                onChange={(e) => updateForm({ insurance_type: e.target.value })}
                className={INPUT_CLS}
                placeholder="e.g. EPPO, PPO"
              />
            </Field>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-3">
          Carrier Capabilities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CapabilityToggle
            label="Real-time eligibility"
            checked={form.supports_realtime_eligibility}
            onChange={(v) => updateForm({ supports_realtime_eligibility: v })}
          />
          <CapabilityToggle
            label="Claim status"
            checked={form.supports_claim_status}
            onChange={(v) => updateForm({ supports_claim_status: v })}
          />
          <CapabilityToggle
            label="DXC claim attachment"
            checked={form.supports_dxc_attachment}
            onChange={(v) => updateForm({ supports_dxc_attachment: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-3">
          Contact & Notes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Website">
            <input
              type="text"
              value={form.website}
              onChange={(e) => updateForm({ website: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Contact Person">
            <input
              type="text"
              value={form.contact}
              onChange={(e) => updateForm({ contact: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Insurance Reference Number">
            <input
              type="text"
              value={form.ref_num}
              onChange={(e) => updateForm({ ref_num: e.target.value })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2 px-3 py-2 border-2 border-[#E2E8F0] rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateForm({ is_active: e.target.checked })}
                className="w-4 h-4 accent-[#3A6EA5]"
              />
              <span className="text-sm font-bold text-[#1F3A5F]">
                {form.is_active ? "Active" : "Inactive"}
              </span>
            </label>
          </Field>
          <div className="md:col-span-2">
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={4}
                maxLength={2000}
                className={INPUT_CLS}
              />
              <p className="text-[10px] text-[#94A3B8] mt-1">
                {form.notes.length} / 2000 characters
              </p>
            </Field>
          </div>
        </div>
      </section>
    </div>
  );
}

function CapabilityToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 px-3 py-2 border-2 border-[#E2E8F0] rounded-lg cursor-pointer hover:bg-[#F7F9FC]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#3A6EA5]"
      />
      <span className="text-sm font-semibold text-[#1F3A5F]">{label}</span>
    </label>
  );
}

function FeeSchedulesNotice() {
  return (
    <div className="mt-6 border-t-2 border-[#E2E8F0] pt-4">
      <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-2">
        Fee Schedules
      </h3>
      <p className="text-xs text-[#64748B]">
        Carrier fee-schedule assignments are managed in the Fee Schedule Manager
        (coming in the Fee Schedule unit of this phase).
      </p>
    </div>
  );
}

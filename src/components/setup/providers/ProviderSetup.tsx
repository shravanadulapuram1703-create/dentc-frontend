import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Stethoscope,
  Search,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  Info as InfoIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  listOffices,
} from "@/api/generated/endpoints/organization/organization";
import type { ProviderRead, OfficeRead } from "@/api/generated/model";
import {
  type ProviderForm,
  emptyProviderForm,
  providerToForm,
  buildProviderCreate,
  buildProviderUpdate,
} from "./providerData";
import InfoTab from "./tabs/InfoTab";
import WorksAtTab from "./tabs/WorksAtTab";
import OperatoriesTab from "./tabs/OperatoriesTab";
import InsuranceIdsTab from "./tabs/InsuranceIdsTab";
import RouteSlipsTab from "./tabs/RouteSlipsTab";
import SchedulesTab from "./tabs/SchedulesTab";
import HolidaysTab from "./tabs/HolidaysTab";
import WatermarksTab from "./tabs/WatermarksTab";
import ReferralsTab from "./tabs/ReferralsTab";
import CarrierLoginTab from "./tabs/CarrierLoginTab";
import UserTab from "./tabs/UserTab";

// ============================================================================
// Provider Setup — master-detail screen on /api/v1/providers (tag: Organization)
// plus office-side multi-office assignment, operatory defaults, and the
// provider-insurance-id / provider-route-slip sub-resources. Mirrors the
// OfficeSetup pattern (list ⇄ tabbed detail, snake_case forms, gated tabs).
// Backend gaps documented in docs/provider-setup/provider_setup_backend_devreport.md.
// ============================================================================

type TabName =
  | "info"
  | "works_at"
  | "operatories"
  | "insurance"
  | "route_slips"
  | "schedules"
  | "holidays"
  | "referrals"
  | "watermarks"
  | "carrier_login"
  | "user_permissions";

const TAB_LABELS: Record<TabName, string> = {
  info: "Info",
  works_at: "Works At",
  operatories: "Operatories",
  insurance: "Insurance IDs",
  route_slips: "Route Slips",
  schedules: "Schedules",
  holidays: "Holidays",
  referrals: "Referrals",
  watermarks: "Watermarks",
  carrier_login: "Carrier Login",
  user_permissions: "User & Permissions",
};

function SaveFirstNotice({ tab }: { tab: TabName }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[#E8EFF7] flex items-center justify-center mb-4">
        <InfoIcon className="w-7 h-7 text-[#3A6EA5]" />
      </div>
      <h3 className="text-lg font-bold text-[#1F3A5F] mb-2">Save the provider first</h3>
      <p className="text-sm text-[#64748B] max-w-md">
        Create the provider on the <strong>Info</strong> tab before managing {TAB_LABELS[tab]}.
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
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProviderSetup() {
  const [providers, setProviders] = useState<ProviderRead[]>([]);
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // List controls (mirrors the legacy left rail).
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "id">("name");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  // Detail state.
  const [showList, setShowList] = useState(true);
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderForm>(() => emptyProviderForm());
  const [activeTab, setActiveTab] = useState<TabName>("info");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const [provRes, offRes] = await Promise.all([
        listProviders({ size: 200, sort: "name", order: "asc" }),
        listOffices({ size: 200 }).catch(() => null),
      ]);
      setProviders(provRes.items ?? []);
      setOffices(offRes?.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load providers");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Distinct provider types (roles) for the Type filter — derived from data, not hardcoded.
  const providerTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of providers) if (p.role) set.add(p.role);
    return Array.from(set).sort();
  }, [providers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = providers.filter((p) => {
      if (activeFilter === "active" && !p.is_active) return false;
      if (activeFilter === "inactive" && p.is_active) return false;
      if (typeFilter !== "all" && p.role !== typeFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.role ?? "").toLowerCase().includes(q) ||
        (p.npi ?? "").toLowerCase().includes(q) ||
        (p.short_id ?? "").toLowerCase().includes(q) ||
        officeName(p.office_id).toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) =>
      sortBy === "id"
        ? String(a.short_id ?? a.id).localeCompare(String(b.short_id ?? b.id))
        : a.name.localeCompare(b.name),
    );
  }, [providers, searchQuery, activeFilter, typeFilter, sortBy, officeName]);

  const updateForm = (updates: Partial<ProviderForm>) => setForm((p) => ({ ...p, ...updates }));

  const openAdd = () => {
    setForm(emptyProviderForm());
    setSelectedProviderId(null);
    setMode("add");
    setActiveTab("info");
    setShowList(false);
  };

  const openProvider = async (p: ProviderRead) => {
    try {
      const full = await getProvider(p.id);
      setForm(providerToForm(full));
      setSelectedProviderId(full.id);
      setMode("view");
      setActiveTab("info");
      setShowList(false);
    } catch (e: unknown) {
      toast.error("Failed to open provider", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setShowList(true);
    setSelectedProviderId(null);
    setForm(emptyProviderForm());
    setMode("view");
  };

  const handleSaveInfo = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Provider Name is required" });
      setActiveTab("info");
      return;
    }
    if (form.office_id == null) {
      toast.error("Validation Failed", { description: "Home Office is required" });
      setActiveTab("info");
      return;
    }

    setSaving(true);
    try {
      if (selectedProviderId == null) {
        const created = await createProvider(buildProviderCreate(form));
        toast.success("Provider created");
        setSelectedProviderId(created.id);
        setMode("view");
      } else {
        await updateProvider(selectedProviderId, buildProviderUpdate(form));
        toast.success("Provider updated");
        setMode("view");
      }
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save provider",
      });
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
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete provider",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const orderedTabs: TabName[] = [
    "info",
    "works_at",
    "operatories",
    "insurance",
    "route_slips",
    "schedules",
    "holidays",
    "referrals",
    "watermarks",
    "carrier_login",
    "user_permissions",
  ];

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
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">Provider Setup</h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      Manage providers, credentials, office assignments and route slips
                    </p>
                  </div>
                </div>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Provider
                </button>
              </div>

              {/* Search + filters */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search by name, type, NPI, short ID, or office…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                >
                  <option value="all">All Types</option>
                  {providerTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                  <option value="name">Sort: Name</option>
                  <option value="id">Sort: ID</option>
                </select>
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
                <button
                  onClick={() => void loadData()}
                  className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Stethoscope className="w-12 h-12 text-[#CBD5E1]" />
                <p className="text-[#64748B] font-bold text-sm">
                  {providers.length === 0 ? "No providers yet" : "No providers match your filters"}
                </p>
                {providers.length === 0 && (
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
                  >
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
                      {["Name", "Type", "Specialty", "Home Office", "NPI", "Status", "Created", ""].map(
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
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => void openProvider(p)}
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {p.name}
                          {p.title ? (
                            <span className="text-[#64748B] font-normal">, {p.title}</span>
                          ) : null}
                          {p.short_id ? (
                            <span className="ml-2 text-[10px] text-[#94A3B8]">({p.short_id})</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{p.role || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{p.specialty || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{officeName(p.office_id)}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{p.npi || "—"}</td>
                        <td className="px-4 py-3">
                          {p.is_active ? (
                            <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">{fmtDateTime(p.created_at)}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
  const needsSaveFirst = selectedProviderId == null;

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
                    {mode === "add" ? "Add New Provider" : `Provider: ${form.name || "Loading…"}`}
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    {selectedProviderId
                      ? `Provider ID: ${selectedProviderId}`
                      : "Provider ID: (assigned on save)"}
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
                  onClick={() => void handleSaveInfo()}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold transition-all text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {mode === "add" ? "Create Provider" : "Save Provider"}
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
            {activeTab === "info" && (
              <InfoTab formData={form} updateFormData={updateForm} offices={offices} />
            )}

            {activeTab === "works_at" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="works_at" />
              ) : (
                <WorksAtTab providerId={selectedProviderId} homeOfficeId={form.office_id} />
              ))}

            {activeTab === "operatories" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="operatories" />
              ) : (
                <OperatoriesTab providerId={selectedProviderId} homeOfficeId={form.office_id} />
              ))}

            {activeTab === "insurance" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="insurance" />
              ) : (
                <InsuranceIdsTab providerId={selectedProviderId} />
              ))}

            {activeTab === "route_slips" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="route_slips" />
              ) : (
                <RouteSlipsTab providerId={selectedProviderId} />
              ))}

            {activeTab === "schedules" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="schedules" />
              ) : (
                <SchedulesTab providerId={selectedProviderId} />
              ))}

            {activeTab === "holidays" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="holidays" />
              ) : (
                <HolidaysTab providerId={selectedProviderId} />
              ))}

            {activeTab === "referrals" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="referrals" />
              ) : (
                <ReferralsTab providerId={selectedProviderId} />
              ))}

            {activeTab === "watermarks" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="watermarks" />
              ) : (
                <WatermarksTab providerId={selectedProviderId} />
              ))}

            {activeTab === "carrier_login" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="carrier_login" />
              ) : (
                <CarrierLoginTab providerId={selectedProviderId} />
              ))}

            {activeTab === "user_permissions" &&
              (needsSaveFirst ? (
                <SaveFirstNotice tab="user_permissions" />
              ) : (
                <UserTab providerId={selectedProviderId} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

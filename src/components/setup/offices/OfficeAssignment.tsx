import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Search,
  X,
  Construction,
  Loader2,
  ClipboardList,
  Boxes,
  Palette,
  Stethoscope,
  StickyNote,
  Pill,
  Mail,
} from "lucide-react";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import type { OfficeRead } from "@/api/generated/model";
import UsersAssignmentTab from "./tabs/assignment/UsersAssignmentTab";
import CatalogAssignmentTab from "./tabs/assignment/CatalogAssignmentTab";
import {
  proceduresResource,
  expCodesResource,
  prodTypesResource,
  providersResource,
  noteMacrosResource,
  rxResource,
  lettersResource,
} from "../../../services/officeAssignmentApi";

/**
 * Setup → Offices → Office Assignment.
 *
 * Office-scoped assignment of catalog entities. Mirrors the OfficeSetup
 * list→detail→tabs shell and theme; each tab self-fetches and self-saves.
 *
 * Backend gaps #24–#31/#33 are now implemented (uniform office-scoped
 * GET assigned / PUT replace-set endpoints), so Procedures, Exp Codes, Prod Types,
 * Providers, Notes Macros, RX and Letters are editable dual-list assignment tabs;
 * Users uses its dedicated bulk-set/copy endpoints. Only **Ortho Misc Setup**
 * (#32) remains gated — the backend hasn't built it (columns still unknown).
 * Tracked in docs/setup/offices/office_assignment_backend_devreport.md.
 */

type TabName =
  | "procedures"
  | "exp-codes"
  | "prod-types"
  | "users"
  | "providers"
  | "notes-macros"
  | "rx"
  | "ortho-misc"
  | "letters";

const TABS: { id: TabName; label: string }[] = [
  { id: "procedures", label: "Procedures" },
  { id: "exp-codes", label: "Exp Codes" },
  { id: "prod-types", label: "Prod Types" },
  { id: "users", label: "Users" },
  { id: "providers", label: "Providers" },
  { id: "notes-macros", label: "Notes Macros" },
  { id: "rx", label: "RX" },
  { id: "ortho-misc", label: "Ortho Misc Setup" },
  { id: "letters", label: "Letters" },
];

/** Tabs with no backend endpoint yet — see office_assignment_backend_devreport.md. */
function TabNotAvailable({ title, gap, reason }: { title: string; gap: string; reason: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-amber-600" />
      </div>
      <h3 className="text-lg font-bold text-[#1F3A5F] mb-2">{title} — not yet available</h3>
      <p className="text-sm text-[#64748B] max-w-md mb-3">{reason}</p>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
        <Construction className="w-3 h-3" />
        Pending backend ({gap})
      </span>
      <p className="text-xs text-[#94A3B8] mt-4">
        Tracked in <code>docs/setup/offices/office_assignment_backend_devreport.md</code>
      </p>
    </div>
  );
}

export default function OfficeAssignment() {
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("users");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    listOffices({ size: 200 })
      .then((res) => {
        if (!cancelled) setOffices(res.items);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const err = e as { response?: { data?: { detail?: string } }; message?: string };
          setLoadError(err.response?.data?.detail || err.message || "Failed to load offices");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOffices = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return offices.filter(
      (o) =>
        (o.name ?? "").toLowerCase().includes(q) ||
        (o.short_id ?? "").toLowerCase().includes(q) ||
        String(o.id ?? "").includes(q),
    );
  }, [offices, searchQuery]);

  const selectedOffice = useMemo(
    () => offices.find((o) => o.id === selectedOfficeId) ?? null,
    [offices, selectedOfficeId],
  );

  const showOfficeList = selectedOfficeId == null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1800px] mx-auto p-6">
        {showOfficeList ? (
          // ---------------- Office List ----------------
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">Office Assignment</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    Select an office to manage its assigned procedures, codes, types and users
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search offices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
            </div>

            <div className="max-h-[600px] overflow-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    {["Office ID", "Office Name", "Short ID", "City, State", "Phone", "Status"].map((h) => (
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
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5] mx-auto mb-3" />
                        <p className="text-[#64748B] font-bold text-sm">Loading offices…</p>
                      </td>
                    </tr>
                  ) : loadError ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="text-[#DC2626] font-bold text-sm">{loadError}</p>
                      </td>
                    </tr>
                  ) : filteredOffices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <Building2 className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] font-bold text-sm">No offices found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOffices.map((office) => (
                      <tr
                        key={office.id}
                        onClick={() => {
                          setSelectedOfficeId(office.id);
                          setActiveTab("users");
                        }}
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">{office.id}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">{office.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-[#E8EFF7] text-[#1F3A5F] text-xs font-bold rounded">
                            {office.short_id}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {office.city}, {office.state}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{office.phone}</td>
                        <td className="px-4 py-3">
                          {office.is_active ? (
                            <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // ---------------- Office Detail (tabs) ----------------
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setSelectedOfficeId(null)}
                  className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors"
                  aria-label="Back to office list"
                >
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">
                    Office Assignment: {selectedOffice?.name ?? "…"}
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">Office ID: {selectedOfficeId}</p>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 font-semibold text-sm whitespace-nowrap rounded-t-lg transition-all ${
                      activeTab === tab.id
                        ? "bg-white text-[#3A6EA5] border-t-4 border-[#3A6EA5]"
                        : "text-[#64748B] hover:text-[#1F3A5F] hover:bg-[#E8EFF7]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-visible">
              {selectedOfficeId != null && activeTab === "users" && (
                <UsersAssignmentTab officeId={selectedOfficeId} offices={offices} />
              )}
              {selectedOfficeId != null && activeTab === "procedures" && (
                <CatalogAssignmentTab
                  officeId={selectedOfficeId}
                  heading="Procedures"
                  subtitle="These are the Procedure Codes the office uses."
                  icon={<ClipboardList className="w-5 h-5 text-[#3A6EA5]" />}
                  resource={proceduresResource}
                  leftTitle="Available Procedures"
                  rightTitle="Assigned Procedures"
                  noun="procedure"
                />
              )}
              {selectedOfficeId != null && activeTab === "exp-codes" && (
                <CatalogAssignmentTab
                  officeId={selectedOfficeId}
                  heading="Exp Codes"
                  subtitle="These are the Explosion codes the office uses."
                  icon={<Boxes className="w-5 h-5 text-[#3A6EA5]" />}
                  resource={expCodesResource}
                  leftTitle="Available Exp Codes"
                  rightTitle="Assigned Exp Codes"
                  noun="exp code"
                />
              )}
              {selectedOfficeId != null && activeTab === "prod-types" && (
                <CatalogAssignmentTab
                  officeId={selectedOfficeId}
                  heading="Prod Types"
                  subtitle="These are the Production Types the office uses."
                  icon={<Palette className="w-5 h-5 text-[#3A6EA5]" />}
                  resource={prodTypesResource}
                  leftTitle="Available Prod Types"
                  rightTitle="Assigned Prod Types"
                  noun="prod type"
                />
              )}
              {selectedOfficeId != null && activeTab === "providers" && (
                <CatalogAssignmentTab
                  officeId={selectedOfficeId}
                  heading="Providers"
                  subtitle="These are the Providers who work at the office."
                  icon={<Stethoscope className="w-5 h-5 text-[#3A6EA5]" />}
                  resource={providersResource}
                  leftTitle="Available Providers"
                  rightTitle="Assigned Providers"
                  noun="provider"
                />
              )}
              {selectedOfficeId != null && activeTab === "notes-macros" && (
                <CatalogAssignmentTab
                  officeId={selectedOfficeId}
                  heading="Notes Macros"
                  subtitle="These are the Notes Macros the office uses."
                  icon={<StickyNote className="w-5 h-5 text-[#3A6EA5]" />}
                  resource={noteMacrosResource}
                  leftTitle="Available Macros"
                  rightTitle="Assigned Macros"
                  noun="macro"
                />
              )}
              {selectedOfficeId != null && activeTab === "rx" && (
                <CatalogAssignmentTab
                  officeId={selectedOfficeId}
                  heading="RX"
                  subtitle="These are the Prescriptions the office uses."
                  icon={<Pill className="w-5 h-5 text-[#3A6EA5]" />}
                  resource={rxResource}
                  leftTitle="Available Prescriptions"
                  rightTitle="Assigned Prescriptions"
                  noun="prescription"
                />
              )}
              {selectedOfficeId != null && activeTab === "letters" && (
                <CatalogAssignmentTab
                  officeId={selectedOfficeId}
                  heading="Letters"
                  subtitle="These are the Letters the office uses."
                  icon={<Mail className="w-5 h-5 text-[#3A6EA5]" />}
                  resource={lettersResource}
                  leftTitle="Available Letters"
                  rightTitle="Assigned Letters"
                  noun="letter"
                />
              )}
              {activeTab === "ortho-misc" && (
                <TabNotAvailable
                  title="Ortho Misc Setup"
                  gap="gap #32"
                  reason="The backend has not built an Ortho Misc resource yet — its columns/requirements are still unknown (the legacy screen renders empty). It will be added once the field list is provided."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

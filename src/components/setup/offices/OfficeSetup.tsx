import { useEffect, useState, useMemo } from "react";
import { Building2, Search, Plus, Save, X, Construction } from "lucide-react";
import {
  listOffices,
  getOffice,
  listOperatories,
  createOffice,
  updateOffice,
  createOperatory,
  updateOperatory,
  deleteOperatory,
} from "@/api/generated/endpoints/organization/organization";
import type { OfficeForm, OperatoryUi } from "../../../data/officeData";
import type { OfficeRead, OfficeUpdate, OfficeCreate } from "@/api/generated/model";
import InfoTab from "./tabs/InfoTab";
import OperatoriesTab from "./tabs/OperatoriesTab";
import HolidaysTab from "./tabs/HolidaysTab";
import StatementTab from "./tabs/StatementTab";
import ScheduleTab from "./tabs/ScheduleTab";
import IntegrationTab from "./tabs/IntegrationTab";
import AdvancedTab from "./tabs/AdvancedTab";
import SmartAssistTab from "./tabs/SmartAssistTab";
import { accountSetupLookups } from "../../../services/accountSetupApi";
import type { LookupOption } from "../../../services/accountSetupTransform";

/**
 * Office → Holidays is a per-office replica of the Account Info Holidays screen.
 * The component (`tabs/HolidaysTab.tsx`) is built and ready, but the backend has
 * NO office-scoped holiday endpoints yet (gap #15 — holidays are tenant-scoped
 * only). This tab is now backed by the deployed office-holiday endpoints (gap
 * #15 resolved, 2026-06-01), so the flag below is `true`.
 */
const OFFICE_HOLIDAYS_BACKEND_READY = true;

/**
 * The Statement, Schedule, Integration, Advanced, and SmartAssist tabs are
 * per-office replicas of the production Office Setup screens. Each component is
 * built and ready (`tabs/StatementTab.tsx`, `ScheduleTab.tsx`, `IntegrationTab.tsx`,
 * `AdvancedTab.tsx`, `SmartAssistTab.tsx`) with a dedicated service file targeting
 * the *intended* office-scoped contract, but the backend has NO endpoints for them
 * yet (gaps #12, #14, #13, #16, #17 respectively — see backend_devreport.md). Keep
 * these tabs are now backed by the deployed office endpoints (gaps #12/#13/#14/#16/#17
 * resolved, 2026-06-01), so the flags below are `true`. Set a flag to `false` only
 * to hide a tab.
 */
const OFFICE_STATEMENT_BACKEND_READY = true;
const OFFICE_SCHEDULE_BACKEND_READY = true;
const OFFICE_INTEGRATION_BACKEND_READY = true;
const OFFICE_ADVANCED_BACKEND_READY = true;
const OFFICE_SMARTASSIST_BACKEND_READY = true;

/** Tabs with no backend endpoint yet — see backend_devreport.md #12–#17. */
function TabNotAvailable({ title, gap }: { title: string; gap: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-amber-600" />
      </div>
      <h3 className="text-lg font-bold text-[#1F3A5F] mb-2">{title} — not yet available</h3>
      <p className="text-sm text-[#64748B] max-w-md mb-3">
        This tab has no backend endpoint on the current API, so edits cannot be saved. It is gated to
        avoid silently dropping data.
      </p>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
        <Construction className="w-3 h-3" />
        Pending backend ({gap})
      </span>
      <p className="text-xs text-[#94A3B8] mt-4">
        Tracked in <code>backend_devreport.md</code> · analysis in{" "}
        <code>docs/setup/offices/OFFICES_INTEGRATION.md</code>
      </p>
    </div>
  );
}

type TabName =
  | "info"
  | "statement"
  | "integration"
  | "operatories"
  | "schedule"
  | "holidays"
  | "advanced"
  | "smartassist";

/** A single operatory row as held in the office form (snake_case). */
type OperatoryUI = OperatoryUi;

// utils/scheduleMapper.ts
// type DayName =
//   | "monday"
//   | "tuesday"
//   | "wednesday"
//   | "thursday"
//   | "friday"
//   | "saturday"
//   | "sunday";

// const DAYS: DayName[] = [
//   "monday",
//   "tuesday",
//   "wednesday",
//   "thursday",
//   "friday",
//   "saturday",
//   "sunday",
// ];

// export function mapBackendSchedule(schedule: any) {
//   const week = schedule?.week ?? {};

//   const result: any = {};

//   DAYS.forEach((day) => {
//     const d = week[day];

//     result[day] = {
//       start: d?.start ?? "",
//       end: d?.end ?? "",
//       lunchStart: d?.lunch_start ?? "",
//       lunchEnd: d?.lunch_end ?? "",
//       closed: d?.closed ?? false,
//     };
//   });

//   return result;
// }


// const [officeSetup, setOfficeSetup] = useState<OfficeSetupResponse | null>(null);
// const [loading, setLoading] = useState(true);

// utils/scheduleMapper.ts

/** Format an ISO timestamp for the list's Created/Updated columns. */
function fmtDateTime(value?: string | null): string {
  if (!value) return "";
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

export default function OfficeSetup() {
  // The list holds OfficeRead (snake_case) straight from the API — no camelCase mapping.
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<OfficeForm>>({});
  const [activeTab, setActiveTab] = useState<TabName>("info");
  const [mode, setMode] = useState<"view" | "add" | "edit">(
    "view",
  );
  const [showOfficeList, setShowOfficeList] = useState(true);
  // Snapshot of operatories as loaded from the backend, used to diff on save
  // (create new / update changed / delete removed).
  const [originalOperatories, setOriginalOperatories] = useState<OperatoryUI[]>([]);

  // Holiday Status/Type lookups for the (gated) office Holidays tab. Shared,
  // stable client-side values — same source the Account Info Holidays tab uses.
  const [holidayStatusOptions, setHolidayStatusOptions] = useState<LookupOption[]>([]);
  const [holidayTypeOptions, setHolidayTypeOptions] = useState<LookupOption[]>([]);


  /* -------------------- LOAD LIST -------------------- */
  useEffect(() => {
    listOffices({ size: 200 }).then((res) => {
      setOffices(res.items);
    });
    // Office IDs are server-assigned on create — no /next-id prefetch.

    // Holiday lookups for the (gated) Holidays tab.
    void Promise.all([
      accountSetupLookups.holidayStatuses(),
      accountSetupLookups.holidayTypes(),
    ]).then(([statuses, types]) => {
      setHolidayStatusOptions(statuses);
      setHolidayTypeOptions(types);
    });
  }, []);

  /* -------------------- FILTER -------------------- */
  const filteredOffices = useMemo(() => {
    const q = (searchQuery ?? "").toLowerCase();
  
    return offices.filter((o) =>
      (o.name ?? "").toLowerCase().includes(q) ||
      (o.short_id ?? "").toLowerCase().includes(q) ||
      String(o.id ?? "").includes(q)
    );
  }, [offices, searchQuery]);

  /* -------------------- SELECT OFFICE -------------------- */
  const handleSelectOffice = async (office: OfficeRead) => {
    // Core office record + operatories from the canonical resources. The other
    // tabs (statement/integration/schedule/holidays/advanced/smartassist)
    // self-fetch by office id, so the form only needs the core office + operatories.
    const oid = office.id;
    if (oid == null) {
      console.error("handleSelectOffice: office has no id", office);
      alert("This office record is missing an ID and can't be opened.");
      return;
    }

    let o: Awaited<ReturnType<typeof getOffice>>;
    let opsRes: Awaited<ReturnType<typeof listOperatories>> | null;
    try {
      [o, opsRes] = await Promise.all([
        getOffice(oid),
        listOperatories({ office_id: oid, size: 200 }).catch(() => null),
      ]);
    } catch (error: any) {
      console.error("Failed to load office:", error);
      alert(error?.response?.data?.detail || error?.message || "Failed to load office");
      return;
    }

    const loadedOperatories: OperatoryUI[] = (opsRes?.items ?? []).map((op, index) => ({
      id: String(op.id),
      name: op.name,
      display_order: op.display_order ?? index + 1,
      is_active: op.is_active ?? true,
      has_future_appointments: false,
      default_provider_id: undefined,
      default_provider_name: undefined,
    }));
    // Remember the loaded set so we can diff additions/edits/deletes on save.
    setOriginalOperatories(loadedOperatories);

    setFormData({
      id: o.id,
      office_code: o.office_code ?? null,
      name: o.name,
      short_id: o.short_id ?? null,

      // Address
      address_line1: o.address_line1 ?? null,
      address_line2: o.address_line2 ?? null,
      city: o.city ?? null,
      state: o.state ?? null,
      zip: o.zip ?? null,
      timezone: o.timezone ?? null,

      // Contact
      phone: o.phone ?? null,
      phone_2: o.phone_2 ?? null,
      phone_ext: o.phone_ext ?? null,
      fax: o.fax ?? null,
      email: o.email ?? null,

      // Scheduler
      slot_interval_minutes: o.slot_interval_minutes ?? null,
      schedule_start_hour: o.schedule_start_hour ?? null,
      schedule_end_hour: o.schedule_end_hour ?? null,

      // Billing / fee schedules (gap #11)
      tax_id: o.tax_id ?? null,
      billing_provider_id: o.billing_provider_id ?? null,
      use_billing_license: o.use_billing_license ?? false,
      office_group_id: o.office_group_id ?? null,
      opening_date: o.opening_date ?? null,
      default_fee_schedule_id: o.default_fee_schedule_id ?? null,
      default_ucr_fee_schedule_id: o.default_ucr_fee_schedule_id ?? null,

      is_active: o.is_active ?? true,

      // Operatories (composed from /operatories)
      operatories: loadedOperatories,

      // Audit (read-only; OfficeRead has no updated_by — gap #22)
      created_by: o.created_by ?? null,
      created_at: o.created_at ?? null,
      updated_at: o.updated_at ?? null,
    });

    setSelectedOfficeId(o.id);
    setMode("view");
    setActiveTab("info");
    setShowOfficeList(false);
  };




  /* -------------------- ADD OFFICE -------------------- */
const handleAddOffice = () => {
  // Office ID is assigned by the backend on create.
  setFormData({});
  setOriginalOperatories([]);
  setMode("add");
  setActiveTab("info");
  setShowOfficeList(false);
};

/* -------------------- SAVE -------------------- */



/** Build the backend Office body (snake_case) from the form — fields already match OfficeUpdate. */
const buildOfficeBody = (data: Partial<OfficeForm>): OfficeUpdate => ({
  office_code: data.office_code ?? data.short_id ?? null,
  name: data.name ?? null,
  short_id: data.short_id ?? null,
  address_line1: data.address_line1 ?? null,
  address_line2: data.address_line2 ?? null,
  city: data.city ?? null,
  state: data.state ?? null,
  zip: data.zip ?? null,
  phone: data.phone ?? null,
  phone_2: data.phone_2 ?? null,
  phone_ext: data.phone_ext ?? null,
  fax: data.fax ?? null,
  email: data.email ?? null,
  timezone: data.timezone ?? null,
  slot_interval_minutes: data.slot_interval_minutes ?? null,
  schedule_start_hour: data.schedule_start_hour ?? null,
  schedule_end_hour: data.schedule_end_hour ?? null,
  tax_id: data.tax_id ?? null,
  billing_provider_id: data.billing_provider_id ?? null,
  use_billing_license: data.use_billing_license ?? null,
  office_group_id: data.office_group_id ?? null,
  opening_date: data.opening_date ?? null,
  default_fee_schedule_id: data.default_fee_schedule_id ?? null,
  default_ucr_fee_schedule_id: data.default_ucr_fee_schedule_id ?? null,
  is_active: data.is_active ?? true,
});

/**
 * Persist operatory add/edit/delete by diffing the current form list against
 * the snapshot loaded from the backend. New rows carry a `temp-` id from the
 * Operatories tab; OperatoryCreate expects a client-supplied string id.
 */
const persistOperatories = async (officeId: number) => {
  const current = formData.operatories ?? [];
  const originalById = new Map(originalOperatories.map((op) => [op.id, op]));
  const currentIds = new Set(current.map((op) => op.id));

  // Deletes: in the original snapshot but no longer present.
  const deletions = originalOperatories
    .filter((op) => !currentIds.has(op.id))
    .map((op) => deleteOperatory(op.id));

  // Creates / updates.
  const upserts = current.map((op) => {
    const isNew = op.id.startsWith("temp-") || !originalById.has(op.id);
    if (isNew) {
      const id = op.id.startsWith("temp-") ? `op-${officeId}-${op.display_order}` : op.id;
      return createOperatory({
        id,
        office_id: officeId,
        name: op.name,
        display_order: op.display_order,
        is_active: op.is_active,
      });
    }
    const prev = originalById.get(op.id);
    const changed =
      !prev ||
      prev.name !== op.name ||
      prev.display_order !== op.display_order ||
      prev.is_active !== op.is_active;
    return changed
      ? updateOperatory(op.id, {
          name: op.name,
          display_order: op.display_order,
          is_active: op.is_active,
        })
      : Promise.resolve();
  });

  await Promise.all([...deletions, ...upserts]);
};


const handleSave = async () => {
  if (!formData.name || !formData.short_id) {
    alert("Office Name and Short ID are required");
    return;
  }

  const body = buildOfficeBody(formData);

  try {
    let officeId = selectedOfficeId;
    if (mode === "add") {
      // createOffice expects OfficeCreate (required fields); the form guarantees name/short_id.
      const created = await createOffice(body as unknown as OfficeCreate);
      officeId = created.id;
    } else if (selectedOfficeId != null) {
      // PATCH (backend update verb) via the generated client.
      await updateOffice(selectedOfficeId, body);
    }

    // Persist operatory add/edit/delete now that we have a concrete office id.
    if (officeId != null) {
      await persistOperatories(officeId);
    }

    // Refetch offices list after successful save.
    const officesRes = await listOffices({ size: 200 });
    setOffices(officesRes.items);

    alert("Office saved successfully");
    setShowOfficeList(true);
  } catch (error: unknown) {
    console.error("Error saving office:", error);
    const e = error as { response?: { data?: { detail?: string } }; message?: string };
    alert(e.response?.data?.detail || e.message || "Failed to save office");
  }
};


const updateFormData = (updates: Partial<OfficeForm>) =>
  setFormData((prev) => ({ ...prev, ...updates }));

const handleCancel = () => {
  setShowOfficeList(true);
  // setSelectedOffice(null);
  setFormData({});
  setMode("view");
};

const tabs: { id: TabName; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "statement", label: "Statement" },
  { id: "integration", label: "Integration" },
  { id: "operatories", label: "Operatories" },
  { id: "schedule", label: "Schedule" },
  { id: "holidays", label: "Holidays" },
  { id: "advanced", label: "Advanced" },
  { id: "smartassist", label: "SmartAssist" },
];


/* -------------------- JSX (UNCHANGED UI) -------------------- */
// ⬅️ Your existing JSX stays EXACTLY THE SAME

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1800px] mx-auto p-6">
        {showOfficeList ? (
          // Office List View
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            {/* Header */}
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">
                      Office Setup
                    </h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      Manage office locations and configurations
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAddOffice}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Office
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search offices..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value)
                  }
                  className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>

              {/* Office ID is assigned by the backend on save */}
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#E8F4FD] border border-[#B8D4EA] rounded text-xs">
                <span className="font-bold text-[#1F3A5F]">
                  Office ID will be assigned automatically on save
                </span>
              </div>
            </div>
            {/* <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1"> */}
            {/* Office Table */}
            <div className="max-h-[600px] overflow-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Office ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Office Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Short ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      City, State
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Status
                    </th>

                    {/* 🔐 AUDIT COLUMNS */}
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Created By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Created On
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Updated By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Updated On
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredOffices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-8 text-center"
                      >
                        <Building2 className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] font-bold text-sm">
                          No offices found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOffices.map((office) => (
                      <tr
                        key={office.id}
                        onClick={() =>
                          handleSelectOffice(office)
                        }
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {office.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {office.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-[#E8EFF7] text-[#1F3A5F] text-xs font-bold rounded">
                            {office.short_id}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {office.city}, {office.state}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {office.phone}
                        </td>
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
                        {/* Created By (OfficeRead.created_by is a user id; — when absent) */}
                        <td className="px-4 py-3 text-sm text-[#1E293B]">
                          {office.created_by != null ? String(office.created_by) : "System"}
                        </td>

                        {/* Created On */}
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {fmtDateTime(office.created_at) || "—"}
                        </td>

                        {/* Updated By — OfficeRead has no updated_by (gap #22) */}
                        <td className="px-4 py-3 text-sm text-[#1E293B]">
                          —
                        </td>

                        {/* Updated On */}
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {fmtDateTime(office.updated_at) || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Office Detail View with Tabs
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            {/* Header */}
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#64748B]" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">
                      {mode === "add"
                        ? "Add New Office"
                        : `Office: ${formData.name || "Loading..."}`}
                    </h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      {mode === "add" ? "Office ID: (assigned on save)" : `Office ID: ${formData.id ?? ""}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold transition-all text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save Office
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex overflow-x-auto gap-1">
                {tabs.map((tab) => (
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

            {/* Tab Content */}
            <div className="p-6 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-visible">
              {activeTab === "info" && (
                <InfoTab
                  formData={formData}
                  updateFormData={updateFormData}
                  mode={mode}
                />
              )}
              {activeTab === "statement" && (
                OFFICE_STATEMENT_BACKEND_READY && selectedOfficeId != null ? (
                  <StatementTab officeId={selectedOfficeId} />
                ) : (
                  <TabNotAvailable title="Statement" gap="gap #12" />
                )
              )}
              {activeTab === "integration" && (
                OFFICE_INTEGRATION_BACKEND_READY && selectedOfficeId != null ? (
                  <IntegrationTab officeId={selectedOfficeId} />
                ) : (
                  <TabNotAvailable title="Integration" gap="gap #13" />
                )
              )}
              {activeTab === "operatories" && (
                <OperatoriesTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "schedule" && (
                OFFICE_SCHEDULE_BACKEND_READY && selectedOfficeId != null ? (
                  <ScheduleTab officeId={selectedOfficeId} />
                ) : (
                  <TabNotAvailable title="Schedule" gap="gap #14" />
                )
              )}
              {activeTab === "holidays" && (
                OFFICE_HOLIDAYS_BACKEND_READY && selectedOfficeId != null ? (
                  <HolidaysTab
                    officeId={selectedOfficeId}
                    holidayStatusOptions={holidayStatusOptions}
                    holidayTypeOptions={holidayTypeOptions}
                  />
                ) : (
                  <TabNotAvailable title="Holidays" gap="gap #15" />
                )
              )}
              {activeTab === "advanced" && (
                OFFICE_ADVANCED_BACKEND_READY && selectedOfficeId != null ? (
                  <AdvancedTab officeId={selectedOfficeId} />
                ) : (
                  <TabNotAvailable title="Advanced" gap="gap #16" />
                )
              )}
              {activeTab === "smartassist" && (
                OFFICE_SMARTASSIST_BACKEND_READY && selectedOfficeId != null ? (
                  <SmartAssistTab officeId={selectedOfficeId} />
                ) : (
                  <TabNotAvailable title="SmartAssist" gap="gap #17" />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
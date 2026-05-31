import { useEffect, useState, useMemo } from "react";
import { Building2, Search, Plus, Save, X } from "lucide-react";
import {
  listOffices,
  getOffice,
  listOperatories,
  createOffice,
  updateOffice,
} from "@/api/generated/endpoints/organization/organization";
import type { Office, OfficeSetupApiResponse } from "../../../data/officeData"
import InfoTab from "./tabs/InfoTab";
import StatementTab from "./tabs/StatementTab";
import IntegrationTab from "./tabs/IntegrationTab";
import OperatoriesTab from "./tabs/OperatoriesTab";
import ScheduleTab from "./tabs/ScheduleTab";
import HolidaysTab from "./tabs/HolidaysTab";
import AdvancedTab from "./tabs/AdvancedTab";
import SmartAssistTab from "./tabs/SmartAssistTab";

type TabName =
  | "info"
  | "statement"
  | "integration"
  | "operatories"
  | "schedule"
  | "holidays"
  | "advanced"
  | "smartassist";

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

interface HolidayApi {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}


interface AdvancedApi {
  financial: {
    annual_finance_charge_percent: number;
    minimum_balance: number;
    minimum_finance_charge: number;
    days_before_finance_charge: number;
    sales_tax_percent: number;
  };
  scheduler: {
    end_date: string;
    default_appointment_duration: number;
  };
  insurance: {
    insurance_group?: string;
    eligibility_threshold_days: number;
    default_coverage_type: string;
  };
  defaults: {
    place_of_service: string;
    area_code: string;
    city: string;
    state: string;
    zip: string;
    preferred_provider_id?: string;
    is_ortho_office: boolean;
  };
  patient_checkin: {
    hipaa_notice: boolean;
    consent_form: boolean;
    additional_consent_form: boolean;
  };
  automation: {
    send_ecard: boolean;
    effective_date?: string;
  };
}


function mapAdvancedApiToUI(api: AdvancedApi) {
  return {
    annualFinanceChargePercent:
      api.financial.annual_finance_charge_percent,
    minimumBalance:
      api.financial.minimum_balance,
    minimumFinanceCharge:
      api.financial.minimum_finance_charge,
    daysBeforeFinanceCharge:
      api.financial.days_before_finance_charge,
    salesTaxPercent:
      api.financial.sales_tax_percent,

    insuranceGroup:
      api.insurance.insurance_group,
    eligibilityThresholdDays:
      api.insurance.eligibility_threshold_days,
    defaultCoverageType:
      api.insurance.default_coverage_type,

    schedulerEndDate:
      api.scheduler.end_date,
    defaultAppointmentDuration:
      api.scheduler.default_appointment_duration,

    defaultPlaceOfService:
      api.defaults.place_of_service,
    defaultAreaCode:
      api.defaults.area_code,
    defaultCity:
      api.defaults.city,
    defaultState:
      api.defaults.state,
    defaultZip:
      api.defaults.zip,
    preferredProvider:
      api.defaults.preferred_provider_id,
    isOrthoOffice:
      api.defaults.is_ortho_office,

    hipaaNotice:
      api.patient_checkin.hipaa_notice,
    consentForm:
      api.patient_checkin.consent_form,
    additionalConsentForm:
      api.patient_checkin.additional_consent_form,

    sendECard:
      api.automation.send_ecard,
    automatedCampaignsEffectiveDate:
      api.automation.effective_date,
  };
}


function mapHolidayApiToUI(apiHoliday: HolidayApi) {
  return {
    id: apiHoliday.id,
    name: apiHoliday.name,
    fromDate: apiHoliday.start_date,
    toDate: apiHoliday.end_date,
    is_active: apiHoliday.is_active,
  };
}


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

type DayName =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DAYS: DayName[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function mapBackendSchedule(schedule: any) {
  const result: Record<DayName, any> = {} as any;

  DAYS.forEach((day) => {
    const d = schedule?.[day];

    result[day] = {
      start: d?.start ?? "",
      end: d?.end ?? "",
      lunchStart: d?.lunchStart ?? "",
      lunchEnd: d?.lunchEnd ?? "",
      closed: d?.closed ?? false,
    };
  });

  return result;
}


export default function OfficeSetup() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Office>>({});
  const [activeTab, setActiveTab] = useState<TabName>("info");
  const [mode, setMode] = useState<"view" | "add" | "edit">(
    "view",
  );
  const [showOfficeList, setShowOfficeList] = useState(true);
  const [officeSetup, setOfficeSetup] = useState<OfficeSetupApiResponse | null>(null);
  const [loading, setLoading] = useState(true);


  /* -------------------- LOAD LIST -------------------- */
  useEffect(() => {
    listOffices({ size: 200 }).then((res) => {
      // Map API response to Office interface, handling both camelCase and snake_case
      const mappedOffices = res.items.map((office: any) => ({
        ...office,
        // Map audit fields from snake_case to camelCase if needed
        createdBy: office.createdBy || office.created_by || "System",
        createdAt: office.createdAt || office.created_at || office.createdDate || office.created_date || "",
        updatedBy: office.updatedBy || office.updated_by || office.modifiedBy || office.modified_by || "",
        updatedAt: office.updatedAt || office.updated_at || office.modifiedDate || office.modified_date || "",
      }));
      setOffices(mappedOffices);
    });
    // Office IDs are server-assigned on create — no /next-id prefetch.
  }, []);

  /* -------------------- FILTER -------------------- */
  const filteredOffices = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return offices.filter(
      (o) =>
        o.officeName.toLowerCase().includes(q) ||
        o.shortId.toLowerCase().includes(q) ||
        String(o.officeId).includes(q)
    );
  }, [offices, searchQuery]);

  /* -------------------- SELECT OFFICE -------------------- */
  // const handleSelectOffice = async (office: Office) => {
  //   const res = await api.get(`/api/v1/offices/${office.officeId}/setup`);
  //   setFormData({
  //     ...res.data.office,
  //     statementMessages: res.data.statement.statement_messages,
  //         statementSettings: {
  //     correspondenceName:
  //       res.data.statement.statement_settings.correspondence_name,
  //     statementName:
  //       res.data.statement.statement_settings.statement_name,
  //     statementAddress:
  //       res.data.statement.statement_settings.statement_address,
  //     statementPhone:
  //       res.data.statement.statement_settings.statement_phone,
  //     logoUrl:
  //       res.data.statement.statement_settings.logo_url,
  //     },
  //     acceptedCards: res.data.integration.acceptedCards,

  //     operatories: res.data.operatories,
  //     schedule: mapBackendSchedule(res.data.schedule),
  //     holidays: (res.data.holidays ?? []).map(mapHolidayApiToUI),
  //     advanced: mapAdvancedApiToUI(res.data.advanced),
  //     smartAssist: res.data.smartAssist,
  //     ...res.data.integration,
  //   });

  //   setSelectedOfficeId(office.officeId);
  //   setMode("view");
  //   setActiveTab("info");
  //   setShowOfficeList(false);
  // };

  const handleSelectOffice = async (office: Office) => {
    // Core office record + operatories from the canonical resources.
    // The legacy /offices/{id}/setup aggregate (statements, integrations,
    // smartAssist, advanced, holidays, schedule grid) has no backend equivalent
    // here — those tabs default to empty until the backend models them.
    const oid = office.officeId as number;
    const [o, opsRes] = await Promise.all([
      getOffice(oid),
      listOperatories({ office_id: oid, size: 200 }).catch(() => null),
    ]);

    setFormData({
      officeId: o.id,
      officeName: o.name,
      shortId: o.short_id ?? "",

      // Address
      address1: o.address_line1 ?? "",
      address2: o.address_line2 ?? "",
      city: o.city ?? "",
      state: o.state ?? "",
      zip: o.zip ?? "",
      timeZone: o.timezone ?? "",

      // Contact
      phone1: o.phone ?? "",
      email: o.email ?? "",

      // Settings
      schedulerTimeInterval: o.slot_interval_minutes ?? null,
      isActive: o.is_active ?? true,

      // Operatories (composed from /operatories)
      operatories: (opsRes?.items ?? []).map((op, index) => ({
        id: String(op.id),
        name: op.name,
        order: op.display_order ?? index + 1,
        is_active: op.is_active ?? true,
        has_future_appointments: false,
        defaultProviderId: undefined,
        defaultProviderName: undefined,
      })),

      // Tabs without a backend source (yet) — default empty.
      schedule: mapBackendSchedule(undefined),
      holidays: [],
      advanced: {} as Office["advanced"],
      smartAssist: {} as Office["smartAssist"],
      statementMessages: undefined,
      statementSettings: undefined,
      integrations: {
        eClaims: {},
        transworld: {},
        imaging: {},
        textMessaging: {},
        patientUrls: {},
        acceptedCards: [],
      },

      // Audit
      createdBy: o.created_by != null ? String(o.created_by) : "",
      createdDate: o.created_at ?? "",
      modifiedBy: "",
      modifiedDate: o.updated_at ?? "",
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
  setMode("add");
  setActiveTab("info");
  setShowOfficeList(false);
};

/* -------------------- SAVE -------------------- */
// const handleSave = async () => {
//   if (!formData.officeName || !formData.shortId) {
//     alert("Office Name and Short ID are required");
//     return;
//   }

//   if (mode === "add") {
//     await api.post("/api/v1/offices", formData);
//   } else {
//     await api.put(`/api/v1/offices/${selectedOfficeId}`, formData);
//   }

//   alert("Office saved successfully");
//   setShowOfficeList(true);
// };



/** Map the form's core fields to the backend Office body (snake_case). */
const buildOfficeBody = (formData: any) => ({
  office_code: formData.shortId,
  name: formData.officeName,
  short_id: formData.shortId ?? null,
  address_line1: formData.address1 ?? null,
  address_line2: formData.address2 ?? null,
  city: formData.city ?? null,
  state: formData.state ?? null,
  zip: formData.zip ?? null,
  phone: formData.phone1 ?? null,
  email: formData.email ?? null,
  timezone: formData.timeZone ?? null,
  slot_interval_minutes: formData.schedulerTimeInterval ?? null,
  is_active: formData.isActive ?? true,
});


const handleSave = async () => {
  if (!formData.officeName || !formData.shortId) {
    alert("Office Name and Short ID are required");
    return;
  }

  const body = buildOfficeBody(formData);

  try {
    if (mode === "add") {
      await createOffice(body as any);
    } else if (selectedOfficeId != null) {
      // PATCH (backend update verb) via the generated client.
      await updateOffice(selectedOfficeId, body as any);
    }

    // Refetch offices list after successful save.
    const officesRes = await listOffices({ size: 200 });

    // Map API response to Office interface, handling both camelCase and snake_case
    const mappedOffices = officesRes.items.map((office: any) => ({
      ...office,
      // Map audit fields from snake_case to camelCase if needed
      createdBy: office.createdBy || office.created_by || "System",
      createdAt: office.createdAt || office.created_at || office.createdDate || office.created_date || "",
      updatedBy: office.updatedBy || office.updated_by || office.modifiedBy || office.modified_by || "",
      updatedAt: office.updatedAt || office.updated_at || office.modifiedDate || office.modified_date || "",
    }));

    setOffices(mappedOffices);

    alert("Office saved successfully");
    setShowOfficeList(true);
  } catch (error: any) {
    console.error("Error saving office:", error);
    alert(error.response?.data?.detail || error.message || "Failed to save office");
  }
};


const updateFormData = (updates: Partial<Office>) =>
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
                          {office.officeId}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {office.officeName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-[#E8EFF7] text-[#1F3A5F] text-xs font-bold rounded">
                            {office.shortId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {office.city}, {office.state}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {office.phone1}
                        </td>
                        <td className="px-4 py-3">
                          {office.isActive ? (
                            <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                        {/* Created By */}
                        <td className="px-4 py-3 text-sm text-[#1E293B]">
                          {office.createdBy || "System"}
                        </td>

                        {/* Created On */}
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {office.createdDate || "—"}
                        </td>

                        {/* Updated By */}
                        <td className="px-4 py-3 text-sm text-[#1E293B]">
                          {(office as any).updatedBy || "—"}
                        </td>

                        {/* Updated On */}
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {(office as any).updatedAt || "—"}
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
                        : `Office: ${formData.officeName || "Loading..."}`}
                    </h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      {mode === "add"
                        ? `Office ID: ${formData.officeId}`
                        : `Office ID: ${formData.officeId}`}
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
                <StatementTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "integration" && (
                <IntegrationTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "operatories" && (
                <OperatoriesTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "schedule" && (
                <ScheduleTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "holidays" && (
                <HolidaysTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "advanced" && (
                <AdvancedTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "smartassist" && (
                <SmartAssistTab
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useMemo } from "react";
import { Building2, Search, Plus, Save, X } from "lucide-react";
import { mockOffices, getNextOfficeId, type Office } from "../../../data/officeData";

// Import tab components
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

export default function OfficeSetup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("info");
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [showOfficeList, setShowOfficeList] = useState(true);
  const [formData, setFormData] = useState<Partial<Office>>({});

  // Filter offices
  const filteredOffices = useMemo(() => {
    let filtered = mockOffices.filter((office) => {
      const query = searchQuery.toLowerCase();
      return (
        office.officeName.toLowerCase().includes(query) ||
        office.shortId.toLowerCase().includes(query) ||
        office.officeId.toString().includes(query)
      );
    });

    filtered.sort((a, b) => a.officeName.localeCompare(b.officeName));
    return filtered;
  }, [searchQuery]);

  const handleSelectOffice = (office: Office) => {
    setSelectedOffice(office);
    setFormData(office);
    setMode("view");
    setActiveTab("info");
    setShowOfficeList(false);
  };

  const handleAddOffice = () => {
    const newOfficeTemplate: Partial<Office> = {
      officeId: getNextOfficeId(),
      officeName: "",
      shortId: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      timeZone: "America/Los_Angeles",
      phone1: "",
      phone1Ext: "",
      email: "",
      billingProviderId: "",
      billingProviderName: "",
      useBillingLicense: true,
      taxId: "",
      openingDate: new Date().toISOString().split("T")[0],
      defaultUCRFeeSchedule: "",
      defaultFeeSchedule: "",
      schedulerTimeInterval: 10,
      statementMessages: {
        general: "",
        current: "",
        day30: "",
        day60: "",
        day90: "",
        day120: "",
      },
      correspondenceName: "",
      statementName: "",
      statementAddress: "",
      statementPhone: "",
      acceptedCards: ["Visa", "Mastercard"],
      operatories: [],
      schedule: {
        monday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
        tuesday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
        wednesday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
        thursday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
        friday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
        saturday: { start: "", end: "", lunchStart: "", lunchEnd: "", closed: true },
        sunday: { start: "", end: "", lunchStart: "", lunchEnd: "", closed: true },
      },
      holidays: [],
      advanced: {
        annualFinanceChargePercent: 18.0,
        minimumBalance: 50.0,
        minimumFinanceCharge: 2.0,
        daysBeforeFinanceCharge: 30,
        salesTaxPercent: 0,
        schedulerEndDate: "",
        eligibilityThresholdDays: 30,
        sendECard: false,
        defaultPlaceOfService: "Office",
        defaultAppointmentDuration: 60,
        defaultAreaCode: "",
        defaultCity: "",
        defaultState: "",
        defaultZip: "",
        defaultCoverageType: "PPO",
        isOrthoOffice: false,
        hipaaNotice: true,
        consentForm: true,
        additionalConsentForm: false,
      },
      smartAssist: {
        enabled: false,
        items: {
          payment: { enabled: false, frequency: "Every Visit", includeBal: false },
          email: { enabled: false, frequency: "Every Year" },
          cellPhone: { enabled: false, frequency: "Every Year" },
          eligibility: { enabled: false, frequency: "Every Visit" },
          medicalHistory: { enabled: false, frequency: "Every Year" },
          hipaa: { enabled: false, frequency: "Every Year" },
          consentForm1: { enabled: false, frequency: "Every Visit" },
          consentForm2: { enabled: false, frequency: "Every Visit" },
          consentForm3: { enabled: false, frequency: "Every Visit" },
          consentForm4: { enabled: false, frequency: "Every Visit" },
          progressNotes: { enabled: false, frequency: "Every Visit" },
          ledgerPosting: { enabled: false, frequency: "Every Visit" },
        },
      },
      isActive: true,
    };

    setSelectedOffice(null);
    setFormData(newOfficeTemplate);
    setMode("add");
    setActiveTab("info");
    setShowOfficeList(false);
  };

  const handleSave = () => {
    // Validation
    if (!formData.officeName || !formData.shortId) {
      alert("Office Name and Short ID are required");
      return;
    }
    if (!formData.billingProviderId) {
      alert("Billing Provider is required");
      return;
    }
    if (!formData.timeZone) {
      alert("Time Zone is required");
      return;
    }

    console.log("Saving office:", formData);
    alert(`Office ${mode === "add" ? "created" : "updated"} successfully!`);
    setShowOfficeList(true);
    setMode("view");
  };

  const handleCancel = () => {
    setShowOfficeList(true);
    setSelectedOffice(null);
    setFormData({});
    setMode("view");
  };

  const updateFormData = (updates: Partial<Office>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const nextOfficeId = getNextOfficeId();

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
                    <h1 className="text-xl font-bold text-[#1F3A5F]">Office Setup</h1>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>

              {/* Next Available ID */}
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#E8F4FD] border border-[#B8D4EA] rounded text-xs">
                <span className="font-bold text-[#1F3A5F]">
                  Next Available Office ID: {nextOfficeId}
                </span>
              </div>
            </div>

            {/* Office Table */}
            <div className="overflow-x-auto">
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
                     <td colSpan={10} className="px-4 py-8 text-center">
                        <Building2 className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] font-bold text-sm">No offices found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOffices.map((office) => (
                      <tr
                        key={office.id}
                        onClick={() => handleSelectOffice(office)}
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
                          {office.createdAt || "—"}
                        </td>

                        {/* Updated By */}
                        <td className="px-4 py-3 text-sm text-[#1E293B]">
                          {office.updatedBy || "—"}
                        </td>

                        {/* Updated On */}
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {office.updatedAt || "—"}
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
                <InfoTab formData={formData} updateFormData={updateFormData} mode={mode} />
              )}
              {activeTab === "statement" && (
                <StatementTab formData={formData} updateFormData={updateFormData} />
              )}
              {activeTab === "integration" && (
                <IntegrationTab formData={formData} updateFormData={updateFormData} />
              )}
              {activeTab === "operatories" && (
                <OperatoriesTab formData={formData} updateFormData={updateFormData} />
              )}
              {activeTab === "schedule" && (
                <ScheduleTab formData={formData} updateFormData={updateFormData} />
              )}
              {activeTab === "holidays" && (
                <HolidaysTab formData={formData} updateFormData={updateFormData} />
              )}
              {activeTab === "advanced" && (
                <AdvancedTab formData={formData} updateFormData={updateFormData} />
              )}
              {activeTab === "smartassist" && (
                <SmartAssistTab formData={formData} updateFormData={updateFormData} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
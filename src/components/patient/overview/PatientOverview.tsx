import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Edit2,
  Archive,
  Plus,
  Eye,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import EditPatientModal from "../../modals/EditPatientModal";
import PatientHeader from "./PatientHeader";
import PatientDetailsGrid from "./PatientDetailsGrid";
import ResponsiblePartyCard from "./ResponsiblePartyCard";
import InsuranceCard from "./InsuranceCard";
import AccountMembersTable from "./AccountMembersTable";
import AppointmentsTable from "./AppointmentsTable";
import RecallsTable from "./RecallsTable";
import BalancesTab from "./BalancesTab";
import ContractsTab from "./ContractsTab";
import { getPatientDetails, type PatientDetails as ApiPatientDetails } from "../../../services/patientApi";
import {
  mapPatientToViewModel,
  mapResponsibleParty,
} from "./utils";
import { useAuth } from "../../../contexts/AuthContext";
import { useListPatientRecalls } from "@/api/generated/endpoints/patients/patients";
import { useGetPatientBalance } from "@/api/generated/endpoints/billing/billing";
import { useListAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { useListOffices } from "@/api/generated/endpoints/organization/organization";
import type { PatientBalance, AppointmentRead, PatientRecallRead } from "@/api/generated/model";

// MM/DD/YYYY or em dash.
const fmtDate = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
};

// Format a signed currency amount; negatives shown as ($X.XX).
const money = (value?: number | null): string => {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value).toFixed(2);
  return value < 0 ? `($${abs})` : `$${abs}`;
};

type TabType = "summary" | "balances" | "contracts";

export default function PatientOverview() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentOffice } = useAuth();

  const numericId = patientId ? Number(patientId) : NaN;
  const validId = Number.isFinite(numericId);

  // Real account/clinical data composed from canonical resources. These share
  // React Query cache keys with PatientShellLayout, so no duplicate requests.
  const balanceQuery = useGetPatientBalance(numericId, { query: { enabled: validId } });
  const appointmentsQuery = useListAppointments(
    { patient_id: numericId, size: 50 },
    { query: { enabled: validId } },
  );
  const recallsQuery = useListPatientRecalls(
    { patient_id: numericId, size: 50 },
    { query: { enabled: validId } },
  );
  const officesQuery = useListOffices({ size: 200 });
  const officeName = (id?: number | null): string => {
    if (id == null) return "—";
    return officesQuery.data?.items.find((o) => o.id === id)?.name ?? `Office ${id}`;
  };

  const [patientDetails, setPatientDetails] = useState<ApiPatientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showEditResponsible, setShowEditResponsible] = useState(false);

  // Fetch patient details from API
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) {
        setError("Patient ID is required");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const details = await getPatientDetails(patientId);
        setPatientDetails(details);
      } catch (err: any) {
        console.error("Error fetching patient details:", err);
        const errorMessage = err.response?.data?.detail || err.message || "Failed to load patient details";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

  const handleRefresh = async () => {
    if (!patientId) return;
    
    setRefreshing(true);
    setError(null);

    try {
      const details = await getPatientDetails(patientId);
      setPatientDetails(details);
      // Refresh the composed account/clinical data alongside demographics.
      balanceQuery.refetch();
      appointmentsQuery.refetch();
      recallsQuery.refetch();
    } catch (err: any) {
      console.error("Error refreshing patient details:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to refresh patient details";
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  // EditPatientModal persists the update itself (updatePatientFull); on save we
  // just reload the overview's data.
  const handleSavePatient = () => {
    handleRefresh();
  };

  /** ✅ Add Member placeholder (REAL PMS behavior) */
  const handleAddMember = () => {
    alert("Add New Account Member – future implementation");
  };

  /** ✅ Insurance status click placeholder (REAL PMS behavior) */
  const handleInsuranceStatusClick = (
    type: "primary" | "secondary",
  ) => {
    alert(
      `${
        type === "primary" ? "Primary" : "Secondary"
      } insurance status – future implementation`,
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin" />
          <div className="text-[#64748B] text-lg">
            Loading patient data...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !patientDetails) {
    return (
      <div className="p-4 bg-[#F7F9FC] flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-md border-2 border-red-200 p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-600">Error Loading Patient</h3>
          </div>
          <p className="text-[#64748B] mb-4">{error || "Patient not found"}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-semibold text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Helper function to safely convert balance values (handles both string and number)
  const safeToFixed = (value: string | number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined) return "0.00";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
  };

  // Map API response to view model format
  const patientData = mapPatientToViewModel(patientDetails);
  const responsibleParty = mapResponsibleParty(patientDetails);
  
  // Extract data from API response
  const defaultInsurancePlan = {
    carrierName: "",
    groupNumber: "",
    carrierPhone: "",
    subscriber: "",
    indMaxRemain: "$0.00",
    indDedRemain: "$0.00",
  };
  
  const dentalInsurance = {
    primary: patientDetails.insurance?.primary_dental ? {
      carrierName: patientDetails.insurance.primary_dental.carrier_name || "",
      groupNumber: patientDetails.insurance.primary_dental.group_number || "",
      carrierPhone: patientDetails.insurance.primary_dental.carrier_phone || "",
      subscriber: patientDetails.insurance.primary_dental.subscriber_name || "",
      indMaxRemain: `$${safeToFixed(patientDetails.insurance.primary_dental.individual_max_remaining)}`,
      indDedRemain: `$${safeToFixed(patientDetails.insurance.primary_dental.individual_deductible_remaining)}`,
    } : defaultInsurancePlan,
    secondary: patientDetails.insurance?.secondary_dental ? {
      carrierName: patientDetails.insurance.secondary_dental.carrier_name || "",
      groupNumber: patientDetails.insurance.secondary_dental.group_number || "",
      carrierPhone: patientDetails.insurance.secondary_dental.carrier_phone || "",
      subscriber: patientDetails.insurance.secondary_dental.subscriber_name || "",
      indMaxRemain: `$${safeToFixed(patientDetails.insurance.secondary_dental.individual_max_remaining)}`,
      indDedRemain: `$${safeToFixed(patientDetails.insurance.secondary_dental.individual_deductible_remaining)}`,
    } : null,
  };
  
  const accountMembers = patientDetails.account_members?.map(member => ({
    name: member.name,
    age: member.age,
    sex: member.gender,
    nextVisit: member.next_visit ? new Date(member.next_visit).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "-",
    recall: member.recall || "-",
    lastVisit: member.last_visit ? new Date(member.last_visit).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "-",
    active: member.is_active ? "Yes" : "No",
  })) || [];
  
  // Appointments from /appointments (real). Per-appointment aging has no backend
  // source (aging is account-level), so those columns show em dashes, not $0.00.
  const appointments = (appointmentsQuery.data?.items ?? [])
    .slice()
    .sort((a: AppointmentRead, b: AppointmentRead) => b.date.localeCompare(a.date))
    .map((apt: AppointmentRead) => ({
      date: fmtDate(apt.date),
      time: apt.start_time ?? "—",
      office: officeName(apt.office_id),
      operator: apt.procedure_label || "—",
      provider: apt.provider_id || "—",
      duration: String(apt.duration ?? ""),
      status: apt.status,
      lastUpdated: fmtDate(apt.updated_at),
      member: patientData.name,
      current: "—",
      over30: "—",
      over60: "—",
      over90: "—",
      over120: "—",
      balance: "—",
      estPat: "—",
      estIns: "—",
    }));

  // Recalls from /patient-recalls (real).
  const recalls = (recallsQuery.data?.items ?? []).map((recall: PatientRecallRead) => ({
    code: recall.procedure_code || recall.recall_type || "—",
    age: recall.interval_months != null ? `${recall.interval_months} mo` : "—",
    nextDate: fmtDate(recall.due_date),
    freq: recall.recall_type || "—",
  }));

  // Balance from /patients/{id}/balance (real). PatientBalance has no per-day
  // charges or payment amounts (only recent-activity dates), so those show em
  // dashes — see docs/patients/patients_backend_devreport.md.
  const bal: PatientBalance | undefined = balanceQuery.data;
  const balanceData = {
    accountBalance: money(bal?.account_balance ?? bal?.balance),
    todayCharges: "—",
    todayEstInsurance: money(bal?.estimated_insurance),
    todayEstPatient: money(bal?.estimated_patient),
    lastInsPayment: "—",
    lastInsPaymentDate: fmtDate(bal?.recent_activity?.last_ins),
    lastPatPayment: "—",
    lastPatPaymentDate: fmtDate(bal?.recent_activity?.last_pat),
  };

  return (
    <div className="p-4 bg-[#F7F9FC]">
      {/* Refresh Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-white text-[#1F3A5F] border-2 border-[#E2E8F0] rounded-lg hover:bg-[#F7F9FC] transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Patient Information */}
        <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
          <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
            <h2 className="text-white font-bold uppercase tracking-wide text-sm">
              PATIENT INFORMATION
            </h2>
            <button
              onClick={() => setShowEditPatient(true)}
              className="px-3 py-1.5 bg-white text-[#1F3A5F] border-2 border-white rounded hover:bg-[#F7F9FC] transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" />
              EDIT
            </button>
          </div>
          <div className="p-4">
            <PatientHeader patient={patientData} />
            <PatientDetailsGrid patient={patientData} />
          </div>
        </div>

        {/* Responsible Party + Insurance */}
        <div className="space-y-4">
          <ResponsiblePartyCard
            responsibleParty={responsibleParty}
            onEdit={() => setShowEditResponsible(true)}
          />
          <InsuranceCard
            dentalInsurance={dentalInsurance}
            showMedical={true}
            onInsuranceStatusClick={handleInsuranceStatusClick}
          />
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <div className="min-w-[900px]">
          <AccountMembersTable 
            members={accountMembers} 
            onAddMember={handleAddMember}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0] overflow-hidden">
        <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC] overflow-x-auto">
          <div className="flex gap-0 px-4 min-w-max">
            {["summary", "balances", "contracts"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={`px-5 py-2.5 font-bold text-sm uppercase tracking-wide border-b-4 ${
                  activeTab === tab
                    ? "border-[#3A6EA5] text-[#3A6EA5] bg-white"
                    : "border-transparent text-[#64748B]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {activeTab === "summary" && (
            <>
              <AppointmentsTable appointments={appointments} />
              <RecallsTable recalls={recalls} />
            </>
          )}
          {activeTab === "balances" && (
            <BalancesTab
              balanceData={balanceData}
              accountMembers={accountMembers}
            />
          )}
          {activeTab === "contracts" && <ContractsTab />}
        </div>
      </div>

      <EditPatientModal
        isOpen={showEditPatient}
        onClose={() => setShowEditPatient(false)}
        onSave={handleSavePatient}
        patientId={patientId ? parseInt(patientId, 10) : 0}
        currentOffice={currentOffice || ""}
      />
    </div>
  );
}
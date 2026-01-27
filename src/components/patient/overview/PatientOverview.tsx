import { useState, useEffect } from "react";
import { useOutletContext, useParams } from "react-router-dom";
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

type TabType = "summary" | "balances" | "contracts";

export default function PatientOverview() {
  const { patientId } = useParams<{ patientId: string }>();
  const outlet = useOutletContext<{ patient?: any }>();
  const { currentOffice } = useAuth();
  
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
    } catch (err: any) {
      console.error("Error refreshing patient details:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to refresh patient details";
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSavePatient = (data: any) => {
    console.log("Saving patient data:", data);
    // TODO: Call update patient API
    // After successful update, refresh patient details
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
  
  const appointments = patientDetails.appointments?.map(apt => ({
    date: new Date(apt.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    time: apt.time,
    office: apt.office,
    operator: apt.procedure,
    provider: apt.provider,
    duration: apt.duration.toString(),
    status: apt.status,
    lastUpdated: apt.last_updated,
    member: apt.member,
    current: "$0.00", // Not in API response
    over30: "$0.00",
    over60: "$0.00",
    over90: "$0.00",
    over120: "$0.00",
    balance: "$0.00",
    estPat: "$0.00",
    estIns: "$0.00",
  })) || [];
  
  const recalls = patientDetails.recalls?.map(recall => ({
    code: recall.code,
    age: recall.age_range,
    nextDate: new Date(recall.next_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    freq: recall.frequency,
  })) || [];

  const balanceData = patientDetails.balances ? {
    accountBalance: `$${safeToFixed(patientDetails.balances.account_balance)}`,
    todayCharges: `$${safeToFixed(patientDetails.balances.today_charges)}`,
    todayEstInsurance: `$${safeToFixed(patientDetails.balances.today_est_insurance)}`,
    todayEstPatient: `$${safeToFixed(patientDetails.balances.today_est_patient)}`,
    lastInsPayment: `$${safeToFixed(patientDetails.balances.last_insurance_payment)}`,
    lastInsPaymentDate: patientDetails.balances.last_insurance_payment_date ? new Date(patientDetails.balances.last_insurance_payment_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "",
    lastPatPayment: `$${safeToFixed(patientDetails.balances.last_patient_payment)}`,
    lastPatPaymentDate: patientDetails.balances.last_patient_payment_date ? new Date(patientDetails.balances.last_patient_payment_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "",
  } : {
    accountBalance: "$0.00",
    todayCharges: "$0.00",
    todayEstInsurance: "$0.00",
    todayEstPatient: "$0.00",
    lastInsPayment: "$0.00",
    lastInsPaymentDate: "",
    lastPatPayment: "$0.00",
    lastPatPaymentDate: "",
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
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Edit2,
  Archive,
  Plus,
  Eye,
  DollarSign,
  FileText,
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
import {
  mapPatientToViewModel,
  mapResponsibleParty,
  getMockDentalInsurance,
  getMockAccountMembers,
  getMockAppointments,
  getMockRecalls,
  getMockBalanceData,
} from "./utils";

type TabType = "summary" | "balances" | "contracts";

export default function PatientOverview() {
  const outlet = useOutletContext<{ patient?: any }>();
  const patient = outlet?.patient;

  const [activeTab, setActiveTab] =
    useState<TabType>("summary");
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showEditResponsible, setShowEditResponsible] =
    useState(false);

  const handleSavePatient = (data: any) => {
    console.log("Saving patient data:", data);
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

  if (!patient) {
    return (
      <div className="p-4 bg-[#F7F9FC] flex items-center justify-center min-h-screen">
        <div className="text-[#64748B] text-lg">
          Loading patient data...
        </div>
      </div>
    );
  }

  const patientData = mapPatientToViewModel(patient);
  const responsibleParty = mapResponsibleParty(patient);
  const dentalInsurance = getMockDentalInsurance();
  const accountMembers = getMockAccountMembers();
  const appointments = getMockAppointments();
  const recalls = getMockRecalls();
  const balanceData = getMockBalanceData();

  return (
    <div className="p-4 bg-[#F7F9FC]">
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
        patientData={patientData}
      />
    </div>
  );
}
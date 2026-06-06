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
import { useListPatientRecalls, useListPatientInsurance } from "@/api/generated/endpoints/patients/patients";
import { useGetPatientBalance } from "@/api/generated/endpoints/billing/billing";
import { useListAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { useListOffices } from "@/api/generated/endpoints/organization/organization";
import {
  getInsurancePlan,
  getInsuranceCarrier,
  getInsuranceSubscriber,
} from "@/api/generated/endpoints/insurance/insurance";
import type {
  PatientBalance,
  AppointmentRead,
  PatientRecallRead,
  PatientInsuranceRead,
  InsurancePlanRead,
  InsuranceCarrierRead,
  InsuranceSubscriberRead,
} from "@/api/generated/model";
import type { DentalInsurance, InsurancePlan } from "./types";

// Format a money string (e.g. "1500.0000") for display.
const fmtMoney = (s?: string | null): string => {
  if (s == null) return "—";
  const n = parseFloat(s);
  return Number.isNaN(n) ? "—" : `$${n.toFixed(2)}`;
};

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

  // Patient insurance is a thin link record; resolve plan -> carrier and the
  // subscriber to display carrier/group/phone/subscriber. Plans/carriers/
  // subscribers are reference tables fetched once and mapped by id (size 200 cap).
  const insuranceQuery = useListPatientInsurance(
    { patient_id: numericId, size: 50 },
    { query: { enabled: validId } },
  );

  // Resolve plan/carrier/subscriber by id. The reference tables are large, so a
  // size-capped list won't contain the needed ids — fetch each by id when the
  // patient's (few) insurance records load.
  const [insMaps, setInsMaps] = useState<{
    plans: Record<number, InsurancePlanRead>;
    carriers: Record<number, InsuranceCarrierRead>;
    subscribers: Record<number, InsuranceSubscriberRead>;
  }>({ plans: {}, carriers: {}, subscribers: {} });

  useEffect(() => {
    const recs = insuranceQuery.data?.items ?? [];
    if (recs.length === 0) {
      setInsMaps({ plans: {}, carriers: {}, subscribers: {} });
      return;
    }
    let cancelled = false;
    (async () => {
      const planIds = [...new Set(recs.map((r) => r.ins_plan_id).filter((x): x is number => x != null))];
      const subIds = [...new Set(recs.map((r) => r.subscriber_id).filter((x): x is number => x != null))];

      const plans: Record<number, InsurancePlanRead> = {};
      (await Promise.all(planIds.map((id) => getInsurancePlan(id).catch(() => null)))).forEach((p) => {
        if (p) plans[p.id] = p;
      });

      const carrierIds = [
        ...new Set(Object.values(plans).map((p) => p.carrier_id).filter((x): x is number => x != null)),
      ];
      const carriers: Record<number, InsuranceCarrierRead> = {};
      (await Promise.all(carrierIds.map((id) => getInsuranceCarrier(id).catch(() => null)))).forEach((c) => {
        if (c) carriers[c.id] = c;
      });

      const subscribers: Record<number, InsuranceSubscriberRead> = {};
      (await Promise.all(subIds.map((id) => getInsuranceSubscriber(id).catch(() => null)))).forEach((s) => {
        if (s) subscribers[s.id] = s;
      });

      if (!cancelled) setInsMaps({ plans, carriers, subscribers });
    })();
    return () => {
      cancelled = true;
    };
  }, [insuranceQuery.data]);
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

  // Map API response to view model format
  const patientData = mapPatientToViewModel(patientDetails);
  const responsibleParty = mapResponsibleParty(patientDetails);
  
  // Resolve patient insurance link records -> plan -> carrier (+ subscriber).
  // Remaining amounts live on the link record; carrier/group/phone/subscriber
  // are resolved from the plan/carrier/subscriber reference tables by id.
  const buildInsurancePlan = (rec: PatientInsuranceRead): InsurancePlan => {
    const plan = rec.ins_plan_id != null ? insMaps.plans[rec.ins_plan_id] : undefined;
    const carrier = plan?.carrier_id != null ? insMaps.carriers[plan.carrier_id] : undefined;
    const sub = rec.subscriber_id != null ? insMaps.subscribers[rec.subscriber_id] : undefined;
    return {
      carrierName: carrier?.name ?? "",
      groupNumber: plan?.group_number ?? sub?.group_number ?? "",
      carrierPhone: carrier?.phone ?? "",
      subscriber: sub ? [sub.sub_last_name, sub.sub_first_name].filter(Boolean).join(", ") : "",
      indMaxRemain: fmtMoney(rec.max_remaining),
      indDedRemain: fmtMoney(rec.deductible_remaining),
    };
  };

  // Category (dental/medical) is `legacy_plan_type` ("D"/"M"); the order
  // (primary/secondary) is the `insurance_type` field.
  const activeInsurance = (insuranceQuery.data?.items ?? []).filter((r) => r.is_active);
  const category = (r: PatientInsuranceRead) => (r.legacy_plan_type ?? "").trim().toUpperCase();
  const dentalRecs = activeInsurance.filter((r) => category(r).startsWith("D"));
  const medicalRecs = activeInsurance.filter((r) => category(r).startsWith("M"));

  const orderOf = (r: PatientInsuranceRead) => (r.insurance_type ?? "").trim().toLowerCase();
  const planFor = (
    recs: PatientInsuranceRead[],
    order: string,
    fallbackIdx: number,
  ): InsurancePlan | null => {
    const rec = recs.find((r) => orderOf(r) === order) ?? recs[fallbackIdx];
    return rec ? buildInsurancePlan(rec) : null;
  };

  const dentalInsurance: DentalInsurance = {
    primary: planFor(dentalRecs, "primary", 0),
    secondary: planFor(dentalRecs, "secondary", 1),
  };
  const medicalInsurance: DentalInsurance = {
    primary: planFor(medicalRecs, "primary", 0),
    secondary: planFor(medicalRecs, "secondary", 1),
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
            medicalInsurance={medicalInsurance}
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
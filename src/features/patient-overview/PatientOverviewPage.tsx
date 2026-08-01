// Patient Overview — legacy Denticon "Patient Overview" screen.
//
// Layout mirrors the legacy screen: a title bar carrying PGID/OID, the patient
// information panel beside responsible party + insurance, the account-members
// roster, and a SUMMARY / BALANCES / CONTRACTS / REFERRALS tab strip whose
// SUMMARY view splits into appointments + recalls on the left and
// balances / billing / contract on the right.
//
// Every value is bound to the backend's snake_case fields — see
// useOverviewData.ts for the composition and
// docs/patients/patient_overview_backend_devreport.md for the gaps.

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, Printer } from "lucide-react";
import AddNewPatient from "@/components/pages/AddNewPatient";
import { useAuth } from "@/contexts/AuthContext";
import { useOverviewData } from "./useOverviewData";
import PatientInformationPanel from "./panels/PatientInformationPanel";
import ResponsiblePartyPanel from "./panels/ResponsiblePartyPanel";
import InsurancePanel from "./panels/InsurancePanel";
import AccountMembersPanel from "./panels/AccountMembersPanel";
import AppointmentsPanel from "./panels/AppointmentsPanel";
import RecallsPanel from "./panels/RecallsPanel";
import BalancesPanel from "./panels/BalancesPanel";
import { BillingPanel, ContractPanel } from "./panels/BillingContractPanels";
import { BalancesTabContent, ContractsTabContent, ReferralsTabContent } from "./panels/TabPanels";
import ResponsiblePartyModal from "./ResponsiblePartyModal";
import FutureFamilyAppointmentsModal from "./FutureFamilyAppointmentsModal";

const TABS = ["summary", "balances", "contracts", "referrals"] as const;
type Tab = (typeof TABS)[number];

export default function PatientOverviewPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentOffice } = useAuth();
  const navigate = useNavigate();
  const patient_id = Number(patientId);

  const data = useOverviewData(patient_id);

  const [tab, set_tab] = useState<Tab>("summary");
  const [show_edit_patient, set_show_edit_patient] = useState(false);
  const [show_edit_rp, set_show_edit_rp] = useState(false);
  const [show_family_appts, set_show_family_appts] = useState(false);

  if (!Number.isFinite(patient_id)) {
    return <ErrorBox message="Invalid patient id in the URL." />;
  }
  if (data.is_loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[400px] text-[#64748B]">
        <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin" />
        Loading patient overview…
      </div>
    );
  }
  if (data.error || !data.patient) {
    return <ErrorBox message={data.error ?? "Patient not found"} on_retry={data.refetch_all} />;
  }

  return (
    <div className="p-3 sm:p-4 bg-[#F7F9FC] print:bg-white">
      {/* Legacy title bar: screen name left, PGID / OID + print right */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-t-md bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] flex-wrap">
        <h1 className="text-white font-bold text-sm uppercase tracking-wide">Patient Overview</h1>
        <div className="flex items-center gap-3 text-white text-xs font-semibold">
          <span>
            PGID :{data.patient.id} / OID :{data.patient.home_office_id ?? "-"}
          </span>
          <button
            type="button"
            onClick={data.refetch_all}
            title="Refresh"
            className="p-1 rounded hover:bg-white/15 print:hidden"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Print this overview"
            className="p-1 rounded hover:bg-white/15 print:hidden"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="border-2 border-t-0 border-[#E2E8F0] rounded-b-md bg-[#F7F9FC] p-2 sm:p-3 space-y-3">
        {/* Row 1 — patient information | responsible party + insurance */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
          <PatientInformationPanel data={data} on_edit={() => set_show_edit_patient(true)} />
          <div className="space-y-3">
            <ResponsiblePartyPanel data={data} on_edit={() => set_show_edit_rp(true)} />
            <InsurancePanel data={data} patient_id={patient_id} />
          </div>
        </div>

        {/* Row 2 — account members */}
        <AccountMembersPanel
          data={data}
          patient_id={patient_id}
          on_add_member={() => {
            // Legacy opens Add Patient with the account's guarantor preselected;
            // the id is carried in the URL for the wizard to pick up.
            const rp = data.responsible_party_id_raw;
            navigate(
              rp ? `/patient/new?responsible_party_id=${encodeURIComponent(rp)}` : "/patient/new",
            );
          }}
        />

        {/* Row 3 — tabbed detail */}
        <section className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="border-b-2 border-[#E2E8F0] bg-[#F8FAFC] overflow-x-auto print:hidden">
            <div className="flex min-w-max px-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set_tab(t)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-b-4 transition-colors ${
                    tab === t
                      ? "border-[#3A6EA5] text-[#1F3A5F] bg-white"
                      : "border-transparent text-[#64748B] hover:text-[#1F3A5F]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            {tab === "summary" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <div>
                  <AppointmentsPanel
                    data={data}
                    patient_id={patient_id}
                    on_view_family={() => set_show_family_appts(true)}
                  />
                  <RecallsPanel data={data} />
                </div>
                <div className="space-y-3">
                  <BalancesPanel data={data} patient_id={patient_id} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                    <BillingPanel data={data} />
                    <ContractPanel data={data} patient_id={patient_id} />
                  </div>
                </div>
              </div>
            )}
            {tab === "balances" && <BalancesTabContent data={data} patient_id={patient_id} />}
            {tab === "contracts" && <ContractsTabContent data={data} />}
            {tab === "referrals" && <ReferralsTabContent data={data} />}
          </div>
        </section>
      </div>

      {/* Patient Information edit — the create screen's Step-1 form in a dialog. */}
      {show_edit_patient && (
        <AddNewPatient
          mode="edit"
          variant="modal"
          patientId={patient_id}
          currentOffice={currentOffice || ""}
          onClose={() => set_show_edit_patient(false)}
          onSaved={() => {
            set_show_edit_patient(false);
            data.refetch_all();
          }}
        />
      )}

      {show_edit_rp && data.responsible_party && (
        <ResponsiblePartyModal
          responsible_party={data.responsible_party}
          on_close={() => set_show_edit_rp(false)}
          on_saved={() => {
            set_show_edit_rp(false);
            data.refetch_all();
          }}
        />
      )}

      {show_family_appts && (
        <FutureFamilyAppointmentsModal data={data} on_close={() => set_show_family_appts(false)} />
      )}
    </div>
  );
}

function ErrorBox({ message, on_retry }: { message: string; on_retry?: () => void }) {
  return (
    <div className="p-4 flex items-center justify-center min-h-[400px]">
      <div className="bg-white rounded-lg shadow-md border-2 border-red-200 p-6 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-bold text-red-600">Error Loading Patient</h3>
        </div>
        <p className="text-[#64748B] mb-4">{message}</p>
        {on_retry && (
          <button
            type="button"
            onClick={on_retry}
            className="px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-semibold text-sm inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

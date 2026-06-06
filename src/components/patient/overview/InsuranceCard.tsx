import { DentalInsurance, InsurancePlan } from "./types";
import { AlertTriangle, Ban } from "lucide-react";

interface InsuranceCardProps {
  dentalInsurance: DentalInsurance;
  medicalInsurance?: DentalInsurance;
  showMedical?: boolean;
  onInsuranceStatusClick?: (type: "primary" | "secondary") => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-[#1E293B] font-semibold">{value || "—"}</div>
    </div>
  );
}

function PlanDetails({ plan, emptyLabel }: { plan: InsurancePlan | null; emptyLabel: string }) {
  if (!plan) {
    return <div className="text-[#94A3B8] italic text-sm">{emptyLabel}</div>;
  }
  return (
    <div className="space-y-2 text-sm">
      <Field label="Carrier Name" value={plan.carrierName} />
      <Field label="Group Number" value={plan.groupNumber} />
      <Field label="Carrier Phone" value={plan.carrierPhone} />
      <Field label="Subscriber" value={plan.subscriber} />
      <Field label="Individual Max Remaining" value={plan.indMaxRemain} />
      <Field label="Individual Deductible Remaining" value={plan.indDedRemain} />
    </div>
  );
}

export default function InsuranceCard({
  dentalInsurance,
  medicalInsurance,
  showMedical = true,
  onInsuranceStatusClick,
}: InsuranceCardProps) {
  const hasMedical = Boolean(medicalInsurance?.primary || medicalInsurance?.secondary);

  return (
    <>
      {/* Dental Insurance */}
      <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
        <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
          <h2 className="text-white font-bold uppercase tracking-wide text-sm">
            DENTAL INS PRI / SEC
          </h2>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* PRIMARY */}
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b-2 border-[#E2E8F0] uppercase tracking-wide text-xs">
                <button
                  type="button"
                  onClick={() => onInsuranceStatusClick?.("primary")}
                  className="font-bold text-[#1F3A5F] hover:underline cursor-pointer"
                >
                  Primary
                </button>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <Ban className="w-4 h-4 text-red-600" />
              </div>
              <PlanDetails plan={dentalInsurance.primary} emptyLabel="No primary insurance" />
            </div>

            {/* SECONDARY */}
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b-2 border-[#E2E8F0] uppercase tracking-wide text-xs">
                <button
                  type="button"
                  onClick={() => onInsuranceStatusClick?.("secondary")}
                  className="font-bold text-[#1F3A5F] hover:underline cursor-pointer"
                >
                  Secondary
                </button>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              </div>
              <PlanDetails plan={dentalInsurance.secondary} emptyLabel="No secondary insurance" />
            </div>
          </div>
        </div>
      </div>

      {/* Medical Insurance */}
      {showMedical && (
        <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
          <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
            <h2 className="text-white font-bold uppercase tracking-wide text-sm">
              MEDICAL INS PRI / SEC
            </h2>
          </div>
          <div className="p-4">
            {hasMedical ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 pb-1.5 border-b-2 border-[#E2E8F0] uppercase tracking-wide text-xs font-bold text-[#1F3A5F]">
                    Primary
                  </div>
                  <PlanDetails plan={medicalInsurance?.primary ?? null} emptyLabel="No primary insurance" />
                </div>
                <div>
                  <div className="mb-2 pb-1.5 border-b-2 border-[#E2E8F0] uppercase tracking-wide text-xs font-bold text-[#1F3A5F]">
                    Secondary
                  </div>
                  <PlanDetails plan={medicalInsurance?.secondary ?? null} emptyLabel="No secondary insurance" />
                </div>
              </div>
            ) : (
              <div className="text-[#94A3B8] italic text-sm">No medical insurance configured</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

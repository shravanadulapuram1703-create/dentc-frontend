import { DentalInsurance } from "./types";
import { AlertTriangle, Ban } from "lucide-react";

interface InsuranceCardProps {
  dentalInsurance: DentalInsurance;
  showMedical?: boolean;
  onInsuranceStatusClick?: (
    type: "primary" | "secondary",
  ) => void;
}

export default function InsuranceCard({
  dentalInsurance,
  showMedical = true,
  onInsuranceStatusClick,
}: InsuranceCardProps) {
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
                {/* ✅ CLICKABLE PRIMARY */}
                <button
                  type="button"
                  onClick={() =>
                    onInsuranceStatusClick?.("primary")
                  }
                  className="font-bold text-[#1F3A5F] hover:underline cursor-pointer"
                >
                  Primary
                </button>

                {/* Icons = indicators only */}
                <AlertTriangle
                  className="w-4 h-4 text-orange-500"
                  title="Status of the primary dental insurance changes"
                />
                <Ban
                  className="w-4 h-4 text-red-600"
                  title="Patient name to subscriber name and/or relationship do not match"
                />
              </div>

              {/* Primary details */}
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">
                    Carrier Name
                  </div>
                  <div className="text-[#1E293B] font-semibold">
                    {dentalInsurance.primary.carrierName}
                  </div>
                </div>
                {/* remaining fields unchanged */}
              </div>
            </div>

            {/* SECONDARY */}
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b-2 border-[#E2E8F0] uppercase tracking-wide text-xs">
                {/* ✅ CLICKABLE SECONDARY */}
                <button
                  type="button"
                  onClick={() =>
                    onInsuranceStatusClick?.("secondary")
                  }
                  className="font-bold text-[#1F3A5F] hover:underline cursor-pointer"
                >
                  Secondary
                </button>

                <AlertTriangle
                  className="w-4 h-4 text-orange-500"
                  title="Secondary insurance status"
                />
              </div>

              {dentalInsurance.secondary ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">
                      Carrier Name
                    </div>
                    <div className="text-[#1E293B] font-semibold">
                      {dentalInsurance.secondary.carrierName}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[#94A3B8] italic text-sm">
                  No secondary insurance
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Medical Insurance Placeholder */}
      {showMedical && (
        <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
          <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
            <h2 className="text-white font-bold uppercase tracking-wide text-sm">
              MEDICAL INS PRI / SEC
            </h2>
          </div>
          <div className="p-4 text-[#94A3B8] italic text-sm">
            No medical insurance configured
          </div>
        </div>
      )}
    </>
  );
}
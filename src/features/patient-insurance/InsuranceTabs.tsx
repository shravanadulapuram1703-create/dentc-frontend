// Tab strip across the top of every insurance screen — Primary/Secondary/Third/
// Fourth Dental + Primary/Secondary Medical. Each tab routes to its slot.

import { useNavigate } from "react-router-dom";
import { INSURANCE_TABS, type InsSlot } from "./insuranceModel";

export default function InsuranceTabs({ patientId, active }: { patientId: string; active: InsSlot }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap gap-1 px-4 pt-3 bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
      {INSURANCE_TABS.map((t) => {
        const isActive = t.segment === active.segment;
        return (
          <button
            key={t.segment}
            onClick={() => navigate(`/patient/${patientId}/insurance/${t.segment}`)}
            className={`px-3 py-2 rounded-t-md text-xs font-bold border-2 border-b-0 transition-colors ${
              isActive
                ? "bg-white text-[#1F3A5F] border-[#E2E8F0]"
                : "bg-[#EEF2F7] text-[#64748B] border-transparent hover:bg-[#E2E8F0]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Compact patient summary strip carried by both payment-plan screens.
//
// The legacy screens repeat the whole patient banner above the contract. The
// app shell (PatientShellLayout) already renders the identity half of that
// banner, so this strip adds only what the shell omits and the contract needs:
// the account financials, the insurance slots and the legacy PGID / OID pair.

import type { PatientBalance } from "@/api/generated/model";
import type { InsuranceSlotOption } from "./paymentPlanService";
import { money } from "./planModel";

interface Props {
  patient_id: number;
  office_id?: string | null;
  patient_name: string;
  balance: PatientBalance | null;
  insurance_slots: InsuranceSlotOption[];
  responsible_party?: string | null;
}

export default function PlanPatientSummary({
  patient_id,
  office_id,
  patient_name,
  balance,
  insurance_slots,
  responsible_party,
}: Props) {
  const primary = insurance_slots.find((s) => s.insurance_type === "primary");
  const secondary = insurance_slots.find((s) => s.insurance_type === "secondary");

  const cells: Array<[string, string]> = [
    ["Responsible", responsible_party || patient_name],
    ["Balance", money(balance?.account_balance ?? balance?.balance)],
    ["Est Ins", money(balance?.estimated_insurance)],
    ["Est Pat", money(balance?.estimated_patient)],
    ["Prim. Ins", primary ? strip_tier(primary.label) : "—"],
    ["Sec. Ins", secondary ? strip_tier(secondary.label) : "—"],
  ];

  return (
    <div className="bg-[#EAF1F8] border-2 border-[#D7E3F0] rounded-md px-3 py-2 flex items-center justify-between gap-4 flex-wrap">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-5 gap-y-1.5 min-w-0 flex-1">
        {cells.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">
              {label}
            </div>
            <div className="text-[12px] font-semibold text-[#1F3A5F] truncate" title={value}>
              {value}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] font-bold text-[#1F3A5F] whitespace-nowrap">
        PGID :{patient_id} / OID :{office_id || "-"}
      </div>
    </div>
  );
}

/** "Primary: Delta Dental — Grp 123" → "Delta Dental — Grp 123". */
function strip_tier(label: string): string {
  const idx = label.indexOf(": ");
  return idx >= 0 ? label.slice(idx + 2) : label;
}

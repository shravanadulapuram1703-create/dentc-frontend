// ELIGIBILITY grid — effective / term / anniversary dates plus the eligibility
// status block (Status / Verified On / Verified By) and the UPDATE STATUS action
// which stamps verification with today's date.

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import type { InsuranceForm, PlanDisplay } from "./insuranceModel";
import { SectionTitle, INPUT_CLS, ReadOnlyBox } from "./ui";

interface Props {
  form: InsuranceForm;
  planDisplay: PlanDisplay;
  onChange: (patch: Partial<InsuranceForm>) => void;
  onUpdateStatus: () => void;
}

export default function EligibilitySection({ form, planDisplay, onChange, onUpdateStatus }: Props) {
  return (
    <div>
      <SectionTitle>Eligibility</SectionTitle>
      <div className="border-2 border-[#E2E8F0] rounded-lg p-3 space-y-2">
        {/* Dates: Plan Date (read-only) | Sub Date (editable) */}
        <div className="grid grid-cols-[110px_1fr_1fr] items-center gap-2">
          <span className="text-[11px] font-bold text-[#475569] uppercase" />
          <span className="text-[11px] font-bold text-[#1F6FB2] uppercase text-center">Plan Date</span>
          <span className="text-[11px] font-bold text-[#1F6FB2] uppercase text-center">Sub Date</span>
        </div>
        <DateRow label="Effective Date">
          <ReadOnlyBox value="" />
          <input type="date" value={form.effective_date} onChange={(e) => onChange({ effective_date: e.target.value })} className={INPUT_CLS} />
        </DateRow>
        <DateRow label="Term Date">
          <ReadOnlyBox value="" />
          <input type="date" value={form.term_date} onChange={(e) => onChange({ term_date: e.target.value })} className={INPUT_CLS} />
        </DateRow>
        <DateRow label="Anni. Date Exp">
          <ReadOnlyBox value={planDisplay.plan_anniversary_date} />
          <input type="date" value={form.anniversary_date} onChange={(e) => onChange({ anniversary_date: e.target.value })} className={INPUT_CLS} />
        </DateRow>

        {/* Status block */}
        <div className="border-t border-[#E2E8F0] pt-2 grid grid-cols-[110px_1fr] items-center gap-2">
          <span className="text-[11px] font-bold text-[#475569] uppercase">Status</span>
          <input value={form.elig_status} onChange={(e) => onChange({ elig_status: e.target.value })} className={INPUT_CLS} placeholder="e.g. Verified, Pending" />
          <span className="text-[11px] font-bold text-[#475569] uppercase">Verified On</span>
          <input type="date" value={form.elig_verified_on} onChange={(e) => onChange({ elig_verified_on: e.target.value })} className={INPUT_CLS} />
          <span className="text-[11px] font-bold text-[#475569] uppercase">Verified By</span>
          <input value={form.elig_verified_by} onChange={(e) => onChange({ elig_verified_by: e.target.value })} className={INPUT_CLS} />
        </div>

        <button
          onClick={onUpdateStatus}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#3A6EA5] text-white rounded-md hover:bg-[#1F3A5F] font-bold text-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Update Status
        </button>
      </div>
    </div>
  );
}

function DateRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr_1fr] items-center gap-2">
      <span className="text-[11px] font-bold text-[#475569] uppercase">{label}</span>
      {children}
    </div>
  );
}

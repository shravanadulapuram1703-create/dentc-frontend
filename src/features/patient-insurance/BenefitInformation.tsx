// BENEFIT INFORMATION grid — Deductible / Annual Max / Ortho across the
// Ind. | Ind. Rem. | Fam. | Fam. Rem. columns. The "Ind."/"Fam." columns are
// plan-level (read-only, from the selected plan); the "Rem." columns are the
// editable per-patient remaining amounts (patient_insurance + subscriber).

import type { ReactNode } from "react";
import type { InsuranceForm, PlanDisplay } from "./insuranceModel";
import { SectionTitle, MoneyInput, MoneyRO } from "./ui";

interface Props {
  form: InsuranceForm;
  planDisplay: PlanDisplay;
  onChange: (patch: Partial<InsuranceForm>) => void;
}

export default function BenefitInformation({ form, planDisplay, onChange }: Props) {
  return (
    <div>
      <SectionTitle>Benefit Information</SectionTitle>
      <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[110px_repeat(4,1fr)] bg-[#1F6FB2] text-white text-[11px] font-bold uppercase">
          <div className="px-2 py-1.5" />
          <div className="px-2 py-1.5 text-center">Ind.</div>
          <div className="px-2 py-1.5 text-center">Ind. Rem.</div>
          <div className="px-2 py-1.5 text-center">Fam.</div>
          <div className="px-2 py-1.5 text-center">Fam. Rem.</div>
        </div>

        <Row label="Deductible">
          <MoneyRO value={planDisplay.individual_deductible} />
          <MoneyInput value={form.deductible_remaining} onChange={(v) => onChange({ deductible_remaining: v })} />
          <MoneyRO value={planDisplay.family_deductible} />
          <MoneyInput value={form.family_ded_remaining} onChange={(v) => onChange({ family_ded_remaining: v })} />
        </Row>
        <Row label="Annual Max.">
          <MoneyRO value={planDisplay.individual_max} />
          <MoneyInput value={form.max_remaining} onChange={(v) => onChange({ max_remaining: v })} />
          <MoneyRO value={planDisplay.family_max} />
          <MoneyInput value={form.family_max_remaining} onChange={(v) => onChange({ family_max_remaining: v })} />
        </Row>
        <Row label="Ortho" last>
          <MoneyRO value={planDisplay.ortho_max} />
          <MoneyInput value={form.ortho_remaining} onChange={(v) => onChange({ ortho_remaining: v })} />
          <div />
          <div />
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[110px_repeat(4,1fr)] items-center gap-2 px-2 py-1.5 ${last ? "" : "border-b border-[#E2E8F0]"}`}>
      <div className="text-xs font-bold text-[#475569]">{label}</div>
      {children}
    </div>
  );
}

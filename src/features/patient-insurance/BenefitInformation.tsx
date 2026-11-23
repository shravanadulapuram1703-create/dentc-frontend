// BENEFIT INFORMATION grid — Deductible / Annual Max / Ortho across the
// Ind. | Ind. Rem. | Fam. | Fam. Rem. columns. The "Ind."/"Fam." columns are
// plan-level (read-only, from the selected plan); the "Rem." columns are the
// editable per-patient remaining amounts (patient_insurance + subscriber).

import type { ReactNode } from "react";
import type { PatientInsuranceRead } from "@/api/generated/model";
import type { InsuranceForm, PlanDisplay } from "./insuranceModel";
import { SectionTitle, MoneyInput, MoneyRO } from "./ui";

interface Props {
  form: InsuranceForm;
  planDisplay: PlanDisplay;
  /** The saved slot row — carries the server-derived usage (TX-MAX-3). */
  usage?: PatientInsuranceRead | null;
  onChange: (patch: Partial<InsuranceForm>) => void;
}

export default function BenefitInformation({ form, planDisplay, usage, onChange }: Props) {
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
      <BenefitUsageNote usage={usage} />
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

const fmt = (v: string | null | undefined) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
};

const SOURCE_LABEL: Record<string, string> = {
  claims: "from this benefit year's claims",
  claims_capped_by_slot: "from claims, capped by the Ind. Rem. entered above",
  slot: "the Ind. Rem. entered above",
  plan: "the plan maximum (no usage recorded)",
};

/**
 * What every estimate actually uses (TX-MAX-3): the server derives the remaining
 * annual max from the benefit year's claims; the editable Ind. Rem. above is a
 * staff override / upper bound, ignored once it predates the benefit year.
 */
function BenefitUsageNote({ usage }: { usage?: PatientInsuranceRead | null }) {
  if (!usage || usage.max_remaining_effective == null) return null;
  const year = usage.benefit_year_start
    ? `${usage.benefit_year_start}${usage.benefit_year_end ? ` – ${usage.benefit_year_end}` : ""}`
    : "";
  const source = SOURCE_LABEL[usage.max_remaining_source ?? ""] ?? "";
  return (
    <div className="mt-1.5 rounded border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-1.5 text-[11px] text-[#1E3A8A]">
      <span className="font-bold">Used in estimates:</span> Annual max remaining {fmt(usage.max_remaining_effective)}
      {usage.benefits_used_ytd != null && <> · Used this benefit year {fmt(usage.benefits_used_ytd)}</>}
      {usage.deductible_remaining_effective != null && <> · Deductible remaining {fmt(usage.deductible_remaining_effective)}</>}
      {year && <> · Benefit year {year}</>}
      {source && <span className="text-[#475569]"> ({source})</span>}
      {usage.slot_values_stale && (
        <div className="mt-0.5 text-[#B45309]">
          The Ind. Rem. values were entered before this benefit year began and are ignored — the plan&apos;s full limits apply.
        </div>
      )}
    </div>
  );
}

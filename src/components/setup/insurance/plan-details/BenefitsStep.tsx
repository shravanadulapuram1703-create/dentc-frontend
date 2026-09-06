// INSURANCE DETAILS — Step 2 of 4: BENEFITS.
//
// Three blue-banded boxes (Deductible / Maximum / Ortho Max Information) and
// the Plan Notes area. Backend-backed: individual_deductible, family_deductible,
// individual_max, family_max, ortho_max. Browser-stored (PLAN-DTL-1):
// lifetime_ortho_benefits, plan_notes.

import type { PlanDetailsForm } from "./planDetailsModel";
import { BandHeader, WzMoney, Note } from "./wizardUi";

export default function BenefitsStep({
  form,
  onChange,
  disabled = false,
  showExtrasNote = true,
}: {
  form: PlanDetailsForm;
  onChange: (patch: Partial<PlanDetailsForm>) => void;
  disabled?: boolean;
  showExtrasNote?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded border border-[#CBD5E1]">
          <BandHeader>Deductible Information</BandHeader>
          <div className="grid grid-cols-2 gap-x-3 px-2 py-2 text-[11px] font-semibold text-[#1F3A5F]">
            <div className="text-right">Individual Deductible</div>
            <div className="text-right">Family Deductible</div>
            <div className="mt-1">
              <WzMoney value={form.individual_deductible} onChange={(v) => onChange({ individual_deductible: v })} disabled={disabled} />
            </div>
            <div className="mt-1">
              <WzMoney value={form.family_deductible} onChange={(v) => onChange({ family_deductible: v })} disabled={disabled} />
            </div>
          </div>
        </div>

        <div className="rounded border border-[#CBD5E1]">
          <BandHeader>Maximum Information</BandHeader>
          <div className="grid grid-cols-2 gap-x-3 px-2 py-2 text-[11px] font-semibold text-[#1F3A5F]">
            <div className="text-right">Individual Maximum</div>
            <div className="text-right">Family Maximum</div>
            <div className="mt-1">
              <WzMoney value={form.individual_max} onChange={(v) => onChange({ individual_max: v })} disabled={disabled} />
            </div>
            <div className="mt-1">
              <WzMoney value={form.family_max} onChange={(v) => onChange({ family_max: v })} disabled={disabled} />
            </div>
          </div>
        </div>

        <div className="rounded border border-[#CBD5E1]">
          <BandHeader>Ortho Max Information</BandHeader>
          <div className="grid grid-cols-2 gap-x-3 px-2 py-2 text-[11px] font-semibold text-[#1F3A5F]">
            <div className="text-right">Individual Ortho Maximum</div>
            <div className="text-center">Lifetime Ortho Benefits</div>
            <div className="mt-1">
              <WzMoney value={form.ortho_max} onChange={(v) => onChange({ ortho_max: v })} disabled={disabled} />
            </div>
            <div className="mt-1 flex items-center justify-center">
              <input
                type="checkbox"
                checked={form.lifetime_ortho_benefits}
                onChange={(e) => onChange({ lifetime_ortho_benefits: e.target.checked })}
                disabled={disabled}
                className="h-4 w-4 accent-[#1F6FB2]"
                aria-label="Lifetime Ortho Benefits"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-[260px] grid-cols-[170px_1fr] rounded border border-[#CBD5E1]">
        <div className="flex items-center justify-center border-r border-[#CBD5E1] bg-[#F7F9FC] text-[12px] font-semibold text-[#1F3A5F]">
          Plan Notes
        </div>
        <textarea
          value={form.plan_notes}
          onChange={(e) => onChange({ plan_notes: e.target.value })}
          disabled={disabled}
          className="m-2 min-h-[240px] resize-y rounded border border-[#CBD5E1] p-2 text-[13px] focus:outline-none focus:border-[#1F6FB2] disabled:bg-[#F1F5F9]"
          placeholder="Plan notes, limitations wording, “Other – see plan notes” details…"
        />
      </div>

      {showExtrasNote && (
        <Note tone="warn">
          Lifetime Ortho Benefits and Plan Notes have no column on the insurance-plan record yet — they are kept in this browser
          for the plan (backend report PLAN-DTL-1).
        </Note>
      )}
    </div>
  );
}

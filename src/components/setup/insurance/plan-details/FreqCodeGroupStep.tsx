// INSURANCE DETAILS — Step 4 of 4: FREQ LIMITATION CODE GRP.
//
// Frequency limitations that apply to a legacy CODE GROUP (INSLIMITATIONS —
// e.g. "Diagnostic: Periodic Exam (D0120)") rather than a coverage category:
// Code Group · Frequency Limitation · Whole Mouth · Per Day Quantity.
//
// The backend has no resource for these (PLAN-DTL-2). They are persisted as
// `insurance_coverage_rules` rows under the reserved FREQGRP convention so
// they live server-side and are shared — see planDetailsModel.

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FreqCodeGroupRow } from "./planDetailsModel";
import type { PlanLookups } from "./planLookups";
import { WZ_INPUT, WZ_INPUT_SM, WZ_BTN_PRIMARY, Note } from "./wizardUi";

export default function FreqCodeGroupStep({
  rows,
  onRowsChange,
  lookups,
  disabled = false,
}: {
  rows: FreqCodeGroupRow[];
  onRowsChange: (rows: FreqCodeGroupRow[]) => void;
  lookups: PlanLookups;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<FreqCodeGroupRow>({ id: null, code_group: "", freq_limit: "0", whole_mouth: false, per_day_quantity: "" });

  const groupLabel = (code: string) => lookups.code_groups.find((g) => g.code === code)?.label ?? code;
  const available = lookups.code_groups.filter((g) => !rows.some((r) => r.code_group === g.code));

  const add = () => {
    if (!draft.code_group) {
      toast.error("Select a code group");
      return;
    }
    if (rows.some((r) => r.code_group === draft.code_group)) {
      toast.error("That code group already has a frequency on this plan");
      return;
    }
    onRowsChange([...rows, { ...draft }].sort((a, b) => a.code_group.localeCompare(b.code_group)));
    setDraft({ id: null, code_group: "", freq_limit: "0", whole_mouth: false, per_day_quantity: "" });
  };

  const patch = (target: FreqCodeGroupRow, p: Partial<FreqCodeGroupRow>) =>
    onRowsChange(rows.map((r) => (r === target ? { ...r, ...p } : r)));

  const freqSelect = (value: string, onChange: (v: string) => void, cls: string, isDisabled: boolean) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={isDisabled} className={cls}>
      {!lookups.frequencies.some((f) => f.code === value) && <option value={value}>Code {value}</option>}
      {lookups.frequencies.map((f) => (
        <option key={f.code} value={f.code}>
          {f.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-2">
      <div className="rounded border border-[#CBD5E1]">
        <div className="max-h-[330px] min-h-[280px] overflow-auto">
          <table className="w-full min-w-[820px] text-[12px]">
            <thead className="sticky top-0 z-10 bg-[#1F6FB2] text-white">
              <tr>
                <th className="px-3 py-2 text-left font-bold">Code Group</th>
                <th className="px-3 py-2 text-left font-bold">Frequency Limitation</th>
                <th className="px-3 py-2 text-center font-bold">Whole Mouth</th>
                <th className="px-3 py-2 text-center font-bold">Per Day Quantity</th>
                <th className="px-3 py-2 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-[#64748B]">
                    No code-group frequencies on this plan.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.code_group}-${r.id ?? i}`} className="border-b border-[#E2E8F0]">
                    <td className="px-3 py-1.5 text-[#1E293B]">
                      {groupLabel(r.code_group)} <span className="text-[10px] text-[#94A3B8]">{r.code_group}</span>
                    </td>
                    <td className="px-3 py-1.5">{freqSelect(r.freq_limit, (v) => patch(r, { freq_limit: v }), `${WZ_INPUT_SM} text-left`, disabled)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="checkbox" checked={r.whole_mouth} onChange={(e) => patch(r, { whole_mouth: e.target.checked })} disabled={disabled} className="h-3.5 w-3.5 accent-[#1F6FB2]" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="text" inputMode="numeric" value={r.per_day_quantity} onChange={(e) => patch(r, { per_day_quantity: e.target.value })} disabled={disabled} className={`${WZ_INPUT_SM} mx-auto w-[90px] text-center`} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button type="button" onClick={() => onRowsChange(rows.filter((x) => x !== r))} disabled={disabled} title="Remove" className="rounded p-1 text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border border-[#CBD5E1] bg-[#F7F9FC] p-2">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1.4fr_0.6fr_1fr_auto] md:items-end">
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Code Group</div>
            <select value={draft.code_group} onChange={(e) => setDraft({ ...draft, code_group: e.target.value })} disabled={disabled} className={WZ_INPUT}>
              <option value="">Select a code group</option>
              {available.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Frequency Limitation</div>
            {freqSelect(draft.freq_limit, (v) => setDraft({ ...draft, freq_limit: v }), WZ_INPUT, disabled || !draft.code_group)}
          </div>
          <div className="text-center">
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Whole Mouth</div>
            <input type="checkbox" checked={draft.whole_mouth} onChange={(e) => setDraft({ ...draft, whole_mouth: e.target.checked })} disabled={disabled || !draft.code_group} className="mb-2 h-4 w-4 accent-[#1F6FB2]" />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Per Day Quantity</div>
            <input type="text" inputMode="numeric" value={draft.per_day_quantity} onChange={(e) => setDraft({ ...draft, per_day_quantity: e.target.value })} disabled={disabled || !draft.code_group} className={WZ_INPUT} />
          </div>
          <div className="mb-[2px]">
            <button type="button" onClick={add} disabled={disabled || !draft.code_group} className={WZ_BTN_PRIMARY}>
              <Plus className="h-3.5 w-3.5" /> Add Frequency
            </button>
          </div>
        </div>
      </div>

      <Note>
        Code-group frequencies are stored on the plan's coverage-rule records under the reserved “FREQGRP” convention until the
        backend adds a dedicated resource (backend report PLAN-DTL-2).
      </Note>
    </div>
  );
}

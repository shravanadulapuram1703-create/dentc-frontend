// Legacy "DENTAL INS PRI / SEC" + "MEDICAL INS PRI / SEC" tabbed panel.
//
// Rows are the legacy labels; the two data columns are the patient's primary and
// secondary plan for the selected category.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { money_or_dash } from "../format";
import type { InsuranceSlot, OverviewData } from "../useOverviewData";

type Category = "dental" | "medical";

const ROWS: Array<{ label: string; value: (s: InsuranceSlot | null) => string }> = [
  { label: "Carrier Name", value: (s) => s?.carrier?.name || "" },
  {
    label: "Group #",
    value: (s) => s?.plan?.group_number || s?.subscriber?.group_number || "",
  },
  { label: "Carrier Phone", value: (s) => s?.carrier?.phone || "" },
  {
    label: "Subscriber (Rel.)",
    value: (s) => {
      if (!s) return "";
      const who = [s.subscriber?.sub_last_name, s.subscriber?.sub_first_name]
        .filter(Boolean)
        .join(", ");
      const rel = s.record.relationship;
      if (!who) return rel ? `(${rel})` : "";
      return rel ? `${who} (${rel})` : who;
    },
  },
  {
    label: "Indi. Max (Rem.)",
    value: (s) => money_or_dash(s?.record.max_remaining ?? s?.plan?.individual_max, ""),
  },
  {
    label: "Ind. Ded. (Rem.)",
    value: (s) =>
      money_or_dash(s?.record.deductible_remaining ?? s?.plan?.individual_deductible, ""),
  },
];

export default function InsurancePanel({
  data,
  patient_id,
}: {
  data: OverviewData;
  patient_id: number;
}) {
  const [category, set_category] = useState<Category>("dental");
  const navigate = useNavigate();
  const slots = data.insurance_slots[category];

  const open_plan = (order: "primary" | "secondary") =>
    navigate(`/patient/${patient_id}/insurance/${category}/${order}`);

  return (
    <section className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
      <div className="flex border-b-2 border-[#E2E8F0]">
        {(["dental", "medical"] as Category[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => set_category(c)}
            className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wide border-b-4 transition-colors ${
              category === c
                ? "border-[#3A6EA5] text-[#1F3A5F] bg-white"
                : "border-transparent text-[#64748B] bg-[#F8FAFC] hover:text-[#1F3A5F]"
            }`}
          >
            {c} Ins Pri / Sec
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] table-fixed">
          <thead>
            <tr className="bg-[#3A6EA5] text-white">
              <th className="w-[34%] px-3 py-1.5" />
              {(["primary", "secondary"] as const).map((order) => (
                <th key={order} className="w-[33%] px-3 py-1.5 text-center font-bold">
                  <button
                    type="button"
                    onClick={() => open_plan(order)}
                    className="uppercase tracking-wide hover:underline"
                    title={`Open ${category} ${order} insurance plan`}
                  >
                    {order}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-[#E2E8F0] last:border-b-0">
                <th className="px-3 py-1.5 text-left font-medium text-[#475569] bg-[#F8FAFC]">
                  {row.label}
                </th>
                <td className="px-3 py-1.5 text-[#1E293B] font-semibold break-words">
                  {row.value(slots.primary)}
                </td>
                <td className="px-3 py-1.5 text-[#1E293B] font-semibold break-words">
                  {row.value(slots.secondary)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

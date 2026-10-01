// Rows of the legacy "DENTAL / MEDICAL INS PRI / SEC" panel — shared by the
// on-screen InsurancePanel and the printed Patient Overview so both show the
// same labels and resolve the same backend fields.

import { money_or_dash } from "./format";
import type { InsuranceSlot } from "./useOverviewData";

export const INSURANCE_SLOT_ROWS: Array<{ label: string; value: (s: InsuranceSlot | null) => string }> = [
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

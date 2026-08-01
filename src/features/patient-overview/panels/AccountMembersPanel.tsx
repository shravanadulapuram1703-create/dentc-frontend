// Legacy "ACCOUNT MEMBERS" panel — every patient sharing this account's
// responsible party. Rows are links that switch the patient in context.

import { Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Panel, PanelButton, DataGrid, Td } from "../ui";
import { fmt_date, age_from_dob, sex_letter, patient_display_name } from "../format";
import type { OverviewData } from "../useOverviewData";

const COLUMNS = [
  "Member",
  "Age / Sex",
  "Next Visit",
  "Next Recall",
  "Sched Recall",
  "Last Visit",
  "Active",
];

export default function AccountMembersPanel({
  data,
  patient_id,
  on_add_member,
}: {
  data: OverviewData;
  patient_id: number;
  on_add_member: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Panel
      title="Account Members"
      actions={
        <PanelButton onClick={on_add_member}>
          <Plus className="w-3 h-3" /> Add New Member
        </PanelButton>
      }
      bodyClassName="p-2"
    >
      {data.members_loading ? (
        <div className="flex items-center gap-2 justify-center py-4 text-[#64748B] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
        </div>
      ) : (
        <DataGrid
          columns={COLUMNS}
          empty="No account members"
          is_empty={data.members.length === 0}
          min_width={760}
        >
          {data.members.map((m) => {
            const extra = data.member_extra[m.id];
            const is_current = m.id === patient_id;
            return (
              <tr
                key={m.id}
                className={
                  is_current
                    ? "bg-[#E8F0FA] outline outline-2 -outline-offset-2 outline-[#3A6EA5]"
                    : "hover:bg-[#F8FAFC]"
                }
              >
                <Td>
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/${m.id}/overview`)}
                    className="text-[#3A6EA5] font-semibold hover:underline"
                    title={is_current ? "Current patient" : "Switch to this patient"}
                  >
                    {patient_display_name(m)}
                  </button>
                </Td>
                <Td>
                  {age_from_dob(m.dob) ?? "-"} / {sex_letter(m.gender)}
                </Td>
                <Td>{fmt_date(extra?.next_visit)}</Td>
                <Td>{fmt_date(m.next_recall)}</Td>
                <Td>{fmt_date(extra?.scheduled_recall)}</Td>
                <Td>{fmt_date(m.last_visit ?? extra?.last_visit)}</Td>
                <Td>{m.is_active ? "Yes" : "No"}</Td>
              </tr>
            );
          })}
        </DataGrid>
      )}
    </Panel>
  );
}

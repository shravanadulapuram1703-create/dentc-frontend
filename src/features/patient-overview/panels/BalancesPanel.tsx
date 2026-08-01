// Legacy SUMMARY > "BALANCES" panel — aging by account member with an
// "Account Balance" roll-up row, plus the LEDGER shortcut.

import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Panel, PanelButton, DataGrid, Td } from "../ui";
import { money, patient_display_name } from "../format";
import type { OverviewData } from "../useOverviewData";

const COLUMNS = [
  "Member",
  "Current",
  "Over 30",
  "Over 60",
  "Over 90",
  "Over 120",
  "Balance",
  "Est Pat",
  "Est Ins",
];

export default function BalancesPanel({
  data,
  patient_id,
}: {
  data: OverviewData;
  patient_id: number;
}) {
  const navigate = useNavigate();

  // The patient in context always has its own balance query; other members come
  // from the per-member enrichment.
  const balance_of = (id: number) =>
    id === patient_id ? (data.balance ?? data.member_extra[id]?.balance) : data.member_extra[id]?.balance;

  const totals = data.members.reduce(
    (acc, m) => {
      const b = balance_of(m.id);
      if (!b) return acc;
      acc.current += b.aging?.current ?? 0;
      acc.b30 += b.aging?.b30 ?? 0;
      acc.b60 += b.aging?.b60 ?? 0;
      acc.b90 += b.aging?.b90 ?? 0;
      acc.b120 += b.aging?.b120 ?? 0;
      acc.balance += b.account_balance ?? b.balance ?? 0;
      acc.est_pat += b.estimated_patient ?? 0;
      acc.est_ins += b.estimated_insurance ?? 0;
      return acc;
    },
    { current: 0, b30: 0, b60: 0, b90: 0, b120: 0, balance: 0, est_pat: 0, est_ins: 0 },
  );

  return (
    <Panel
      title="Balances"
      actions={
        <PanelButton onClick={() => navigate(`/patient/${patient_id}/account-ledger`)}>
          <BookOpen className="w-3 h-3" /> Ledger
        </PanelButton>
      }
      bodyClassName="p-2"
    >
      <DataGrid columns={COLUMNS} empty="No balances" is_empty={false} min_width={780}>
        <tr className="bg-[#F1F5F9] font-bold">
          <Td className="font-bold">Account Balance</Td>
          <Td>{money(totals.current)}</Td>
          <Td>{money(totals.b30)}</Td>
          <Td>{money(totals.b60)}</Td>
          <Td>{money(totals.b90)}</Td>
          <Td>{money(totals.b120)}</Td>
          <Td className="text-[#3A6EA5]">{money(totals.balance)}</Td>
          <Td className="text-[#3A6EA5]">{money(totals.est_pat)}</Td>
          <Td className="text-[#3A6EA5]">{money(totals.est_ins)}</Td>
        </tr>
        {data.members.map((m) => {
          const b = balance_of(m.id);
          return (
            <tr key={m.id} className="hover:bg-[#F8FAFC]">
              <Td>
                <button
                  type="button"
                  onClick={() => navigate(`/patient/${m.id}/overview`)}
                  className="text-[#3A6EA5] font-semibold hover:underline"
                >
                  {patient_display_name(m)}
                </button>
              </Td>
              <Td>{money(b?.aging?.current)}</Td>
              <Td>{money(b?.aging?.b30)}</Td>
              <Td>{money(b?.aging?.b60)}</Td>
              <Td>{money(b?.aging?.b90)}</Td>
              <Td>{money(b?.aging?.b120)}</Td>
              <Td className="text-[#3A6EA5]">{money(b?.account_balance ?? b?.balance)}</Td>
              <Td className="text-[#3A6EA5]">{money(b?.estimated_patient)}</Td>
              <Td className="text-[#3A6EA5]">{money(b?.estimated_insurance)}</Td>
            </tr>
          );
        })}
      </DataGrid>
    </Panel>
  );
}

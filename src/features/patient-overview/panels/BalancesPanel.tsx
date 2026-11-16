// Legacy SUMMARY > "BALANCES" panel — aging by account member with an
// "Account Balance" roll-up row, plus the LEDGER shortcut.
//
// Balances are ACCOUNT-scoped (every patient billed to the same responsible
// party), so the panel says so explicitly, names the guarantor, pins and
// highlights the patient in context, and offers a "This patient" view that
// shows only the selected patient's own balance.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users } from "lucide-react";
import { Panel, PanelButton, DataGrid, Td } from "../ui";
import { money, patient_display_name } from "../format";
import type { OverviewData } from "../useOverviewData";
import type { PatientBalance } from "@/api/generated/model";

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

type View = "account" | "patient";

interface Row {
  patient_id: number;
  name: string;
  balance?: Pick<PatientBalance, "aging" | "balance" | "account_balance" | "estimated_patient" | "estimated_insurance">;
}

export default function BalancesPanel({
  data,
  patient_id,
}: {
  data: OverviewData;
  patient_id: number;
}) {
  const navigate = useNavigate();
  const [view, set_view] = useState<View>("account");

  // Server-scoped account balance (AL-11) when available; otherwise the
  // client-side roster + per-member balances.
  const server = data.account_balance;
  const rows: Row[] = server?.members?.length
    ? server.members.map((m) => {
        const member = data.members.find((x) => x.id === m.patient_id);
        return {
          patient_id: m.patient_id,
          name: member ? patient_display_name(member) : m.patient_name || `Patient ${m.patient_id}`,
          balance: m,
        };
      })
    : data.members.map((m) => ({
        patient_id: m.id,
        name: patient_display_name(m),
        balance:
          m.id === patient_id
            ? (data.balance ?? data.member_extra[m.id]?.balance)
            : data.member_extra[m.id]?.balance,
      }));

  // The patient in context first, then the rest in roster order.
  rows.sort((a, b) => Number(b.patient_id === patient_id) - Number(a.patient_id === patient_id));
  const visible = view === "patient" ? rows.filter((r) => r.patient_id === patient_id) : rows;

  const totals = visible.reduce(
    (acc, r) => {
      const b = r.balance;
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

  const g = data.guarantor;
  const guarantor_person = g?.responsible_party ?? g?.guarantor_patient ?? null;
  const guarantor_name = guarantor_person
    ? [guarantor_person.first_name, guarantor_person.last_name].filter(Boolean).join(" ")
    : "";
  const member_count = rows.length || 1;

  return (
    <Panel
      title="Balances"
      actions={
        <PanelButton onClick={() => navigate(`/patient/${patient_id}/account-ledger`)}>
          <BookOpen className="w-3 h-3" /> Ledger
        </PanelButton>
      }
      // Absorbs the slack in the SUMMARY row's right column (see
      // PatientOverviewPage) so Billing / Contract stay bottom-aligned with
      // Recalls; the grid itself is capped so a large family scrolls.
      className="xl:flex-1 xl:min-h-0"
      bodyClassName="p-2 flex flex-col flex-1 min-h-0 gap-1.5"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-[#475569]">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#3A6EA5]" />
          {view === "account" ? (
            <span>
              Account
              {guarantor_name ? (
                <>
                  {" "}of <strong className="text-[#1E293B]">{guarantor_name}</strong> (responsible party)
                </>
              ) : null}{" "}
              · {member_count} member{member_count === 1 ? "" : "s"} — every patient billed to the same
              responsible party.
            </span>
          ) : (
            <span>This patient&apos;s own balance only.</span>
          )}
        </span>
        <div className="inline-flex rounded border-2 border-[#CBD5E1] overflow-hidden print:hidden" role="group">
          {(
            [
              ["account", "Whole account"],
              ["patient", "This patient"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => set_view(v)}
              aria-pressed={view === v}
              className={`px-2 py-0.5 text-[11px] font-semibold ${
                view === v ? "bg-[#3A6EA5] text-white" : "bg-white text-[#475569] hover:bg-[#F1F5F9]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <DataGrid
        columns={COLUMNS}
        empty="No balances"
        is_empty={false}
        min_width={780}
        className="max-h-56 xl:flex-1 xl:min-h-0"
      >
        <tr className="bg-[#F1F5F9] font-bold">
          <Td className="font-bold">{view === "account" ? "Account Balance" : "Patient Balance"}</Td>
          <Td>{money(totals.current)}</Td>
          <Td>{money(totals.b30)}</Td>
          <Td>{money(totals.b60)}</Td>
          <Td>{money(totals.b90)}</Td>
          <Td>{money(totals.b120)}</Td>
          <Td className="text-[#3A6EA5]">{money(totals.balance)}</Td>
          <Td className="text-[#3A6EA5]">{money(totals.est_pat)}</Td>
          <Td className="text-[#3A6EA5]">{money(totals.est_ins)}</Td>
        </tr>
        {visible.map((r) => {
          const b = r.balance;
          const is_current = r.patient_id === patient_id;
          return (
            <tr
              key={r.patient_id}
              className={
                is_current
                  ? "bg-[#E8F0FA] outline outline-2 -outline-offset-2 outline-[#3A6EA5]"
                  : "hover:bg-[#F8FAFC]"
              }
            >
              <Td>
                {is_current ? (
                  <span className="text-[#1F3A5F] font-semibold">
                    {r.name} <span className="text-[10px] font-normal text-[#64748B]">(this patient)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/${r.patient_id}/overview`)}
                    className="text-[#3A6EA5] font-semibold hover:underline"
                  >
                    {r.name}
                  </button>
                )}
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

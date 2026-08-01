// Legacy SUMMARY > "BILLING" and "CONTRACT" panels.
//
// BILLING shows the last patient / insurance payment (amount + date) from the
// balance endpoint's recent_activity block. CONTRACT shows the remaining amount
// and payment count for the regular and ortho plans side by side.

import { useNavigate } from "react-router-dom";
import { Edit2 } from "lucide-react";
import { Panel, PanelButton } from "../ui";
import { fmt_date, money, money_or_dash } from "../format";
import type { OverviewData } from "../useOverviewData";

export function BillingPanel({ data }: { data: OverviewData }) {
  const recent = data.balance?.recent_activity;
  const rows: Array<[string, string, string]> = [
    ["Last Pat Pay", money(recent?.last_pat_amount), fmt_date(recent?.last_pat)],
    ["Last Ins Pay", money(recent?.last_ins_amount), fmt_date(recent?.last_ins)],
  ];

  return (
    <Panel title="Billing">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[#3A6EA5] text-white">
            <th className="px-3 py-1.5 text-left" />
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-wide text-xs">
              Amount
            </th>
            <th className="px-3 py-1.5 text-left font-bold uppercase tracking-wide text-xs">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, amount, date]) => (
            <tr key={label} className="border-b border-[#E2E8F0] last:border-b-0">
              <th className="px-3 py-1.5 text-left font-medium text-[#475569] bg-[#F8FAFC]">
                {label}
              </th>
              <td className="px-3 py-1.5 text-right font-semibold text-[#1E293B]">{amount}</td>
              <td className="px-3 py-1.5 text-[#1E293B]">{date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export function ContractPanel({
  data,
  patient_id,
}: {
  data: OverviewData;
  patient_id: number;
}) {
  const navigate = useNavigate();

  // The Regular Payment Plan screen writes to /patient-payment-plans (plan_type
  // "regular"); legacy-migrated regular contracts also live on /patient-reg-plans.
  // The Ortho Payment Plan screen writes to /ortho-plans, whose patient sub-plan
  // carries the remaining figures shown here.
  const is_ortho = (t?: string | null) => (t ?? "").trim().toLowerCase().startsWith("o");
  const reg =
    data.payment_plans.find((p) => !is_ortho(p.plan_type)) ?? data.reg_plans[0] ?? null;
  const ortho = data.ortho_plans[0] ?? null;

  const rows: Array<[string, string, string]> = [
    ["Rem. Amount", money_or_dash(reg?.rem_total_amt), money_or_dash(ortho?.pat_rem_amt)],
    [
      "Rem. Payments",
      reg?.rem_payments != null ? String(reg.rem_payments) : "-",
      ortho?.pat_rem_payments != null ? String(ortho.pat_rem_payments) : "-",
    ],
  ];

  return (
    <Panel
      title="Contract"
      actions={
        <>
          <PanelButton onClick={() => navigate(`/patient/${patient_id}/payment-plan/ortho`)}>
            <Edit2 className="w-3 h-3" /> Edit Ortho
          </PanelButton>
          <PanelButton onClick={() => navigate(`/patient/${patient_id}/payment-plan/regular`)}>
            <Edit2 className="w-3 h-3" /> Edit Regular
          </PanelButton>
        </>
      }
    >
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[#3A6EA5] text-white">
            <th className="px-3 py-1.5 text-left" />
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-wide text-xs">Reg</th>
            <th className="px-3 py-1.5 text-right font-bold uppercase tracking-wide text-xs">
              Ortho
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, reg_value, ortho_value]) => (
            <tr key={label} className="border-b border-[#E2E8F0] last:border-b-0">
              <th className="px-3 py-1.5 text-left font-medium text-[#475569] bg-[#F8FAFC]">
                {label}
              </th>
              <td className="px-3 py-1.5 text-right font-semibold text-[#1E293B]">{reg_value}</td>
              <td className="px-3 py-1.5 text-right font-semibold text-[#1E293B]">{ortho_value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

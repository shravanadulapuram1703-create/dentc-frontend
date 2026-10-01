// Full-width content for the BALANCES / CONTRACTS / REFERRALS tabs.
// (SUMMARY is composed directly in PatientOverviewPage from the legacy panels.)

import { Loader2 } from "lucide-react";
import { DataGrid, Td } from "../ui";
import { fmt_date, money, money_or_dash } from "../format";
import BalancesPanel from "./BalancesPanel";
import { BillingPanel } from "./BillingContractPanels";
import { CONTRACT_COLUMNS, contract_rows, referral_direction_label } from "../contractRows";
import type { OverviewData } from "../useOverviewData";

/* ---------------------------------------------------------------- BALANCES */

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "debit" | "credit" }) {
  return (
    <div className="border-2 border-[#E2E8F0] rounded p-2.5 bg-white">
      <div className="text-[11px] uppercase tracking-wide text-[#64748B] font-semibold">{label}</div>
      <div
        className={`text-lg font-bold ${
          tone === "debit" ? "text-[#DC2626]" : tone === "credit" ? "text-[#059669]" : "text-[#1F3A5F]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function BalancesTabContent({
  data,
  patient_id,
}: {
  data: OverviewData;
  patient_id: number;
}) {
  const b = data.balance;
  const account_balance = b?.account_balance ?? b?.balance ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        <Kpi
          label="Account Balance"
          value={money(account_balance)}
          tone={account_balance > 0 ? "debit" : account_balance < 0 ? "credit" : undefined}
        />
        <Kpi label="Opening Balance" value={money(b?.opening_balance)} />
        <Kpi label="Today's Charges" value={money(b?.today_charges)} />
        <Kpi label="Total Charged" value={money(b?.total_charged)} />
        <Kpi label="Total Paid" value={money(b?.total_paid)} />
        <Kpi label="Insurance Balance" value={money(b?.insurance_balance)} />
      </div>

      <BalancesPanel data={data} patient_id={patient_id} />
      <div className="max-w-md">
        <BillingPanel data={data} />
      </div>
      {b?.as_of && (
        <p className="text-[11px] text-[#94A3B8]">
          Aging as of {fmt_date(b.as_of)} — source <code>/api/v1/patients/{patient_id}/balance</code>.
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- CONTRACTS */

export function ContractsTabContent({ data }: { data: OverviewData }) {
  const rows = contract_rows(data);

  return (
    <DataGrid
      columns={CONTRACT_COLUMNS}
      empty="No payment plans or contracts on file"
      is_empty={rows.length === 0}
      min_width={1080}
    >
      {rows.map((r) => (
        <tr key={r.key} className="hover:bg-[#F8FAFC]">
          <Td className="font-semibold">{r.label}</Td>
          <Td>{fmt_date(r.setup_date)}</Td>
          <Td>{money_or_dash(r.amt_financed)}</Td>
          <Td>{money_or_dash(r.down_payment)}</Td>
          <Td>{r.apr ?? "-"}</Td>
          <Td>{money_or_dash(r.fin_charge)}</Td>
          <Td>{r.interval_type ?? "-"}</Td>
          <Td>{r.num_payments ?? "-"}</Td>
          <Td>{money_or_dash(r.periodic_amt)}</Td>
          <Td>{fmt_date(r.first_due_date)}</Td>
          <Td>{r.rem_payments ?? "-"}</Td>
          <Td>{money_or_dash(r.rem_total_amt)}</Td>
        </tr>
      ))}
    </DataGrid>
  );
}

/* --------------------------------------------------------------- REFERRALS */

const REFERRAL_COLUMNS = [
  "Direction",
  "Name",
  "Practice",
  "Specialty",
  "Phone",
  "Email",
  "City / State",
  "Reason",
  "Cost",
  "Created",
];

export function ReferralsTabContent({ data }: { data: OverviewData }) {
  if (data.referrals_loading) {
    return (
      <div className="flex items-center gap-2 justify-center py-8 text-[#64748B] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading referrals…
      </div>
    );
  }

  return (
    <DataGrid
      columns={REFERRAL_COLUMNS}
      empty="No referrals recorded for this patient"
      is_empty={data.referrals.length === 0}
      min_width={1000}
    >
      {data.referrals.map((r) => (
        <tr key={r.id} className="hover:bg-[#F8FAFC]">
          <Td className="font-semibold">{referral_direction_label(r.referral_type)}</Td>
          <Td>{[r.last_name, r.first_name].filter(Boolean).join(", ") || "-"}</Td>
          <Td>{r.practice_name || "-"}</Td>
          <Td>{r.specialty || "-"}</Td>
          <Td>{r.phone || "-"}</Td>
          <Td>{r.email || "-"}</Td>
          <Td>{[r.city, r.state].filter(Boolean).join(", ") || "-"}</Td>
          <Td className="whitespace-normal max-w-[220px]">{r.reason_code || r.notes || "-"}</Td>
          <Td>{money_or_dash(r.cost)}</Td>
          <Td>{fmt_date(r.created_at)}</Td>
        </tr>
      ))}
    </DataGrid>
  );
}

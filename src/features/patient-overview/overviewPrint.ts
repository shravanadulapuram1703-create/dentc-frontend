// Printed "Patient Overview" — the legacy report form of the screen.
//
// The Print button used to call window.print(), which sent the whole browser
// page (nav, buttons, tab strips, scroll boxes) to the printer. This builds a
// structured document instead, section for section with the on-screen panels:
// Patient Information, Responsible Party, Insurance, Account Members,
// Appointments, Recalls, Balances, Billing, Contract(s) and Referrals. Every
// value is read from the same OverviewData the panels bind to, so the print
// always matches the screen.

import { alertDisplayLines } from "@/features/medical-alerts/patientMedicalAlerts";
import {
  openPatientPdf,
  officeHeader,
  sectionTitle,
  keyValueTable,
  dataTable,
  paragraph,
  printPatientPdf,
  cell,
  type PdfRow,
} from "@/features/print/patientPdf";
import {
  fmt_date,
  fmt_time,
  money,
  money_or_dash,
  age_from_dob,
  sex_word,
  sex_letter,
  contact_pref_label,
  patient_display_name,
  recall_interval_label,
} from "./format";
import { INSURANCE_SLOT_ROWS } from "./insuranceSlotRows";
import { CONTRACT_COLUMNS, contract_rows, referral_direction_label } from "./contractRows";
import type { OverviewData } from "./useOverviewData";

export function printPatientOverview(data: OverviewData, patient_id: number): void {
  const p = data.patient;
  if (!p) return;
  const office = data.home_office;

  const pdf = openPatientPdf({
    title: "Patient Overview",
    ...officeHeader(office, data.office_name(p.home_office_id)),
    patient_name: patient_display_name(p),
    patient_id: p.id,
    chart_no: p.chart_no,
    dob: fmt_date(p.dob),
    extra: [["PGID / OID", `${p.id} / ${p.home_office_id ?? "-"}`]],
  });

  // ---- Patient Information ---------------------------------------------------
  sectionTitle(pdf, "Patient Information");
  const age = age_from_dob(p.dob);
  // Only "yes" answers + account alerts are alerts (shared reader; "no" rows hidden).
  const medical_alert_text = alertDisplayLines(data.medical_alerts, data.account_alerts);

  keyValueTable(pdf, [
    ["Name", patient_display_name(p), "Age / Sex", `${age ?? "-"} / ${sex_word(p.gender)}`],
    ["Date of Birth", fmt_date(p.dob), "Cell", cell(p.cell_phone)],
    ["ID", String(p.id), "Email", cell(p.email)],
    ["Legacy ID", cell(p.legacy_id), "Chart", cell(p.chart_no)],
    [
      "Next Visit",
      fmt_date(data.visit_dates.next_visit),
      "Next Recall",
      fmt_date(data.visit_dates.next_recall),
    ],
    ["Last Visit", fmt_date(data.visit_dates.last_visit), "First Visit", fmt_date(data.visit_dates.first_visit)],
    [
      "Provider",
      data.provider_name(p.preferred_provider_id),
      "Referral Type",
      cell(data.referral_type_label(p.referral_type)),
    ],
    ["Hygienist", data.provider_name(p.preferred_hygienist_id), "Referred By", cell(p.referred_by)],
    ["Home Office", data.office_name(p.home_office_id), "Referred To", cell(p.referred_to)],
    [
      "Last Perio Chart",
      fmt_date(data.last_perio_exam?.exam_date),
      "Contact Pref",
      contact_pref_label(p.preferred_contact),
    ],
    ["Home", cell(p.phone), "Work", cell(p.work_phone)],
    [
      "Fee Schedule",
      cell(data.fee_schedule_name ?? (p.fee_schedule_id != null ? `#${p.fee_schedule_id}` : "")),
      "Type",
      cell(data.patient_type_label(p.patient_type)),
    ],
    [
      "Address",
      cell([p.address_line1, p.address_line2].filter(Boolean).join(", ")),
      "Preferred Language",
      cell(p.preferred_language),
    ],
    [
      "City, State and Zip",
      cell([[p.city, p.state].filter(Boolean).join(", "), p.zip].filter(Boolean).join(" ")),
      "Active",
      p.is_active === false ? "No" : "Yes",
    ],
  ]);
  paragraph(pdf, "Patient Note", p.patient_notes ?? "");
  paragraph(pdf, "Medical Alerts", medical_alert_text.join("; "), { color: [220, 38, 38] });

  // ---- Responsible Party -----------------------------------------------------
  sectionTitle(pdf, "Responsible Party");
  const rp = data.responsible_party;
  const legacy_resp_id = rp?.legacy_id || data.responsible_party_id_raw || "";
  const rp_name = rp
    ? [rp.last_name, rp.first_name].filter(Boolean).join(", ") || "-"
    : [p.last_name, p.first_name].filter(Boolean).join(", ") || "-";
  keyValueTable(pdf, [
    ["Name", rp_name, "Cell", cell(rp?.cell_phone || p.cell_phone)],
    [
      "Resp ID",
      `${rp ? String(rp.id) : "-"}${legacy_resp_id ? ` (Legacy ID ${legacy_resp_id})` : ""}`,
      "Email",
      cell(rp?.email || p.email),
    ],
    [
      "Type",
      cell(
        rp?.resp_party_type
          ? data.resp_party_type_label(rp.resp_party_type)
          : data.patient_type_label(p.patient_type),
      ),
      "Home Office",
      data.office_name(p.home_office_id),
    ],
  ]);

  // ---- Insurance (dental + medical, primary + secondary) ---------------------
  sectionTitle(pdf, "Insurance");
  const slots = data.insurance_slots;
  dataTable(
    pdf,
    ["", "Dental Primary", "Dental Secondary", "Medical Primary", "Medical Secondary"],
    INSURANCE_SLOT_ROWS.map((row) => [
      { content: row.label, styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      cell(row.value(slots.dental.primary)),
      cell(row.value(slots.dental.secondary)),
      cell(row.value(slots.medical.primary)),
      cell(row.value(slots.medical.secondary)),
    ]),
    { widths: { 0: 96 } },
  );

  // ---- Account Members -------------------------------------------------------
  sectionTitle(pdf, "Account Members");
  dataTable(
    pdf,
    ["Member", "Age / Sex", "Next Visit", "Next Recall", "Sched Recall", "Last Visit", "Active"],
    data.members.map((m) => {
      const extra = data.member_extra[m.id];
      return [
        `${patient_display_name(m)}${m.id === patient_id ? " *" : ""}`,
        `${age_from_dob(m.dob) ?? "-"} / ${sex_letter(m.gender)}`,
        fmt_date(extra?.next_visit),
        fmt_date(m.next_recall),
        fmt_date(extra?.scheduled_recall),
        fmt_date(m.last_visit ?? extra?.last_visit),
        m.is_active ? "Yes" : "No",
      ];
    }),
    { center: [6], empty: "No account members" },
  );

  // ---- Appointments (active; archived rows are kept off the report) ---------
  sectionTitle(pdf, "Appointments");
  const appointments = data.appointments.filter((a) => !a.is_archived);
  dataTable(
    pdf,
    ["Appt Date", "Appt Time", "Office", "Operatory", "Provider", "Duration", "Status", "Last Updated"],
    appointments.map((a) => [
      fmt_date(a.date),
      fmt_time(a.start_time),
      data.office_code(a.office_id) ?? data.office_name(a.office_id),
      data.operatory_name(a.operatory_id),
      data.provider_name(a.provider_id),
      cell(a.duration),
      `${a.status || "-"}${a.is_cancelled ? " (cancelled)" : ""}`,
      fmt_date(a.updated_at ?? a.created_at),
    ]),
    { right: [5], empty: "No appointments" },
  );

  // ---- Recalls ---------------------------------------------------------------
  sectionTitle(pdf, "Recalls");
  dataTable(
    pdf,
    ["Code", "Interval", "Recall Date", "Reason", "Sch Date", "Sch Time"],
    data.recalls.map((r) => [
      cell(r.procedure_code),
      recall_interval_label(r.interval_months, r.interval_unit),
      fmt_date(r.due_date),
      cell(r.recall_type),
      fmt_date(r.scheduled_date),
      fmt_time(r.scheduled_time),
    ]),
    { empty: "No recalls" },
  );

  // ---- Balances --------------------------------------------------------------
  sectionTitle(pdf, "Balances");
  const b = data.balance;
  const account_balance = b?.account_balance ?? b?.balance ?? 0;
  keyValueTable(pdf, [
    ["Account Balance", money(account_balance), "Opening Balance", money(b?.opening_balance)],
    ["Today's Charges", money(b?.today_charges), "Total Charged", money(b?.total_charged)],
    ["Total Paid", money(b?.total_paid), "Insurance Balance", money(b?.insurance_balance)],
  ]);

  const balance_of = (id: number) =>
    id === patient_id ? (data.balance ?? data.member_extra[id]?.balance) : data.member_extra[id]?.balance;
  const totals = data.members.reduce(
    (acc, m) => {
      const mb = balance_of(m.id);
      if (!mb) return acc;
      acc.current += mb.aging?.current ?? 0;
      acc.b30 += mb.aging?.b30 ?? 0;
      acc.b60 += mb.aging?.b60 ?? 0;
      acc.b90 += mb.aging?.b90 ?? 0;
      acc.b120 += mb.aging?.b120 ?? 0;
      acc.balance += mb.account_balance ?? mb.balance ?? 0;
      acc.est_pat += mb.estimated_patient ?? 0;
      acc.est_ins += mb.estimated_insurance ?? 0;
      return acc;
    },
    { current: 0, b30: 0, b60: 0, b90: 0, b120: 0, balance: 0, est_pat: 0, est_ins: 0 },
  );
  const balance_rows: PdfRow[] = data.members.map((m) => {
    const mb = balance_of(m.id);
    return [
      patient_display_name(m),
      money(mb?.aging?.current),
      money(mb?.aging?.b30),
      money(mb?.aging?.b60),
      money(mb?.aging?.b90),
      money(mb?.aging?.b120),
      money(mb?.account_balance ?? mb?.balance),
      money(mb?.estimated_patient),
      money(mb?.estimated_insurance),
    ];
  });
  dataTable(
    pdf,
    ["Member", "Current", "Over 30", "Over 60", "Over 90", "Over 120", "Balance", "Est Pat", "Est Ins"],
    balance_rows,
    {
      right: [1, 2, 3, 4, 5, 6, 7, 8],
      foot: [
        "Account Balance",
        money(totals.current),
        money(totals.b30),
        money(totals.b60),
        money(totals.b90),
        money(totals.b120),
        money(totals.balance),
        money(totals.est_pat),
        money(totals.est_ins),
      ],
    },
  );

  // ---- Billing + Contract summary --------------------------------------------
  sectionTitle(pdf, "Billing");
  const recent = b?.recent_activity;
  dataTable(
    pdf,
    ["", "Amount", "Date"],
    [
      ["Last Pat Pay", money(recent?.last_pat_amount), fmt_date(recent?.last_pat)],
      ["Last Ins Pay", money(recent?.last_ins_amount), fmt_date(recent?.last_ins)],
    ],
    { right: [1], widths: { 0: 120, 1: 100 } },
  );

  sectionTitle(pdf, "Contract");
  const is_ortho = (t?: string | null) => (t ?? "").trim().toLowerCase().startsWith("o");
  const reg = data.payment_plans.find((pp) => !is_ortho(pp.plan_type)) ?? data.reg_plans[0] ?? null;
  const ortho = data.ortho_plans[0] ?? null;
  dataTable(
    pdf,
    ["", "Reg", "Ortho"],
    [
      ["Rem. Amount", money_or_dash(reg?.rem_total_amt), money_or_dash(ortho?.pat_rem_amt)],
      [
        "Rem. Payments",
        reg?.rem_payments != null ? String(reg.rem_payments) : "-",
        ortho?.pat_rem_payments != null ? String(ortho.pat_rem_payments) : "-",
      ],
    ],
    { right: [1, 2], widths: { 0: 120, 1: 100, 2: 100 } },
  );

  // ---- Contracts (full detail, as on the CONTRACTS tab) ----------------------
  sectionTitle(pdf, "Contracts");
  dataTable(
    pdf,
    CONTRACT_COLUMNS,
    contract_rows(data).map((r) => [
      r.label,
      fmt_date(r.setup_date),
      money_or_dash(r.amt_financed),
      money_or_dash(r.down_payment),
      cell(r.apr),
      money_or_dash(r.fin_charge),
      cell(r.interval_type),
      cell(r.num_payments),
      money_or_dash(r.periodic_amt),
      fmt_date(r.first_due_date),
      cell(r.rem_payments),
      money_or_dash(r.rem_total_amt),
    ]),
    { right: [2, 3, 4, 5, 7, 8, 10, 11], font_size: 7, empty: "No payment plans or contracts on file" },
  );

  // ---- Referrals -------------------------------------------------------------
  sectionTitle(pdf, "Referrals");
  dataTable(
    pdf,
    ["Direction", "Name", "Practice", "Specialty", "Phone", "Email", "City / State", "Reason", "Cost", "Created"],
    data.referrals.map((r) => [
      referral_direction_label(r.referral_type),
      cell([r.last_name, r.first_name].filter(Boolean).join(", ")),
      cell(r.practice_name),
      cell(r.specialty),
      cell(r.phone),
      cell(r.email),
      cell([r.city, r.state].filter(Boolean).join(", ")),
      cell(r.reason_code || r.notes),
      money_or_dash(r.cost),
      fmt_date(r.created_at),
    ]),
    { right: [8], font_size: 7, empty: "No referrals recorded for this patient" },
  );

  printPatientPdf(pdf);
}

// Printed "Insurance Details" — one slot (e.g. Primary Dental) as a report.
//
// The title-bar printer icon on this screen had no handler at all, so staff
// fell back to the browser's Print, which sent the whole page (tab strip, search
// panel, inputs and footer buttons) to the printer. This prints the structured
// details instead: plan + carrier + employer, benefit information, eligibility,
// subscriber information and notes — the same fields, in the same order, as the
// screen shows.

import {
  openPatientPdf,
  officeHeader,
  sectionTitle,
  keyValueTable,
  dataTable,
  paragraph,
  printPatientPdf,
  cell,
} from "@/features/print/patientPdf";
import { GENDER_OPTIONS, marital_label, moneyDisplay, type InsSlot, type InsuranceForm, type PlanDisplay } from "./insuranceModel";
import type { OfficeRead } from "@/api/generated/model";

export interface InsurancePrintInput {
  patient: { id: number; name: string; dob?: string; chart_no?: string };
  office: OfficeRead | null;
  office_name: string;
  slot: InsSlot;
  form: InsuranceForm;
  plan: PlanDisplay;
}

/** YYYY-MM-DD (date input value) -> MM/DD/YYYY. */
const fmt_date = (v?: string | null): string => {
  if (!v) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : v;
};

const money = (v: string | null | undefined): string => {
  const d = moneyDisplay(v);
  return d ? `$${d}` : "-";
};

export function printInsuranceDetails(input: InsurancePrintInput): void {
  const { office, slot, form, plan } = input;
  const pdf = openPatientPdf({
    title: `Insurance Details — ${slot.label}`,
    ...officeHeader(office, input.office_name),
    patient_name: input.patient.name,
    patient_id: input.patient.id,
    chart_no: input.patient.chart_no,
    dob: input.patient.dob,
    extra: [["Plan Slot", `${slot.label} (${slot.kind})`]],
  });

  // ---- Insurance Plan / Carrier / Employer -----------------------------------
  sectionTitle(pdf, "Insurance Plan");
  keyValueTable(pdf, [
    ["Plan ID", cell(plan.plan_id), "Group #", cell(form.group_number)],
    ["Carrier Name", cell(plan.carrier_name), "Payer ID", cell(plan.payer_id)],
    ["Carrier ID", cell(plan.carrier_legacy_id), "Type", cell(plan.carrier_type)],
    ["Carrier Phone", cell(plan.carrier_phone), "Status", form.is_active ? "Active" : "Inactive"],
    ["Employer Name", cell(plan.employer_name), "Employer Location", cell(plan.employer_city)],
  ]);

  // ---- Benefit Information ---------------------------------------------------
  sectionTitle(pdf, "Benefit Information");
  dataTable(
    pdf,
    ["", "Ind.", "Ind. Rem.", "Fam.", "Fam. Rem."],
    [
      [
        { content: "Deductible", styles: { fontStyle: "bold" } },
        money(plan.individual_deductible),
        money(form.deductible_remaining),
        money(plan.family_deductible),
        money(form.family_ded_remaining),
      ],
      [
        { content: "Annual Max.", styles: { fontStyle: "bold" } },
        money(plan.individual_max),
        money(form.max_remaining),
        money(plan.family_max),
        money(form.family_max_remaining),
      ],
      [
        { content: "Ortho", styles: { fontStyle: "bold" } },
        money(plan.ortho_max),
        money(form.ortho_remaining),
        "",
        "",
      ],
    ],
    { right: [1, 2, 3, 4], widths: { 0: 110 } },
  );

  // ---- Eligibility -----------------------------------------------------------
  sectionTitle(pdf, "Eligibility");
  dataTable(
    pdf,
    ["", "Plan Date", "Sub Date"],
    [
      [{ content: "Effective Date", styles: { fontStyle: "bold" } }, fmt_date(form.plan_effective_date), fmt_date(form.effective_date)],
      [{ content: "Term Date", styles: { fontStyle: "bold" } }, fmt_date(form.plan_term_date), fmt_date(form.term_date)],
      [
        { content: "Anni. Date Exp", styles: { fontStyle: "bold" } },
        fmt_date(plan.plan_anniversary_date),
        fmt_date(form.anniversary_date),
      ],
    ],
    { center: [1, 2], widths: { 0: 110, 1: 120, 2: 120 } },
  );
  keyValueTable(pdf, [
    ["Status", cell(form.elig_status), "Verified On", fmt_date(form.elig_verified_on)],
    ["Verified By", cell(form.elig_verified_by), "", ""],
  ]);

  // ---- Subscriber Information ------------------------------------------------
  sectionTitle(pdf, "Subscriber Information");
  const sex = GENDER_OPTIONS.find((g) => g.value === form.sub_gender)?.label ?? cell(form.sub_gender);
  keyValueTable(pdf, [
    ["Last", cell(form.sub_last_name), "First", cell(form.sub_first_name)],
    ["SubID", cell(form.sub_member_id), "Birth Date", fmt_date(form.sub_dob)],
    ["Sex", sex, "Marital Status", cell(marital_label(form.marital_status))],
    ["Address", cell([form.sub_address, form.sub_address2].filter(Boolean).join(", ")), "Phone", cell(form.sub_phone)],
    [
      "City / St / Zip",
      cell([[form.sub_city, form.sub_state].filter(Boolean).join(", "), form.sub_zip].filter(Boolean).join(" ")),
      "Patient Rel to Sub",
      cell(form.relationship),
    ],
    ["Sec. Sub Rel to Prim. Sub", cell(form.sec_sub_rel_to_prim_sub), "Group #", cell(form.group_number)],
  ]);

  // ---- Notes -----------------------------------------------------------------
  sectionTitle(pdf, "Notes");
  paragraph(pdf, "", form.notes);

  printPatientPdf(pdf);
}

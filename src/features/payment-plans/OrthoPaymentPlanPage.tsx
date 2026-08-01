// Ortho Payment Plan — legacy Denticon "Ortho Payment Plan" screen.
//
// Layout mirrors the legacy screen: the PLAN ID header (billing codes, fee /
// estimate split, preferred provider, treatment dates + duration, insert class),
// then the three independent sub-plans side by side — START PATIENT PAYMENT
// PLAN (with its PAYMENT METHOD block), START PRI INSURANCE PAYMENT PLAN and
// START SEC INSURANCE PAYMENT PLAN — each with its own notes box and
// BILLING DETAILS / PRINT / UPDATE PERIODIC BILLING actions, closing with the
// SAVE ORTHO PLAN / CLOSE bar.
//
// Bound to /ortho-plans (snake_case, straight through); the two insurance
// columns additionally read and rewrite their periodic billing rows on
// /patient-ins-payment-plans and /patient-sec-ins-payment-plans. Fields the
// backend has no column for carry a small amber gap marker — see
// docs/payment-plans/payment_plans_backend_devreport.md.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  X,
  Trash2,
  Printer,
  Ticket,
  ListOrdered,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import type { OrthoPlanRead, PatientBalance } from "@/api/generated/model";
import { useAuth } from "@/contexts/AuthContext";
import { useDefinitions } from "@/hooks/useDefinitions";
import {
  loadBalance,
  loadOrthoPlan,
  loadPlanContext,
  loadInsSchedule,
  office_header,
  provider_label,
  removeOrthoPlan,
  rewritePeriodicBilling,
  saveOrthoPlan,
  type InsTier,
  type PlanContext,
} from "./paymentPlanService";
import {
  INTERVALS,
  add_interval,
  amortise,
  build_schedule,
  dec,
  empty_ortho_form,
  fmt_date,
  int,
  interval_label,
  money,
  months_between,
  num,
  ortho_body,
  ortho_form_from,
  round2,
  time_stamp,
  today_iso,
  validate_ortho,
  type OrthoPlanForm,
  type ScheduleRow,
} from "./planModel";
import {
  Block,
  Checkbox,
  DateInput,
  MoneyInput,
  Notice,
  NotesBox,
  NotSavedBadge,
  NumberInput,
  PercentInput,
  PlanButton,
  ReadOnly,
  Row,
  Select,
  TextInput,
  FooterBar,
} from "./ui";
import PlanPatientSummary from "./PlanPatientSummary";
import BillingDetailsModal from "./BillingDetailsModal";
import { DISCLOSURES, buildContractPdf, buildCouponsPdf, printPdf } from "./planPrint";

interface OutletContext {
  patient: {
    id: string;
    name: string;
    dob?: string;
    chartNo?: string;
    officeId?: string;
    balance?: number;
  };
}

const CARD_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Legacy "Insert Class" picker — a display-only banding classification. */
const INSERT_CLASSES = ["None", "Class I", "Class II Div 1", "Class II Div 2", "Class III"];

type ScheduleTarget =
  | { kind: "patient" }
  | { kind: "ins"; tier: InsTier; title: string };

export default function OrthoPaymentPlanPage() {
  const { patient } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patient_id = Number(patient.id);
  const office_id = patient.officeId ? Number(patient.officeId) : null;

  const [loading, set_loading] = useState(true);
  const [saving, set_saving] = useState(false);
  const [busy_tier, set_busy_tier] = useState<InsTier | null>(null);
  const [record, set_record] = useState<OrthoPlanRead | null>(null);
  const [ctx, set_ctx] = useState<PlanContext | null>(null);
  const [balance, set_balance] = useState<PatientBalance | null>(null);
  const [form, set_form] = useState<OrthoPlanForm>(() => empty_ortho_form());
  const [errors, set_errors] = useState<Record<string, string>>({});
  const [schedule_target, set_schedule_target] = useState<ScheduleTarget | null>(null);
  const [show_remarks, set_show_remarks] = useState(false);

  const { definitions: payment_defs } = useDefinitions("payment_method");

  const update = useCallback(
    (patch: Partial<OrthoPlanForm>) => set_form((prev) => ({ ...prev, ...patch })),
    [],
  );

  // --- load ---------------------------------------------------------------
  const load = useCallback(async () => {
    if (!Number.isFinite(patient_id)) return;
    set_loading(true);
    try {
      const [row, context] = await Promise.all([loadOrthoPlan(patient_id), loadPlanContext(patient_id)]);
      set_record(row);
      set_ctx(context);
      set_form(row ? ortho_form_from(row) : empty_ortho_form());
    } catch {
      toast.error("Could not load the ortho plan for this patient.");
    } finally {
      set_loading(false);
    }
  }, [patient_id]);

  useEffect(() => {
    void load();
  }, [load]);

  // The balance aggregate is slow to compute cold (gap PP-5), so it streams in
  // on its own instead of holding the form behind the loading spinner.
  useEffect(() => {
    if (!Number.isFinite(patient_id)) return;
    let cancelled = false;
    void loadBalance(patient_id).then((b) => {
      if (!cancelled) set_balance(b);
    });
    return () => {
      cancelled = true;
    };
  }, [patient_id]);

  // --- PLAN ID derivations -------------------------------------------------
  // Fee splits into the patient / insurance estimate; the two shares always sum
  // back to the total, so editing one re-derives the other.
  const on_fee_change = (value: string) => {
    const fee = num(value);
    const ins = num(form.ins_share_amt);
    update({ total_ortho_amt: value, pat_share_amt: dec(Math.max(0, fee - ins)) });
  };
  const on_ins_share_change = (value: string) => {
    const fee = num(form.total_ortho_amt);
    update({ ins_share_amt: value, pat_share_amt: dec(Math.max(0, fee - num(value))) });
  };
  const on_pat_share_change = (value: string) => {
    const fee = num(form.total_ortho_amt);
    update({ pat_share_amt: value, ins_share_amt: dec(Math.max(0, fee - num(value))) });
  };

  /** Tx Duration and Treatment End Date are two views of the same span. */
  const on_duration_change = (value: string) => {
    const months = int(value);
    const base = form.banding_date || form.treat_start_date;
    update({
      tx_duration_months: value,
      treat_end_date: months > 0 && base ? add_interval(base, "monthly", months) : form.treat_end_date,
    });
  };
  const on_end_date_change = (value: string) => {
    const base = form.banding_date || form.treat_start_date;
    update({
      treat_end_date: value,
      tx_duration_months: base && value ? String(Math.max(0, months_between(base, value))) : "",
    });
  };

  const months_remaining = useMemo(() => {
    if (!form.treat_end_date) return "";
    return String(Math.max(0, months_between(today_iso(), form.treat_end_date)));
  }, [form.treat_end_date]);

  // --- sub-plan amortisation ----------------------------------------------
  /** Patient column: Amount Financed = Plan Amount − Down Payment, then amortise. */
  const recalc_patient = useCallback(() => {
    set_form((prev) => {
      const financed = round2(Math.max(0, num(prev.pat_plan_amount) - num(prev.pat_down_pay)));
      const n = int(prev.pat_num_payments);
      if (n <= 0) return { ...prev, pat_amt_financed: dec(financed) };
      const a = amortise(financed, num(prev.pat_apr), n, prev.pat_interval);
      return {
        ...prev,
        pat_amt_financed: dec(financed),
        pat_periodic_amt: dec(a.periodic_amt),
        pat_fin_charge: dec(a.fin_charge),
        pat_total_of_payments: dec(a.total_of_payments),
        pat_rem_payments: prev.pat_rem_payments === "" ? String(n) : prev.pat_rem_payments,
        pat_rem_amt: prev.pat_rem_amt === "" ? dec(a.total_of_payments) : prev.pat_rem_amt,
      };
    });
  }, []);

  /** Insurance columns carry no APR — a straight split of the financed amount. */
  const recalc_ins = useCallback((tier: InsTier) => {
    set_form((prev) => {
      if (tier === "primary") {
        const financed = round2(Math.max(0, num(prev.ins_plan_amount) - num(prev.ins_down_pay)));
        const n = int(prev.ins_num_payments);
        if (n <= 0) return prev;
        const periodic = round2(financed / n);
        return {
          ...prev,
          ins_periodic_amt: dec(periodic),
          ins_rem_payments: prev.ins_rem_payments === "" ? String(n) : prev.ins_rem_payments,
          ins_rem_amt: prev.ins_rem_amt === "" ? dec(financed) : prev.ins_rem_amt,
        };
      }
      const financed = round2(Math.max(0, num(prev.sec_ins_plan_amount) - num(prev.sec_ins_down_pay)));
      const n = int(prev.sec_ins_num_payments);
      if (n <= 0) return prev;
      const periodic = round2(financed / n);
      return {
        ...prev,
        sec_ins_periodic_amt: dec(periodic),
        sec_ins_rem_payments: prev.sec_ins_rem_payments === "" ? String(n) : prev.sec_ins_rem_payments,
        sec_ins_rem_amt: prev.sec_ins_rem_amt === "" ? dec(financed) : prev.sec_ins_rem_amt,
      };
    });
  }, []);

  const patient_schedule = useMemo(
    () =>
      build_schedule(
        form.pat_first_due_date,
        form.pat_interval,
        int(form.pat_num_payments),
        num(form.pat_periodic_amt),
        num(form.pat_total_of_payments),
      ),
    [
      form.pat_first_due_date,
      form.pat_interval,
      form.pat_num_payments,
      form.pat_periodic_amt,
      form.pat_total_of_payments,
    ],
  );

  const ins_schedule = useCallback(
    (tier: InsTier): ScheduleRow[] =>
      tier === "primary"
        ? build_schedule(
            form.ins_first_due_date,
            form.ins_interval,
            int(form.ins_num_payments),
            num(form.ins_periodic_amt),
          )
        : build_schedule(
            form.sec_ins_first_due_date,
            form.sec_ins_interval,
            int(form.sec_ins_num_payments),
            num(form.sec_ins_periodic_amt),
          ),
    [
      form.ins_first_due_date,
      form.ins_interval,
      form.ins_num_payments,
      form.ins_periodic_amt,
      form.sec_ins_first_due_date,
      form.sec_ins_interval,
      form.sec_ins_num_payments,
      form.sec_ins_periodic_amt,
    ],
  );

  // --- actions ------------------------------------------------------------
  const on_save = async () => {
    const found = validate_ortho(form);
    set_errors(found);
    if (Object.keys(found).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    set_saving(true);
    try {
      const body = ortho_body(
        { ...form, ins_months_remaining: form.ins_months_remaining || months_remaining },
        patient_id,
        office_id,
      );
      const saved = await saveOrthoPlan(record?.id ?? null, body);
      set_record(saved);
      // Keep the UI-only fields the backend can't round-trip.
      set_form((prev) => ({
        ...ortho_form_from(saved),
        initial_billing_code: prev.initial_billing_code,
        pref_provider_id: prev.pref_provider_id,
        insert_class: prev.insert_class,
        pat_setup_date: prev.pat_setup_date,
        pat_disclosure: prev.pat_disclosure,
        pat_notes: prev.pat_notes,
        payment_code: prev.payment_code,
        ins_mon_claim_print_fee: prev.ins_mon_claim_print_fee,
        ins_suppress_periodic_printing: prev.ins_suppress_periodic_printing,
        sec_ins_setup_date: prev.sec_ins_setup_date,
        sec_ins_first_due_date: prev.sec_ins_first_due_date,
        sec_ins_interval: prev.sec_ins_interval,
        sec_ins_down_pay: prev.sec_ins_down_pay,
        sec_ins_num_payments: prev.sec_ins_num_payments,
        sec_ins_rem_payments: prev.sec_ins_rem_payments,
        sec_ins_rem_amt: prev.sec_ins_rem_amt,
        sec_ins_mon_claim_print_fee: prev.sec_ins_mon_claim_print_fee,
        sec_ins_suppress_periodic_printing: prev.sec_ins_suppress_periodic_printing,
      }));
      toast.success(record ? "Ortho plan updated." : "Ortho plan created.");
    } catch {
      toast.error("Could not save the ortho plan.");
    } finally {
      set_saving(false);
    }
  };

  const on_delete = async () => {
    if (!record) return;
    if (!window.confirm("Delete this ortho plan? Periodic billing will stop.")) return;
    set_saving(true);
    try {
      await removeOrthoPlan(record.id);
      toast.success("Ortho plan deleted.");
      set_record(null);
      set_form(empty_ortho_form());
    } catch {
      toast.error("Could not delete the ortho plan.");
    } finally {
      set_saving(false);
    }
  };

  /** "UPDATE PERIODIC BILLING" — rewrite the unbilled tail for one tier. */
  const on_update_periodic = async (tier: InsTier) => {
    const rows = ins_schedule(tier);
    if (!rows.length) {
      toast.error("Enter a first billing date, payment count and amount first.");
      return;
    }
    set_busy_tier(tier);
    try {
      const result = await rewritePeriodicBilling({
        patient_id,
        tier,
        legacy_plan_id:
          tier === "primary" ? form.ins_plan_id || null : form.sec_ins_plan_id || null,
        billing_code: form.procedure_code || null,
        plan_amount: num(tier === "primary" ? form.ins_plan_amount : form.sec_ins_plan_amount),
        down_payment: num(tier === "primary" ? form.ins_down_pay : form.sec_ins_down_pay),
        rows,
      });
      toast.success(
        `Periodic billing updated — ${result.written} instalment(s) written` +
          (result.kept ? `, ${result.kept} already-billed row(s) kept.` : "."),
      );
    } catch {
      toast.error("Could not update the periodic billing schedule.");
    } finally {
      set_busy_tier(null);
    }
  };

  const contract_header = {
    ...office_header(ctx?.offices ?? [], office_id),
    patient_name: patient.name,
    patient_id,
    chart_no: patient.chartNo ?? "",
    dob: patient.dob ?? "",
    responsible_party: patient.name,
  };

  const patient_terms = {
    title: "Ortho Payment Plan — Patient",
    worksheet: [
      ["Periodic Billing Code", form.procedure_code || "-"],
      ["Treatment Start / End", `${fmt_date(form.treat_start_date)} – ${fmt_date(form.treat_end_date)}`],
      ["Total Ortho Fee", money(form.total_ortho_amt)],
      ["Estimated Insurance", money(form.ins_share_amt)],
      ["Estimated Patient", money(form.pat_share_amt)],
      ["Plan Amount", money(form.pat_plan_amount)],
      ["Down Payment", money(form.pat_down_pay)],
      ["Amount Financed", money(form.pat_amt_financed)],
    ] as Array<[string, string]>,
    disclosure_box: [
      [`${dec(form.pat_apr)}%`, money(form.pat_fin_charge), money(form.pat_amt_financed)],
    ] as Array<[string, string, string]>,
    interval: form.pat_interval,
    num_payments: int(form.pat_num_payments),
    periodic_amt: num(form.pat_periodic_amt),
    first_due_date: form.pat_first_due_date,
    disclosure_key: form.pat_disclosure,
    notes: form.pat_notes,
  };

  if (!Number.isFinite(patient_id)) {
    return <div className="p-6 text-sm text-[#B91C1C]">Invalid patient id in the URL.</div>;
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[400px] text-[#64748B]">
        <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin" />
        Loading ortho plan…
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const code_options = ctx?.ortho_codes ?? [];
  const providers = (ctx?.providers ?? [])
    .slice()
    .sort((a, b) => Number(b.is_ortho_provider) - Number(a.is_ortho_provider));

  return (
    <div className="p-3 sm:p-4 bg-[#F7F9FC] print:bg-white">
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-t-md bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] flex-wrap">
        <h1 className="text-white font-bold text-sm uppercase tracking-wide">Ortho Payment Plan</h1>
        <span className="text-white text-xs font-semibold">
          {record ? `Ortho Plan ID ${record.id}` : "New plan"}
        </span>
      </div>

      <div className="border-2 border-t-0 border-[#E2E8F0] rounded-b-md bg-[#F7F9FC] p-2 sm:p-3 pb-14 space-y-3">
        <PlanPatientSummary
          patient_id={patient_id}
          office_id={patient.officeId}
          patient_name={patient.name}
          balance={balance}
          insurance_slots={ctx?.insurance_slots ?? []}
        />

        {/* ---------------------------- PLAN ID --------------------------- */}
        <Block
          title="Plan ID"
          actions={
            <div className="flex items-center gap-4 text-[11px] text-[#475569]">
              <span>
                Created At: <strong>{ctx?.offices.find((o) => o.id === office_id)?.name ?? "-"}</strong>
              </span>
              <span>
                Created On: <strong>{record ? fmt_date(record.created_at.slice(0, 10)) : "-"}</strong>
              </span>
              <span>
                Created By: <strong>{record?.created_by ?? "-"}</strong>
              </span>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4">
            <div className="border-2 border-[#E2E8F0] rounded overflow-hidden">
              <Row label="Initial Billing Code" required error={err("initial_billing_code")} not_saved="OPP-1">
                <Select
                  value={form.initial_billing_code}
                  invalid={Boolean(err("initial_billing_code"))}
                  on_change={(v) => update({ initial_billing_code: v })}
                >
                  <option value="">Please Select</option>
                  {code_options.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} {c.description}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label="Periodic Billing Code" required error={err("procedure_code")}>
                <Select
                  value={form.procedure_code}
                  invalid={Boolean(err("procedure_code"))}
                  on_change={(v) => {
                    const picked = code_options.find((c) => c.code === v);
                    update({ procedure_code: v, description: picked?.description ?? form.description });
                  }}
                >
                  <option value="">Please Select</option>
                  {code_options.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} {c.description}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label="Pref. Provider" not_saved="OPP-2">
                <Select value={form.pref_provider_id} on_change={(v) => update({ pref_provider_id: v })}>
                  <option value="">Please Select</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {provider_label(p)}
                      {p.is_ortho_provider ? " (Ortho)" : ""}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label="Description">
                <TextInput
                  value={form.description}
                  on_change={(v) => update({ description: v })}
                  placeholder="Plan description"
                />
              </Row>
            </div>

            <div className="border-2 border-[#E2E8F0] rounded overflow-hidden mt-3 lg:mt-0">
              <Row label="Fee">
                <MoneyInput
                  value={form.total_ortho_amt}
                  on_change={on_fee_change}
                  on_blur={() => update({ total_ortho_amt: dec(form.total_ortho_amt) })}
                />
              </Row>
              <Row label="Est. Patient" hint="Fee − estimated insurance.">
                <MoneyInput
                  value={form.pat_share_amt}
                  on_change={on_pat_share_change}
                  on_blur={() => update({ pat_share_amt: dec(form.pat_share_amt) })}
                />
              </Row>
              <Row label="Est. Insurance">
                <MoneyInput
                  value={form.ins_share_amt}
                  on_change={on_ins_share_change}
                  on_blur={() => update({ ins_share_amt: dec(form.ins_share_amt) })}
                />
              </Row>
              <Row label="Insert Class" not_saved="OPP-3">
                <Select value={form.insert_class} on_change={(v) => update({ insert_class: v })}>
                  {INSERT_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Row>
            </div>

            <div className="border-2 border-[#E2E8F0] rounded overflow-hidden mt-3 lg:mt-0">
              <Row label="Treatment Start Date" required error={err("treat_start_date")}>
                <DateInput
                  value={form.treat_start_date}
                  invalid={Boolean(err("treat_start_date"))}
                  on_change={(v) => update({ treat_start_date: v })}
                />
              </Row>
              <Row label="Banding Date / Tx Duration" error={err("banding_date")}>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <DateInput
                      value={form.banding_date}
                      invalid={Boolean(err("banding_date"))}
                      on_change={(v) => update({ banding_date: v })}
                    />
                  </div>
                  <div className="w-16">
                    <NumberInput
                      value={form.tx_duration_months}
                      on_change={on_duration_change}
                      placeholder="0"
                    />
                  </div>
                  <span className="text-[11px] text-[#64748B] whitespace-nowrap">(In Months)</span>
                </div>
              </Row>
              <Row label="Treatment End Date" required error={err("treat_end_date")}>
                <DateInput
                  value={form.treat_end_date}
                  invalid={Boolean(err("treat_end_date"))}
                  on_change={on_end_date_change}
                />
              </Row>
              <Row label="Months Remaining" hint="Defaults to the months left until the treatment end date.">
                <NumberInput
                  value={form.ins_months_remaining}
                  placeholder={months_remaining || "0"}
                  on_change={(v) => update({ ins_months_remaining: v })}
                />
              </Row>
            </div>
          </div>
        </Block>

        {/* --------------------- The three sub-plans ---------------------- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
          {/* ============ PATIENT ============ */}
          <div className="space-y-3">
            <Block
              title="Start Patient Payment Plan"
              enabled_toggle={{
                checked: form.pat_plan_enabled,
                on_change: (v) => update({ pat_plan_enabled: v }),
                label: "Start patient payment plan",
              }}
              actions={
                <PlanButton
                  on_click={() => set_show_remarks(true)}
                  disabled={!form.pat_plan_enabled}
                  title="Plan remarks"
                >
                  <MessageSquare className="w-3 h-3" /> Remarks
                </PlanButton>
              }
            >
              <fieldset disabled={!form.pat_plan_enabled} className="disabled:opacity-55">
                <div className="border-2 border-[#E2E8F0] rounded overflow-hidden">
                  <Row label="Plan Setup Date" not_saved="OPP-4">
                    <DateInput value={form.pat_setup_date} on_change={(v) => update({ pat_setup_date: v })} />
                  </Row>
                  <Row label="1st Per. Billing Date" required error={err("pat_first_due_date")}>
                    <DateInput
                      value={form.pat_first_due_date}
                      invalid={Boolean(err("pat_first_due_date"))}
                      on_change={(v) => update({ pat_first_due_date: v })}
                    />
                  </Row>
                  <Row label="Plan Amount" required error={err("pat_plan_amount")}>
                    <MoneyInput
                      value={form.pat_plan_amount}
                      invalid={Boolean(err("pat_plan_amount"))}
                      on_change={(v) => update({ pat_plan_amount: v })}
                      on_blur={recalc_patient}
                    />
                  </Row>
                  <Row label="Interval">
                    <Select
                      value={form.pat_interval}
                      on_change={(v) => {
                        update({ pat_interval: v });
                        setTimeout(recalc_patient, 0);
                      }}
                    >
                      {INTERVALS.map((i) => (
                        <option key={i.value} value={i.value}>
                          {i.label}
                        </option>
                      ))}
                    </Select>
                  </Row>
                  <Row label="Down Payment" error={err("pat_down_pay")}>
                    <MoneyInput
                      value={form.pat_down_pay}
                      invalid={Boolean(err("pat_down_pay"))}
                      on_change={(v) => update({ pat_down_pay: v })}
                      on_blur={recalc_patient}
                    />
                  </Row>
                  <Row label="Finance Charge">
                    <MoneyInput
                      value={form.pat_fin_charge}
                      on_change={(v) => update({ pat_fin_charge: v })}
                      on_blur={() =>
                        update({
                          pat_fin_charge: dec(form.pat_fin_charge),
                          pat_total_of_payments: dec(
                            num(form.pat_amt_financed) + num(form.pat_fin_charge),
                          ),
                        })
                      }
                    />
                  </Row>
                  <Row label="Amount Financed">
                    <ReadOnly value={money(form.pat_amt_financed)} />
                  </Row>
                  <Row label="Total of Payments">
                    <ReadOnly value={money(form.pat_total_of_payments)} />
                  </Row>
                  <Row label="APR">
                    <PercentInput
                      value={form.pat_apr}
                      on_change={(v) => update({ pat_apr: v })}
                      on_blur={recalc_patient}
                    />
                  </Row>
                  <Row label="Payments / Payment Amt." required error={err("pat_num_payments")}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-20">
                        <NumberInput
                          value={form.pat_num_payments}
                          invalid={Boolean(err("pat_num_payments"))}
                          on_change={(v) => update({ pat_num_payments: v })}
                          on_blur={recalc_patient}
                        />
                      </div>
                      <div className="flex-1">
                        <MoneyInput
                          value={form.pat_periodic_amt}
                          on_change={(v) => update({ pat_periodic_amt: v })}
                          on_blur={recalc_patient}
                        />
                      </div>
                    </div>
                  </Row>
                  <Row label="Rem Payments / Rem Amt.">
                    <div className="flex items-center gap-1.5">
                      <div className="w-20">
                        <NumberInput
                          value={form.pat_rem_payments}
                          on_change={(v) => update({ pat_rem_payments: v })}
                        />
                      </div>
                      <div className="flex-1">
                        <MoneyInput
                          value={form.pat_rem_amt}
                          on_change={(v) => update({ pat_rem_amt: v })}
                          on_blur={() => update({ pat_rem_amt: dec(form.pat_rem_amt) })}
                        />
                      </div>
                    </div>
                  </Row>
                  <Row label="Financial Disclosure to Print" not_saved="OPP-5">
                    <Select value={form.pat_disclosure} on_change={(v) => update({ pat_disclosure: v })}>
                      {Object.keys(DISCLOSURES).map((k) => (
                        <option key={k} value={k}>
                          {k === "None" ? "None" : `.${k}`}
                        </option>
                      ))}
                    </Select>
                  </Row>
                </div>

                <div className="mt-2.5">
                  <NotesBox
                    title="Notes"
                    not_saved="OPP-4"
                    value={form.pat_notes}
                    on_change={(v) => update({ pat_notes: v })}
                    on_stamp={() =>
                      update({
                        pat_notes: `${form.pat_notes}${
                          form.pat_notes && !form.pat_notes.endsWith("\n") ? "\n" : ""
                        }${time_stamp(user?.name ?? "")} — `,
                      })
                    }
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <PlanButton
                    on_click={() => set_schedule_target({ kind: "patient" })}
                    disabled={patient_schedule.length === 0}
                  >
                    <ListOrdered className="w-3 h-3" /> Billing Details
                  </PlanButton>
                  <PlanButton
                    on_click={() => printPdf(buildContractPdf(contract_header, patient_terms, patient_schedule))}
                    disabled={int(form.pat_num_payments) <= 0}
                  >
                    <Printer className="w-3 h-3" /> Print Contract
                  </PlanButton>
                  <PlanButton
                    on_click={() => printPdf(buildCouponsPdf(contract_header, patient_terms, patient_schedule))}
                    disabled={patient_schedule.length === 0}
                  >
                    <Ticket className="w-3 h-3" /> Print Coupons
                  </PlanButton>
                  <PlanButton on_click={recalc_patient}>
                    <RefreshCw className="w-3 h-3" /> Update Periodic
                  </PlanButton>
                </div>
              </fieldset>
            </Block>

            {/* PAYMENT METHOD sits under the patient column in the legacy screen */}
            <Block title="Payment Method">
              <div className="space-y-2">
                <Notice>
                  Card details are shown for parity with the legacy screen but are{" "}
                  <strong>not stored</strong> — <code>ortho_plans</code> has no payment-method columns and
                  card capture needs a PCI-compliant vault. See gap OPP-6.
                </Notice>
                <div className="border-2 border-[#E2E8F0] rounded overflow-hidden">
                  <Row label="Payment code" not_saved="OPP-6">
                    <Select value={form.payment_code} on_change={(v) => update({ payment_code: v })}>
                      <option value="">Please Select</option>
                      {payment_defs.map((d) => (
                        <option key={d.id} value={d.key1 ?? String(d.id)}>
                          {d.key1 ? `${d.key1} - ${d.description}` : d.description}
                        </option>
                      ))}
                    </Select>
                  </Row>
                  <Row label="Card Holder" not_saved="OPP-6">
                    <TextInput value="" disabled placeholder="Requires payment vault" />
                  </Row>
                  <Row label="Card Number" not_saved="OPP-6">
                    <TextInput value="" disabled placeholder="Requires payment vault" />
                  </Row>
                  <Row label="Exp Date / CVV #" not_saved="OPP-6">
                    <div className="flex gap-1.5">
                      <Select value={form.card_exp_month} disabled>
                        {CARD_MONTHS.map((m, i) => (
                          <option key={m} value={String(i + 1).padStart(2, "0")}>
                            {m}
                          </option>
                        ))}
                      </Select>
                      <Select value={form.card_exp_year} disabled>
                        {Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i)).map(
                          (y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ),
                        )}
                      </Select>
                      <TextInput value="" disabled placeholder="CVV" />
                    </div>
                  </Row>
                  <Row label="">
                    <Checkbox
                      checked={form.post_down_payment_with_card}
                      disabled
                      label="Post down payment using this credit card"
                    />
                  </Row>
                </div>
              </div>
            </Block>
          </div>

          {/* ============ PRIMARY INSURANCE ============ */}
          <InsuranceColumn
            title="Start Pri Insurance Payment Plan"
            tier="primary"
            form={form}
            errors={errors}
            update={update}
            recalc={() => recalc_ins("primary")}
            insurance_slots={ctx?.insurance_slots ?? []}
            user_name={user?.name ?? ""}
            busy={busy_tier === "primary"}
            on_billing_details={() =>
              set_schedule_target({ kind: "ins", tier: "primary", title: "Primary Insurance" })
            }
            on_update_periodic={() => on_update_periodic("primary")}
          />

          {/* ============ SECONDARY INSURANCE ============ */}
          <InsuranceColumn
            title="Start Sec Insurance Payment Plan"
            tier="secondary"
            form={form}
            errors={errors}
            update={update}
            recalc={() => recalc_ins("secondary")}
            insurance_slots={ctx?.insurance_slots ?? []}
            user_name={user?.name ?? ""}
            busy={busy_tier === "secondary"}
            on_billing_details={() =>
              set_schedule_target({ kind: "ins", tier: "secondary", title: "Secondary Insurance" })
            }
            on_update_periodic={() => on_update_periodic("secondary")}
          />
        </div>
      </div>

      <FooterBar>
        <PlanButton tone="danger" on_click={on_delete} disabled={!record || saving}>
          <Trash2 className="w-3 h-3" /> Delete Plan
        </PlanButton>
        <PlanButton tone="primary" on_click={on_save} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Ortho
          Plan
        </PlanButton>
        <PlanButton tone="dark" on_click={() => navigate(`/patient/${patient_id}/overview`)}>
          <X className="w-3 h-3" /> Close
        </PlanButton>
      </FooterBar>

      {schedule_target?.kind === "patient" && (
        <BillingDetailsModal
          title="Billing Details — Patient Payment Plan"
          rows={patient_schedule}
          projected_note="This schedule is projected from the plan terms. ortho_plans stores only the summary figures, so patient instalments have no posted/unposted state yet (gap OPP-9)."
          on_close={() => set_schedule_target(null)}
        />
      )}
      {schedule_target?.kind === "ins" && (
        <BillingDetailsModal
          title={`Billing Details — ${schedule_target.title}`}
          rows={ins_schedule(schedule_target.tier)}
          load={() => loadInsSchedule(patient_id, schedule_target.tier)}
          on_close={() => set_schedule_target(null)}
        />
      )}

      {show_remarks && (
        <RemarksModal
          value={form.pat_notes}
          on_change={(v) => update({ pat_notes: v })}
          on_close={() => set_show_remarks(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insurance sub-plan column
// ---------------------------------------------------------------------------

function InsuranceColumn({
  title,
  tier,
  form,
  errors,
  update,
  recalc,
  insurance_slots,
  user_name,
  busy,
  on_billing_details,
  on_update_periodic,
}: {
  title: string;
  tier: InsTier;
  form: OrthoPlanForm;
  errors: Record<string, string>;
  update: (patch: Partial<OrthoPlanForm>) => void;
  recalc: () => void;
  insurance_slots: PlanContext["insurance_slots"];
  user_name: string;
  busy: boolean;
  on_billing_details: () => void;
  on_update_periodic: () => void;
}) {
  const p = tier === "primary";
  const enabled = p ? form.ins_plan_enabled : form.sec_ins_plan_enabled;
  const gap = p ? "OPP-7" : "OPP-8";

  // Field accessors keep the JSX below symmetric across the two tiers while the
  // form itself stays flat and snake_case, matching the backend columns.
  const v = {
    plan_id: p ? form.ins_plan_id : form.sec_ins_plan_id,
    setup_date: p ? form.ins_setup_date : form.sec_ins_setup_date,
    first_due_date: p ? form.ins_first_due_date : form.sec_ins_first_due_date,
    interval: p ? form.ins_interval : form.sec_ins_interval,
    plan_amount: p ? form.ins_plan_amount : form.sec_ins_plan_amount,
    down_pay: p ? form.ins_down_pay : form.sec_ins_down_pay,
    num_payments: p ? form.ins_num_payments : form.sec_ins_num_payments,
    periodic_amt: p ? form.ins_periodic_amt : form.sec_ins_periodic_amt,
    rem_payments: p ? form.ins_rem_payments : form.sec_ins_rem_payments,
    rem_amt: p ? form.ins_rem_amt : form.sec_ins_rem_amt,
    print_fee: p ? form.ins_mon_claim_print_fee : form.sec_ins_mon_claim_print_fee,
    suppress: p ? form.ins_suppress_periodic_printing : form.sec_ins_suppress_periodic_printing,
    notes: p ? form.ins_notes : form.sec_ins_notes,
  };
  const set = (key: keyof typeof v, value: string | boolean) => {
    const prefix = p ? "ins_" : "sec_ins_";
    const map: Record<string, string> = {
      plan_id: `${prefix}plan_id`,
      setup_date: `${prefix}setup_date`,
      first_due_date: `${prefix}first_due_date`,
      interval: `${prefix}interval`,
      plan_amount: `${prefix}plan_amount`,
      down_pay: `${prefix}down_pay`,
      num_payments: `${prefix}num_payments`,
      periodic_amt: `${prefix}periodic_amt`,
      rem_payments: `${prefix}rem_payments`,
      rem_amt: `${prefix}rem_amt`,
      print_fee: `${prefix}mon_claim_print_fee`,
      suppress: `${prefix}suppress_periodic_printing`,
      notes: `${prefix}notes`,
    };
    update({ [map[key]!]: value } as unknown as Partial<OrthoPlanForm>);
  };

  const err = (k: string) => errors[k];
  // Only the primary tier's own fields are validated by name today.
  const amount_error = p ? err("ins_plan_amount") : err("sec_ins_plan_amount");
  const count_error = p ? err("ins_num_payments") : undefined;
  const due_error = p ? err("ins_first_due_date") : undefined;

  const slots = insurance_slots.filter((s) =>
    p ? s.insurance_type === "primary" : s.insurance_type === "secondary",
  );
  const fallback_slots = slots.length ? slots : insurance_slots;

  return (
    <Block
      title={title}
      enabled_toggle={{ checked: enabled, on_change: (val) => set_enabled(val), label: title }}
    >
      <fieldset disabled={!enabled} className="disabled:opacity-55">
        <div className="border-2 border-[#E2E8F0] rounded overflow-hidden">
          <Row label="Insurance Plan">
            <Select value={v.plan_id} on_change={(val) => set("plan_id", val)}>
              <option value="">Please Select</option>
              {fallback_slots.map((s) => (
                <option key={s.ins_plan_id} value={String(s.ins_plan_id)}>
                  {s.label}
                  {s.ortho_remaining ? ` — Ortho rem. ${money(s.ortho_remaining)}` : ""}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Plan Setup Date" not_saved={p ? undefined : gap}>
            <DateInput value={v.setup_date} on_change={(val) => set("setup_date", val)} />
          </Row>
          <Row
            label="1st Per. Billing Date"
            required={p}
            error={due_error}
            not_saved={p ? undefined : gap}
          >
            <DateInput
              value={v.first_due_date}
              invalid={Boolean(due_error)}
              on_change={(val) => set("first_due_date", val)}
            />
          </Row>
          <Row label="Interval" not_saved={p ? undefined : gap}>
            <Select
              value={v.interval}
              on_change={(val) => {
                set("interval", val);
                setTimeout(recalc, 0);
              }}
            >
              {INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Plan Amount" required error={amount_error}>
            <MoneyInput
              value={v.plan_amount}
              invalid={Boolean(amount_error)}
              on_change={(val) => set("plan_amount", val)}
              on_blur={recalc}
            />
          </Row>
          <Row label="Down Payment" not_saved={p ? undefined : gap}>
            <MoneyInput
              value={v.down_pay}
              on_change={(val) => set("down_pay", val)}
              on_blur={recalc}
            />
          </Row>
          <Row label="Payments / Payment Amt." required={p} error={count_error}>
            <div className="flex items-center gap-1.5">
              <div className="w-20">
                <NumberInput
                  value={v.num_payments}
                  invalid={Boolean(count_error)}
                  on_change={(val) => set("num_payments", val)}
                  on_blur={recalc}
                />
              </div>
              <div className="flex-1">
                <MoneyInput
                  value={v.periodic_amt}
                  on_change={(val) => set("periodic_amt", val)}
                  on_blur={() => set("periodic_amt", dec(v.periodic_amt))}
                />
              </div>
            </div>
          </Row>
          <Row label="Rem Payments / Rem Amt." not_saved={p ? undefined : gap}>
            <div className="flex items-center gap-1.5">
              <div className="w-20">
                <NumberInput value={v.rem_payments} on_change={(val) => set("rem_payments", val)} />
              </div>
              <div className="flex-1">
                <MoneyInput
                  value={v.rem_amt}
                  on_change={(val) => set("rem_amt", val)}
                  on_blur={() => set("rem_amt", dec(v.rem_amt))}
                />
              </div>
            </div>
          </Row>
          <Row label="Mon. claim Print Fee" not_saved="OPP-7">
            <MoneyInput
              value={v.print_fee}
              on_change={(val) => set("print_fee", val)}
              on_blur={() => set("print_fee", dec(v.print_fee))}
            />
          </Row>
          <Row label="Periodic Printing">
            <Checkbox
              checked={v.suppress}
              on_change={(val) => set("suppress", val)}
              label={
                <span className="flex items-center gap-1">
                  Suppress Periodic Printing <NotSavedBadge gap="OPP-7" />
                </span>
              }
            />
          </Row>
        </div>

        <div className="mt-2.5">
          <NotesBox
            title="Notes"
            value={v.notes}
            on_change={(val) => set("notes", val)}
            on_stamp={() =>
              set(
                "notes",
                `${v.notes}${v.notes && !v.notes.endsWith("\n") ? "\n" : ""}${time_stamp(user_name)} — `,
              )
            }
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <PlanButton on_click={on_billing_details}>
            <ListOrdered className="w-3 h-3" /> Billing Details
          </PlanButton>
          <PlanButton
            tone="primary"
            on_click={on_update_periodic}
            disabled={busy}
            title="Rewrite the unbilled periodic instalments from the terms above"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}{" "}
            Update Periodic Billing
          </PlanButton>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-[#94A3B8]">
          {interval_label(v.interval)} billing from {fmt_date(v.first_due_date)} — already-billed
          instalments are never rewritten.
        </p>
      </fieldset>
    </Block>
  );

  function set_enabled(val: boolean) {
    update(
      (p
        ? { ins_plan_enabled: val }
        : { sec_ins_plan_enabled: val }) as Partial<OrthoPlanForm>,
    );
  }
}

// ---------------------------------------------------------------------------
// Remarks pop-out (legacy "REMARKS" button)
// ---------------------------------------------------------------------------

function RemarksModal({
  value,
  on_change,
  on_close,
}: {
  value: string;
  on_change: (v: string) => void;
  on_close: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/45 flex items-start justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Plan remarks"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) on_close();
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mt-16 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide">Remarks</h2>
          <button type="button" onClick={on_close} aria-label="Close" className="text-white p-1 rounded hover:bg-white/15">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-3 space-y-2">
          <Notice>
            Remarks share the patient sub-plan notes box; <code>ortho_plans</code> has no separate
            patient-notes column, so neither is persisted yet (gap OPP-4).
          </Notice>
          <textarea
            value={value}
            rows={8}
            onChange={(e) => on_change(e.target.value)}
            className="w-full px-2 py-1.5 border-2 border-[#E2E8F0] rounded text-[13px] focus:outline-none focus:border-[#3A6EA5]"
          />
        </div>
        <footer className="px-3 py-2 bg-[#F1F5F9] border-t-2 border-[#E2E8F0] flex justify-end">
          <PlanButton tone="dark" on_click={on_close}>
            Done
          </PlanButton>
        </footer>
      </div>
    </div>
  );
}

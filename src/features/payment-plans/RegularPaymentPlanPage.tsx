// Regular Payment Plan — legacy Denticon "Regular Payment Plan" screen.
//
// Layout mirrors the legacy screen exactly: the two "MOVE TO CONTRACT" balance
// pullers across the top, the three-column CONTRACT worksheet (the numbered
// 1-5 amount ladder, the plan terms, the derived billing figures), the PAYMENT
// METHOD block beside NOTES + the financial-disclosure picker, and the
// PRINT CONTRACT / PRINT COUPONS / BILLING DETAILS / SAVE / DELETE CONTRACT /
// CANCEL footer.
//
// Bound to /patient-payment-plans (snake_case, straight through). Fields the
// backend has no column for carry a small amber gap marker — see
// docs/payment-plans/payment_plans_backend_devreport.md.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Save, X, Trash2, Printer, Ticket, ListOrdered, ArrowRight, Eraser } from "lucide-react";
import type { PatientBalance, PatientPaymentPlanRead } from "@/api/generated/model";
import { useAuth } from "@/contexts/AuthContext";
import { useDefinitions } from "@/hooks/useDefinitions";
import {
  loadBalance,
  loadPlanContext,
  loadRegularPlan,
  saveRegularPlan,
  removeRegularPlan,
  office_header,
  type PlanContext,
} from "./paymentPlanService";
import {
  INTERVALS,
  REGULAR_BILLING_CODE,
  amortise,
  build_schedule,
  dec,
  empty_regular_form,
  from_periodic,
  int,
  money,
  num,
  regular_body,
  regular_form_from,
  time_stamp,
  today_iso,
  validate_regular,
  add_interval,
  type RegularPlanForm,
} from "./planModel";
import {
  Block,
  Checkbox,
  DateInput,
  MoneyInput,
  Notice,
  NotesBox,
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

const CARD_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function RegularPaymentPlanPage() {
  const { patient } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patient_id = Number(patient.id);
  const office_id = patient.officeId ? Number(patient.officeId) : null;

  const [loading, set_loading] = useState(true);
  const [saving, set_saving] = useState(false);
  const [record, set_record] = useState<PatientPaymentPlanRead | null>(null);
  const [ctx, set_ctx] = useState<PlanContext | null>(null);
  const [balance, set_balance] = useState<PatientBalance | null>(null);
  const [form, set_form] = useState<RegularPlanForm>(() => empty_regular_form());
  const [errors, set_errors] = useState<Record<string, string>>({});
  const [show_schedule, set_show_schedule] = useState(false);
  const [tx_plan_pick, set_tx_plan_pick] = useState("");

  const { definitions: payment_defs } = useDefinitions("payment_method");

  const update = useCallback(
    (patch: Partial<RegularPlanForm>) => set_form((prev) => ({ ...prev, ...patch })),
    [],
  );

  // --- load ---------------------------------------------------------------
  const load = useCallback(async () => {
    if (!Number.isFinite(patient_id)) return;
    set_loading(true);
    try {
      const [row, context] = await Promise.all([
        loadRegularPlan(patient_id),
        loadPlanContext(patient_id),
      ]);
      set_record(row);
      set_ctx(context);
      set_form(row ? regular_form_from(row) : empty_regular_form());
      const first_plan = context.treatment_plans[0];
      set_tx_plan_pick(row?.tx_plan_number || first_plan?.id || "");
    } catch {
      toast.error("Could not load the payment plan for this patient.");
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

  // --- derived amounts ----------------------------------------------------
  // Lines 3 and 5 of the legacy ladder are always computed, never typed.
  useEffect(() => {
    const total = num(form.patient_balance_amount) + num(form.tx_plan_amount);
    const financed = Math.max(0, total - num(form.down_payment));
    const next_total = dec(total);
    const next_financed = dec(financed);
    if (form.total_plan_amount !== next_total || form.amt_financed !== next_financed) {
      set_form((prev) => ({ ...prev, total_plan_amount: next_total, amt_financed: next_financed }));
    }
  }, [form.patient_balance_amount, form.tx_plan_amount, form.down_payment, form.total_plan_amount, form.amt_financed]);

  /** Legacy recalculates the payment figures whenever the terms change. */
  const recalc_from_terms = useCallback(() => {
    set_form((prev) => {
      const n = int(prev.num_payments);
      if (n <= 0) return prev;
      const a = amortise(num(prev.amt_financed), num(prev.apr), n, prev.interval_type);
      return {
        ...prev,
        periodic_amt: dec(a.periodic_amt),
        fin_charge: dec(a.fin_charge),
        total_of_payments: dec(a.total_of_payments),
        // A brand-new contract starts with everything still outstanding.
        rem_payments: prev.rem_payments === "" ? String(n) : prev.rem_payments,
        rem_total_amt: prev.rem_total_amt === "" ? dec(a.total_of_payments) : prev.rem_total_amt,
      };
    });
  }, []);

  /** Staff typed a periodic payment directly — keep it, re-derive the rest. */
  const recalc_from_periodic = useCallback(() => {
    set_form((prev) => {
      const n = int(prev.num_payments);
      if (n <= 0 || num(prev.periodic_amt) <= 0) return prev;
      const a = from_periodic(num(prev.amt_financed), num(prev.periodic_amt), n);
      return { ...prev, fin_charge: dec(a.fin_charge), total_of_payments: dec(a.total_of_payments) };
    });
  }, []);

  const schedule = useMemo(
    () =>
      build_schedule(
        form.first_due_date,
        form.interval_type,
        int(form.num_payments),
        num(form.periodic_amt),
        num(form.total_of_payments),
      ),
    [form.first_due_date, form.interval_type, form.num_payments, form.periodic_amt, form.total_of_payments],
  );

  const current_patient_balance =
    balance?.patient_balance ?? balance?.account_balance ?? patient.balance ?? 0;
  const selected_tx_plan = ctx?.treatment_plans.find((p) => p.id === tx_plan_pick) ?? null;
  const tx_plan_balance = num(selected_tx_plan?.est_patient);

  // --- actions ------------------------------------------------------------
  const on_save = async () => {
    const found = validate_regular(form);
    set_errors(found);
    if (Object.keys(found).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    set_saving(true);
    try {
      const body = regular_body({ ...form, tx_plan_number: tx_plan_pick }, patient_id, office_id);
      const saved = await saveRegularPlan(record?.id ?? null, body);
      set_record(saved);
      set_form(regular_form_from(saved));
      toast.success(record ? "Contract updated." : "Contract created.");
    } catch {
      toast.error("Could not save the contract.");
    } finally {
      set_saving(false);
    }
  };

  const on_delete = async () => {
    if (!record) return;
    if (!window.confirm("Delete this contract? The payment schedule will no longer be billed.")) return;
    set_saving(true);
    try {
      await removeRegularPlan(record.id);
      toast.success("Contract deleted.");
      set_record(null);
      set_form(empty_regular_form());
    } catch {
      toast.error("Could not delete the contract.");
    } finally {
      set_saving(false);
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

  const contract_terms = {
    title: "Regular Payment Plan",
    worksheet: [
      ["1. Patient Balance Amount", money(form.patient_balance_amount)],
      ["2. Treatment Plan Amount", money(form.tx_plan_amount)],
      ["3. Total Plan Amount (1 + 2)", money(form.total_plan_amount)],
      ["4. Down Payment Amount", money(form.down_payment)],
      ["5. Amount Financed (3 - 4)", money(form.amt_financed)],
      ["Plan Setup Date", form.setup_date],
      ["Billing Code", REGULAR_BILLING_CODE],
    ] as Array<[string, string]>,
    disclosure_box: [
      [`${dec(form.apr)}%`, money(form.fin_charge), money(form.amt_financed)],
    ] as Array<[string, string, string]>,
    interval: form.interval_type,
    num_payments: int(form.num_payments),
    periodic_amt: num(form.periodic_amt),
    first_due_date: form.first_due_date,
    disclosure_key: form.disclosure,
    notes: form.notes,
  };

  const on_print_contract = () => printPdf(buildContractPdf(contract_header, contract_terms, schedule));
  const on_print_coupons = () => printPdf(buildCouponsPdf(contract_header, contract_terms, schedule));

  if (!Number.isFinite(patient_id)) {
    return <div className="p-6 text-sm text-[#B91C1C]">Invalid patient id in the URL.</div>;
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[400px] text-[#64748B]">
        <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin" />
        Loading payment plan…
      </div>
    );
  }

  const err = (k: string) => errors[k];

  return (
    <div className="p-3 sm:p-4 bg-[#F7F9FC] print:bg-white">
      {/* Legacy title bar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-t-md bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] flex-wrap">
        <h1 className="text-white font-bold text-sm uppercase tracking-wide">Regular Payment Plan</h1>
        <span className="text-white text-xs font-semibold">
          {record ? `Payment Plan ID ${record.id}` : "New contract"}
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

        {/* --- MOVE TO CONTRACT pullers ------------------------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-2.5 flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-[#475569] flex-1 min-w-[150px]">
              Current Patient Balance
            </span>
            <div className="w-32">
              <ReadOnly value={money(current_patient_balance)} />
            </div>
            <PlanButton
              tone="primary"
              title="Copy the live patient balance into line 1"
              on_click={() => update({ patient_balance_amount: dec(current_patient_balance) })}
            >
              <ArrowRight className="w-3 h-3" /> Move to Contract
            </PlanButton>
          </div>

          <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-2.5 flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-[#475569] whitespace-nowrap">
              Treatment Plan Patient Balance for ID
            </span>
            <div className="w-40">
              <Select value={tx_plan_pick} on_change={set_tx_plan_pick}>
                <option value="">— none —</option>
                {(ctx?.treatment_plans ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-28">
              <ReadOnly value={money(tx_plan_balance)} />
            </div>
            <PlanButton
              tone="primary"
              disabled={!selected_tx_plan}
              title="Copy the treatment plan's estimated patient portion into line 2"
              on_click={() => update({ tx_plan_amount: dec(tx_plan_balance) })}
            >
              <ArrowRight className="w-3 h-3" /> Move to Contract
            </PlanButton>
          </div>
        </div>

        {/* --- CONTRACT ---------------------------------------------------- */}
        <Block title="Contract">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4">
            {/* Ladder 1..5 */}
            <div className="border-2 border-[#E2E8F0] rounded overflow-hidden">
              <Row label="1. Patient Balance Amount">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <MoneyInput
                      value={form.patient_balance_amount}
                      on_change={(v) => update({ patient_balance_amount: v })}
                      on_blur={() => update({ patient_balance_amount: dec(form.patient_balance_amount) })}
                    />
                  </div>
                  <PlanButton on_click={() => update({ patient_balance_amount: "" })} title="Clear">
                    <Eraser className="w-3 h-3" /> Clear
                  </PlanButton>
                </div>
              </Row>
              <Row label="2. Treatment Plan Amount" not_saved="RPP-1">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <MoneyInput
                      value={form.tx_plan_amount}
                      on_change={(v) => update({ tx_plan_amount: v })}
                      on_blur={() => update({ tx_plan_amount: dec(form.tx_plan_amount) })}
                    />
                  </div>
                  <PlanButton on_click={() => update({ tx_plan_amount: "" })} title="Clear">
                    <Eraser className="w-3 h-3" /> Clear
                  </PlanButton>
                </div>
              </Row>
              <Row label="3. Total Plan Amount (1 + 2)" required error={err("total_plan_amount")}>
                <ReadOnly value={money(form.total_plan_amount)} />
              </Row>
              <Row label="4. Down Payment Amount" error={err("down_payment")}>
                <MoneyInput
                  value={form.down_payment}
                  invalid={Boolean(err("down_payment"))}
                  on_change={(v) => update({ down_payment: v })}
                  on_blur={() => {
                    update({ down_payment: dec(form.down_payment) });
                    recalc_from_terms();
                  }}
                />
              </Row>
              <Row label="5. Amount Financed (3 - 4)" required error={err("amt_financed")}>
                <ReadOnly value={money(form.amt_financed)} />
              </Row>
            </div>

            {/* Plan terms */}
            <div className="border-2 border-[#E2E8F0] rounded overflow-hidden mt-3 lg:mt-0">
              <Row label="Payment Plan ID">
                <ReadOnly value={record ? String(record.id) : "— assigned on save —"} align="left" />
              </Row>
              <Row label="Plan Setup Date" required error={err("setup_date")}>
                <DateInput
                  value={form.setup_date}
                  invalid={Boolean(err("setup_date"))}
                  on_change={(v) => update({ setup_date: v })}
                />
              </Row>
              <Row label="APR" required error={err("apr")}>
                <PercentInput
                  value={form.apr}
                  invalid={Boolean(err("apr"))}
                  on_change={(v) => update({ apr: v })}
                  on_blur={() => {
                    update({ apr: dec(form.apr) });
                    recalc_from_terms();
                  }}
                />
              </Row>
              <Row label="Interval">
                <Select
                  value={form.interval_type}
                  on_change={(v) => {
                    update({ interval_type: v });
                    setTimeout(recalc_from_terms, 0);
                  }}
                >
                  {INTERVALS.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label="No. of Payments" required error={err("num_payments")}>
                <NumberInput
                  value={form.num_payments}
                  invalid={Boolean(err("num_payments"))}
                  on_change={(v) => update({ num_payments: v })}
                  on_blur={recalc_from_terms}
                />
              </Row>
              <Row label="Periodic Payment" hint="Blank recalculates from the APR and payment count.">
                <MoneyInput
                  value={form.periodic_amt}
                  on_change={(v) => update({ periodic_amt: v })}
                  on_blur={() => (num(form.periodic_amt) > 0 ? recalc_from_periodic() : recalc_from_terms())}
                />
              </Row>
            </div>

            {/* Derived billing figures */}
            <div className="border-2 border-[#E2E8F0] rounded overflow-hidden mt-3 lg:mt-0">
              <Row label="Billing Code" not_saved="RPP-2">
                <ReadOnly value={REGULAR_BILLING_CODE} align="left" />
              </Row>
              <Row label="First Billing Date" required error={err("first_due_date")}>
                <DateInput
                  value={form.first_due_date}
                  invalid={Boolean(err("first_due_date"))}
                  on_change={(v) => update({ first_due_date: v })}
                />
              </Row>
              <Row label="Finance Charge">
                <MoneyInput
                  value={form.fin_charge}
                  on_change={(v) => update({ fin_charge: v })}
                  on_blur={() =>
                    update({
                      fin_charge: dec(form.fin_charge),
                      total_of_payments: dec(num(form.amt_financed) + num(form.fin_charge)),
                    })
                  }
                />
              </Row>
              <Row label="Total of Payments">
                <ReadOnly value={money(form.total_of_payments)} />
              </Row>
              <Row label="Remaining # of Payments" required error={err("rem_payments")}>
                <NumberInput
                  value={form.rem_payments}
                  invalid={Boolean(err("rem_payments"))}
                  on_change={(v) => update({ rem_payments: v })}
                />
              </Row>
              <Row label="Remaining Amount">
                <MoneyInput
                  value={form.rem_total_amt}
                  on_change={(v) => update({ rem_total_amt: v })}
                  on_blur={() => update({ rem_total_amt: dec(form.rem_total_amt) })}
                />
              </Row>
            </div>
          </div>

          {form.first_due_date === "" && int(form.num_payments) > 0 && (
            <div className="mt-2">
              <PlanButton
                on_click={() =>
                  update({ first_due_date: add_interval(form.setup_date || today_iso(), form.interval_type, 1) })
                }
              >
                Set first billing date one interval after setup
              </PlanButton>
            </div>
          )}
        </Block>

        {/* --- PAYMENT METHOD | NOTES -------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <Block title="Payment Method">
            <div className="space-y-2">
              <Notice>
                Card details are shown for parity with the legacy screen but are{" "}
                <strong>not stored</strong> — <code>patient_payment_plans</code> has no payment-method
                columns and card capture needs a PCI-compliant vault. See gap RPP-4.
              </Notice>
              <div className="border-2 border-[#E2E8F0] rounded overflow-hidden">
                <Row label="Payment Code" not_saved="RPP-4">
                  <Select value={form.payment_code} on_change={(v) => update({ payment_code: v })}>
                    <option value="">Please Select</option>
                    {payment_defs.map((d) => (
                      <option key={d.id} value={d.key1 ?? String(d.id)}>
                        {d.key1 ? `${d.key1} - ${d.description}` : d.description}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label="Card Holder" not_saved="RPP-4">
                  <TextInput value="" disabled placeholder="Requires payment vault" />
                </Row>
                <Row label="Card #" not_saved="RPP-4">
                  <TextInput value="" disabled placeholder="Requires payment vault" />
                </Row>
                <Row label="Expiration Date (MM/YY)" not_saved="RPP-4">
                  <div className="flex gap-1.5">
                    <Select value={form.card_exp_month} disabled>
                      {CARD_MONTHS.map((m, i) => (
                        <option key={m} value={String(i + 1).padStart(2, "0")}>
                          {m}
                        </option>
                      ))}
                    </Select>
                    <Select value={form.card_exp_year} disabled>
                      {Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i)).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Row>
                <Row label="CVV #" not_saved="RPP-4">
                  <TextInput value="" disabled placeholder="Never stored" />
                </Row>
                <Row label="">
                  <Checkbox
                    checked={form.post_down_payment_with_card}
                    disabled
                    label="Post down payment using this Credit Card"
                  />
                </Row>
              </div>
            </div>
          </Block>

          <Block title="Notes">
            <div className="space-y-2">
              <NotesBox
                title="Contract Notes"
                value={form.notes}
                rows={7}
                on_change={(v) => update({ notes: v })}
                on_stamp={() =>
                  update({
                    notes: `${form.notes}${form.notes && !form.notes.endsWith("\n") ? "\n" : ""}${time_stamp(
                      user?.name ?? "",
                    )} — `,
                  })
                }
              />
              <div className="border-2 border-[#E2E8F0] rounded overflow-hidden">
                <Row label="Financial Disclosure to print on contract report" not_saved="RPP-3">
                  <Select value={form.disclosure} on_change={(v) => update({ disclosure: v })}>
                    {Object.keys(DISCLOSURES).map((k) => (
                      <option key={k} value={k}>
                        {k === "None" ? "None" : `.${k}`}
                      </option>
                    ))}
                  </Select>
                </Row>
              </div>
            </div>
          </Block>
        </div>
      </div>

      {/* --- Footer -------------------------------------------------------- */}
      <FooterBar>
        <PlanButton on_click={on_print_contract} disabled={int(form.num_payments) <= 0}>
          <Printer className="w-3 h-3" /> Print Contract
        </PlanButton>
        <PlanButton on_click={on_print_coupons} disabled={schedule.length === 0}>
          <Ticket className="w-3 h-3" /> Print Coupons
        </PlanButton>
        <PlanButton on_click={() => set_show_schedule(true)} disabled={schedule.length === 0}>
          <ListOrdered className="w-3 h-3" /> Billing Details
        </PlanButton>
        <PlanButton tone="primary" on_click={on_save} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
        </PlanButton>
        <PlanButton tone="danger" on_click={on_delete} disabled={!record || saving}>
          <Trash2 className="w-3 h-3" /> Delete Contract
        </PlanButton>
        <PlanButton tone="dark" on_click={() => navigate(`/patient/${patient_id}/overview`)}>
          <X className="w-3 h-3" /> Cancel
        </PlanButton>
      </FooterBar>

      {show_schedule && (
        <BillingDetailsModal
          title="Billing Details — Regular Payment Plan"
          rows={schedule}
          projected_note="This schedule is projected from the contract terms. There is no backend store for regular-contract instalments yet (gap RPP-5), so posted/unposted state is not shown."
          on_close={() => set_show_schedule(false)}
        />
      )}
    </div>
  );
}

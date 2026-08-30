// Insurance Payment window (legacy "Insurance Payment").
//
// Opened from INSURANCE PAYMENT on the claim screen. It used to offer three
// numeric columns per procedure and nothing else — no payment date, amount,
// cheque/bank/EOB identifiers, payment type, notes, claim summary or close-claim
// option — so a carrier remittance could be split across procedures but never
// identified or reconciled.
//
// It now records the whole remittance: the header identifiers go on every line
// through `POST /ledger-insurance-details/payment` (`recordInsurancePayment`,
// the endpoint the backend added for INS-1), the claim is recalculated, an EOB
// can be attached to the claim, and the claim is closed only when asked.
//
// "Insurance Check to Previous Balance" posts an unallocated carrier payment to
// the patient's balance via `POST /patient-payments` instead — the legacy
// classification radio decides which of the two write paths runs.

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, DollarSign, Loader2, Paperclip, X } from "lucide-react";
import {
  recordInsurancePayment,
  recalculateClaim,
  setClaimStatus,
  updateInsuranceClaim,
  uploadClaimAttachment,
  createPatientPayment,
} from "@/api/generated/endpoints/billing/billing";
import { listPatientInsurance } from "@/api/generated/endpoints/patients/patients";
import { getInsuranceSubscriber } from "@/api/generated/endpoints/insurance/insurance";
import { getOffice } from "@/api/generated/endpoints/organization/organization";
import type {
  ClaimDetailClaimRead,
  ClaimDetailCoverageRead,
  ClaimDetailProcedureRead,
  InsurancePaymentCreate,
} from "@/api/generated/model";
import { useDefinitions } from "@/hooks/useDefinitions";
import { useProviderDirectory } from "@/hooks/useProviderDirectory";
import { procedureCodes } from "../../data/procedureCodes";
import { claimStatusLabel } from "./claimStatus";
import {
  buildProcedureLines,
  cents,
  distributeAdjustment,
  distributeByRemaining,
  emptyLineEntry,
  FALLBACK_PAYMENT_METHODS,
  fmtDate,
  money,
  num,
  paymentKind,
  todayIso,
  totalsFor,
  validatePayment,
  type LineEntry,
  type PaymentHeader,
} from "./insurancePayment";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimDetailClaimRead;
  procedures: ClaimDetailProcedureRead[];
  coverage: ClaimDetailCoverageRead[];
  carrierName?: string;
  /** Called after the remittance posts and the claim recalculates. */
  onPosted: () => void;
}

const genId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

const errMsg = (err: unknown): string | undefined =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
  (err as { message?: string })?.message;

const INPUT =
  "px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#1F3A5F] disabled:bg-slate-100 disabled:text-slate-400";
const CELL_INPUT = `${INPUT} w-24 text-right`;
const LABEL = "text-xs text-slate-600";
const SECTION =
  "bg-[#E8EFF7] px-3 py-1.5 border-b border-[#E2E8F0] text-xs font-bold text-[#1F3A5F] uppercase tracking-wide";

export default function InsurancePaymentModal({
  isOpen,
  onClose,
  claim,
  procedures,
  coverage,
  carrierName,
  onPosted,
}: Props) {
  const [header, setHeader] = useState<PaymentHeader>(() => ({
    mode: "claims",
    payment_date: todayIso(),
    payment_amount: "",
    payment_method: "",
    check_number: "",
    bank_number: "",
    eob_number: "",
    eft_trace_number: "",
    notes: "",
    close_claim: false,
  }));
  const [entries, setEntries] = useState<Record<string, LineEntry>>({});
  const [writeOffEnabled, setWriteOffEnabled] = useState(false);
  const [adjustMode, setAdjustMode] = useState<"amount" | "percent">("amount");
  const [adjustValue, setAdjustValue] = useState("");
  const [eobFile, setEobFile] = useState<File | null>(null);
  const [subscriberName, setSubscriberName] = useState<string>("");
  const [subscriberId, setSubscriberId] = useState<string>("");
  const [officeLabel, setOfficeLabel] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [postError, setPostError] = useState<string | null>(null);

  const { definitions: methodDefs } = useDefinitions("payment_method");
  const { providerLabel } = useProviderDirectory(claim.office_id ?? null);

  const describe = useMemo(() => {
    const byCode = new Map(procedureCodes.map((c) => [c.code, c.description]));
    return (code: string) => byCode.get(code) ?? code;
  }, []);

  const lines = useMemo(
    () => buildProcedureLines(claim, procedures, coverage, describe),
    [claim, procedures, coverage, describe],
  );

  // Seed one entry per line the first time the window opens for this claim.
  useEffect(() => {
    setEntries(Object.fromEntries(lines.map((l) => [l.procedure_id, emptyLineEntry()])));
  }, [lines]);

  // Subscriber + office are claim context the composed claim payload does not carry.
  useEffect(() => {
    let cancelled = false;
    listPatientInsurance({ patient_id: claim.patient_id, size: 50 })
      .then(async (res) => {
        const rows = res.items ?? [];
        const match =
          rows.find((r) => claim.ins_plan_id != null && r.ins_plan_id === claim.ins_plan_id) ?? rows[0];
        if (!match?.subscriber_id || cancelled) return;
        const sub = await getInsuranceSubscriber(match.subscriber_id);
        if (cancelled) return;
        setSubscriberName(
          [sub.sub_last_name, sub.sub_first_name].filter(Boolean).join(", ") || "",
        );
        setSubscriberId(sub.sub_member_id || "");
      })
      .catch(() => {
        /* context only — the window still posts without it */
      });
    return () => {
      cancelled = true;
    };
  }, [claim.patient_id, claim.ins_plan_id]);

  useEffect(() => {
    let cancelled = false;
    if (claim.office_id == null) return;
    getOffice(claim.office_id)
      .then((o) => {
        if (!cancelled) setOfficeLabel(o.short_id || o.name || String(claim.office_id));
      })
      .catch(() => {
        if (!cancelled) setOfficeLabel(String(claim.office_id));
      });
    return () => {
      cancelled = true;
    };
  }, [claim.office_id]);

  const methodOptions = useMemo(() => {
    const fromDefs = methodDefs
      .map((d) => ({ value: d.key1 || d.description || "", label: d.description || d.key1 || "" }))
      .filter((o) => o.value);
    return fromDefs.length > 0 ? fromDefs : FALLBACK_PAYMENT_METHODS;
  }, [methodDefs]);

  const kind = paymentKind(header.payment_method);
  const totals = totalsFor(header, lines, entries);
  // The payer tier lives in `billing_order` ("primary" / "secondary"); `claim_type`
  // is the category ("dental" / "medical"), so it is only a fallback here.
  const tierSource = (claim.billing_order || claim.claim_type || "").toLowerCase();
  const isSecondary = /^s$|second/.test(tierSource);

  // Claim summary row, from the same numbers the grid shows.
  const claimSummary = useMemo(() => {
    const charges = num(claim.total_billed);
    const estIns = lines.reduce((t, l) => t + l.est_ins, 0);
    const dedUsed = lines.reduce((t, l) => t + l.ded_used, 0);
    const paid = lines.reduce((t, l) => t + l.ins_paid, 0);
    const adjust = lines.reduce((t, l) => t + l.ins_adjust, 0);
    return {
      charges,
      estIns: cents(estIns),
      dedUsed: cents(dedUsed),
      paid: cents(paid),
      adjust: cents(adjust),
      remaining: Math.max(cents(estIns - paid - adjust), 0),
    };
  }, [claim.total_billed, lines]);

  const setField = <K extends keyof PaymentHeader>(key: K, value: PaymentHeader[K]) => {
    setHeader((prev) => ({ ...prev, [key]: value }));
    setErrors([]);
    setPostError(null);
  };

  const setEntry = (id: string, field: keyof LineEntry, value: LineEntry[keyof LineEntry]) => {
    setEntries((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyLineEntry()), [field]: value },
    }));
    setErrors([]);
  };

  const selectedLines = lines.filter((l) => entries[l.procedure_id]?.selected);

  /** Fill New Amt across the selected lines from the payment amount. */
  const distribute = () => {
    const spread = distributeByRemaining(num(header.payment_amount), selectedLines);
    setEntries((prev) => {
      const next = { ...prev };
      for (const line of lines) {
        const e = next[line.procedure_id] ?? emptyLineEntry();
        next[line.procedure_id] = { ...e, paid: e.selected ? (spread[line.procedure_id] ?? "") : "" };
      }
      return next;
    });
    setErrors([]);
  };

  /** Fill Write-Off across the selected lines from the claim-level adjustment. */
  const applyAdjustment = () => {
    const spread = distributeAdjustment(adjustMode, num(adjustValue), selectedLines);
    setEntries((prev) => {
      const next = { ...prev };
      for (const line of lines) {
        const e = next[line.procedure_id] ?? emptyLineEntry();
        next[line.procedure_id] = {
          ...e,
          write_off: e.selected ? (spread[line.procedure_id] ?? "") : "",
        };
      }
      return next;
    });
    setErrors([]);
  };

  const handlePost = async () => {
    const found = validatePayment({ header, lines, entries });
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    setErrors([]);
    setPostError(null);

    try {
      if (header.mode === "previous_balance") {
        // No claim allocation — an unapplied carrier credit on the account.
        await createPatientPayment({
          id: genId(),
          patient_id: claim.patient_id,
          office_id: claim.office_id ?? null,
          payment_date: header.payment_date,
          amount: num(header.payment_amount).toFixed(2),
          payment_type: "insurance",
          payment_method: header.payment_method,
          ...(header.check_number ? { check_number: header.check_number } : {}),
          ...(header.bank_number ? { bank_number: header.bank_number } : {}),
          ...(header.notes || header.eob_number
            ? {
                notes: [header.eob_number ? `EOB ${header.eob_number}` : "", header.notes]
                  .filter(Boolean)
                  .join(" — "),
              }
            : {}),
        });
        onPosted();
        onClose();
        return;
      }

      const payloads: InsurancePaymentCreate[] = [];
      for (const line of lines) {
        const e = entries[line.procedure_id];
        if (!e?.selected) continue;
        const paid = num(e.paid);
        const writeOff = num(e.write_off);
        const deductible = num(e.deductible);
        if (paid <= 0 && writeOff <= 0 && deductible <= 0) continue;

        const tier = isSecondary
          ? {
              sec_ins_plan_id: line.sec_ins_plan_id ?? claim.ins_plan_id ?? null,
              sec_estimated: line.est_ins.toFixed(2),
              sec_ins_paid: paid.toFixed(2),
              sec_ins_adjust: writeOff.toFixed(2),
            }
          : {
              prim_ins_plan_id: line.prim_ins_plan_id ?? claim.ins_plan_id ?? null,
              prim_estimated: line.est_ins.toFixed(2),
              prim_ins_paid: paid.toFixed(2),
              prim_ins_adjust: writeOff.toFixed(2),
              prim_deductible: deductible.toFixed(2),
            };

        payloads.push({
          patient_id: claim.patient_id,
          claim_id: claim.id,
          procedure_id: line.procedure_id,
          office_id: line.office_id,
          payment_date: header.payment_date,
          payment_method: header.payment_method,
          ...(header.check_number ? { check_number: header.check_number } : {}),
          ...(header.bank_number ? { bank_number: header.bank_number } : {}),
          ...(header.eob_number ? { eob_number: header.eob_number } : {}),
          ...(header.eft_trace_number ? { eft_trace_number: header.eft_trace_number } : {}),
          ...tier,
        });
      }

      if (payloads.length === 0) {
        setErrors(["Nothing to post — enter a payment, write-off or deductible on a selected line."]);
        return;
      }

      // Sequential: a partial post must be reported with an exact count rather
      // than left ambiguous by a parallel race.
      let posted = 0;
      for (const payload of payloads) {
        await recordInsurancePayment(payload);
        posted += 1;
      }

      await recalculateClaim(claim.id).catch(() => null);

      if (eobFile) {
        await uploadClaimAttachment(claim.id, { file: eobFile, attachment_type: "EOB" }).catch(
          () => null,
        );
      }

      // The remittance record has no notes column (gap INS-PAY-1), so a note is
      // appended to the claim's own notes where it stays visible and auditable.
      if (header.notes.trim()) {
        const stamp = fmtDate(header.payment_date);
        const line = `[${stamp}] Ins payment ${money(num(header.payment_amount))}${
          header.check_number ? ` chk ${header.check_number}` : ""
        }${header.eob_number ? ` EOB ${header.eob_number}` : ""}: ${header.notes.trim()}`;
        const next = [claim.notes?.trim(), line].filter(Boolean).join("\n");
        await updateInsuranceClaim(claim.id, { notes: next }).catch(() => null);
      }

      if (header.close_claim) {
        await setClaimStatus(claim.id, { status: "closed" }).catch(() => null);
      }

      if (posted !== payloads.length) {
        setPostError(`Posted ${posted} of ${payloads.length} lines — please review the claim.`);
        return;
      }

      onPosted();
      onClose();
    } catch (err) {
      setPostError(errMsg(err) || "Failed to post the insurance payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const paysClaims = header.mode === "claims";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-[1200px] max-h-[94vh] flex flex-col border-2 border-[#E2E8F0]">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2 flex items-center justify-between rounded-t">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Insurance Payment</h2>
          <div className="flex items-center gap-3 text-white text-xs font-semibold">
            <span>Claim {claim.claim_number}</span>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded" title="Close">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F7F9FC]">
          {/* Claim / carrier banner */}
          <div className="border-b border-[#E2E8F0] bg-white px-4 py-2 grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-1 text-xs">
            <div>
              <div className="text-slate-500">Carrier</div>
              <div className="font-semibold text-slate-900">
                {carrierName && carrierName !== "-" ? carrierName : "No carrier on claim"}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Subscriber</div>
              <div className="font-semibold text-slate-900">
                {subscriberName || "-"}
                {subscriberId ? ` · ${subscriberId}` : ""}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Claim type / Office</div>
              <div className="font-semibold text-slate-900">
                {claim.claim_type || "-"}
                {officeLabel ? ` · ${officeLabel}` : ""}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Billing / Treating provider</div>
              <div className="font-semibold text-slate-900">
                {providerLabel(claim.billing_provider_id) || "-"} ·{" "}
                {providerLabel(claim.treating_provider_id) || "-"}
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="px-4 py-2 flex flex-wrap items-center gap-6 border-b border-[#E2E8F0] bg-white">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <input
                type="radio"
                name="ins-pay-mode"
                checked={header.mode === "previous_balance"}
                onChange={() => setField("mode", "previous_balance")}
              />
              Insurance Check to Previous Balance
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <input
                type="radio"
                name="ins-pay-mode"
                checked={paysClaims}
                onChange={() => setField("mode", "claims")}
              />
              Insurance Payment (Pays off claims)
            </label>
          </div>

          <div className="p-4 space-y-3">
            {/* Payment / notes / adjustment */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,320px)] gap-3">
              <div className="border border-[#E2E8F0] rounded bg-white">
                <div className={SECTION}>Insurance Payment</div>
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                    <label className={LABEL} htmlFor="ip-date">
                      Payment Date
                    </label>
                    <input
                      id="ip-date"
                      type="date"
                      value={header.payment_date}
                      onChange={(e) => setField("payment_date", e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                    <label className={LABEL} htmlFor="ip-amount">
                      Payment Amount
                    </label>
                    <input
                      id="ip-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={header.payment_amount}
                      onChange={(e) => setField("payment_amount", e.target.value)}
                      className={`${INPUT} text-right`}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                    <label className={LABEL} htmlFor="ip-method">
                      Payment Type
                    </label>
                    <select
                      id="ip-method"
                      value={header.payment_method}
                      onChange={(e) => setField("payment_method", e.target.value)}
                      className={INPUT}
                    >
                      <option value="">--- Select ---</option>
                      {methodOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {kind !== "eft" && (
                    <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                      <label className={LABEL} htmlFor="ip-check">
                        Check #{kind === "check" ? " *" : ""}
                      </label>
                      <input
                        id="ip-check"
                        value={header.check_number}
                        onChange={(e) => setField("check_number", e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                    <label className={LABEL} htmlFor="ip-bank">
                      Bank #
                    </label>
                    <input
                      id="ip-bank"
                      value={header.bank_number}
                      onChange={(e) => setField("bank_number", e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  {kind === "eft" && (
                    <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                      <label className={LABEL} htmlFor="ip-eft">
                        EFT Trace #
                      </label>
                      <input
                        id="ip-eft"
                        value={header.eft_trace_number}
                        onChange={(e) => setField("eft_trace_number", e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                    <label className={LABEL} htmlFor="ip-eob">
                      EOB #
                    </label>
                    <input
                      id="ip-eob"
                      value={header.eob_number}
                      onChange={(e) => setField("eob_number", e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  {paysClaims && (
                    <div className="flex items-center gap-2 pt-1">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                      <input
                        type="file"
                        onChange={(e) => setEobFile(e.target.files?.[0] ?? null)}
                        className="text-[11px]"
                        aria-label="Attach EOB"
                      />
                    </div>
                  )}
                  {paysClaims && (
                    <label className="flex items-center gap-2 text-xs text-slate-700 pt-1">
                      <input
                        type="checkbox"
                        checked={header.close_claim}
                        onChange={(e) => setField("close_claim", e.target.checked)}
                      />
                      Close Claim after posting
                    </label>
                  )}
                </div>
              </div>

              <div className="border border-[#E2E8F0] rounded bg-white">
                <div className={SECTION}>Notes</div>
                <div className="p-3 space-y-2">
                  <textarea
                    rows={7}
                    value={header.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#1F3A5F]"
                  />
                  <p className="text-[11px] text-slate-500">
                    {paysClaims
                      ? "Saved onto the claim's notes with the payment date, cheque and EOB — the remittance record itself has no notes column (gap INS-PAY-1)."
                      : "Saved on the payment record."}
                  </p>
                </div>
              </div>

              <div className="border border-[#E2E8F0] rounded bg-white">
                <div className={SECTION}>Enter Adjustment</div>
                <div className="p-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      disabled={!paysClaims}
                      checked={writeOffEnabled}
                      onChange={(e) => setWriteOffEnabled(e.target.checked)}
                    />
                    Write-Off
                  </label>
                  <div className="flex items-center gap-4 text-xs text-slate-700">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="ip-adjust-mode"
                        disabled={!writeOffEnabled || !paysClaims}
                        checked={adjustMode === "amount"}
                        onChange={() => setAdjustMode("amount")}
                      />
                      $
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="ip-adjust-mode"
                        disabled={!writeOffEnabled || !paysClaims}
                        checked={adjustMode === "percent"}
                        onChange={() => setAdjustMode("percent")}
                      />
                      %
                    </label>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_110px] items-center gap-2">
                    <label className={LABEL} htmlFor="ip-adjust">
                      Adjust Amount
                    </label>
                    <input
                      id="ip-adjust"
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!writeOffEnabled || !paysClaims}
                      value={adjustValue}
                      onChange={(e) => setAdjustValue(e.target.value)}
                      className={`${INPUT} text-right`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyAdjustment}
                    disabled={!writeOffEnabled || !paysClaims || !(num(adjustValue) > 0)}
                    className="w-full px-2 py-1 text-[11px] rounded bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply write-off to selected lines
                  </button>
                </div>
              </div>
            </div>

            {paysClaims && (
              <>
                {/* Outstanding claim summary */}
                <div className="border border-[#E2E8F0] rounded bg-white overflow-hidden">
                  <div className={SECTION}>Outstanding Patient Claims</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1000px] w-full text-xs">
                      <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                        <tr>
                          {[
                            "DOS Date",
                            "Sent Date",
                            "Claim",
                            "St",
                            "Subscriber",
                            "Carrier",
                            "Type",
                            "Office",
                            "Prdr",
                            "Charges",
                            "Est Ins",
                            "Ded Used",
                            "Ins Paid",
                            "Ins Adj",
                            "Rem Amt",
                          ].map((h) => (
                            <th
                              key={h}
                              className={`px-2 py-1.5 font-bold uppercase whitespace-nowrap ${
                                ["Charges", "Est Ins", "Ded Used", "Ins Paid", "Ins Adj", "Rem Amt"].includes(h)
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-[#E8EFF7]">
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {fmtDate(claim.date_of_service_from)}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {fmtDate(claim.submitted_date)}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{claim.claim_number}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {claimStatusLabel(claim.status)}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{subscriberName || "-"}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {carrierName && carrierName !== "-" ? carrierName : "-"}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{claim.claim_type || "-"}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{officeLabel || "-"}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {providerLabel(claim.treating_provider_id) || "-"}
                          </td>
                          <td className="px-2 py-1.5 text-right">{money(claimSummary.charges)}</td>
                          <td className="px-2 py-1.5 text-right">{money(claimSummary.estIns)}</td>
                          <td className="px-2 py-1.5 text-right">{money(claimSummary.dedUsed)}</td>
                          <td className="px-2 py-1.5 text-right">{money(claimSummary.paid)}</td>
                          <td className="px-2 py-1.5 text-right">{money(claimSummary.adjust)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">
                            {money(claimSummary.remaining)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Procedure allocation */}
                <div className="border border-[#E2E8F0] rounded bg-white overflow-hidden">
                  <div className={`${SECTION} flex items-center justify-between`}>
                    <span>Treatments for Above Selected Claim</span>
                    <button
                      type="button"
                      onClick={distribute}
                      disabled={!(num(header.payment_amount) > 0)}
                      className="px-2 py-1 text-[11px] rounded bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Distribute payment
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1150px] w-full text-xs">
                      <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                        <tr>
                          <th className="px-2 py-1.5 w-8" />
                          {["DOS Date", "Code", "Th", "Surf", "Description", "Prdr"].map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left font-bold uppercase whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                          {[
                            "Fee",
                            "Est Ins",
                            "Ded Used",
                            "Ins Paid",
                            "Ins Adj",
                            "Rem Amt",
                            "New Amt",
                            "Write-Off",
                            "Deductible",
                          ].map((h) => (
                            <th key={h} className="px-2 py-1.5 text-right font-bold uppercase whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {lines.map((line) => {
                          const e = entries[line.procedure_id] ?? emptyLineEntry();
                          return (
                            <tr key={line.procedure_id} className={e.selected ? "" : "opacity-60"}>
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={e.selected}
                                  onChange={(ev) =>
                                    setEntry(line.procedure_id, "selected", ev.target.checked)
                                  }
                                  aria-label={`Include ${line.code}`}
                                />
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                {fmtDate(line.date_of_service)}
                              </td>
                              <td className="px-2 py-1.5">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                                  {line.code}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">{line.tooth || "-"}</td>
                              <td className="px-2 py-1.5">{line.surface || "-"}</td>
                              <td className="px-2 py-1.5 max-w-[240px] truncate" title={line.description}>
                                {line.description}
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                {providerLabel(line.provider_id) || "-"}
                              </td>
                              <td className="px-2 py-1.5 text-right">{money(line.fee)}</td>
                              <td className="px-2 py-1.5 text-right">{money(line.est_ins)}</td>
                              <td className="px-2 py-1.5 text-right">{money(line.ded_used)}</td>
                              <td className="px-2 py-1.5 text-right">{money(line.ins_paid)}</td>
                              <td className="px-2 py-1.5 text-right">{money(line.ins_adjust)}</td>
                              <td className="px-2 py-1.5 text-right font-semibold">
                                {money(line.remaining)}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  disabled={!e.selected}
                                  value={e.paid}
                                  onChange={(ev) => setEntry(line.procedure_id, "paid", ev.target.value)}
                                  className={CELL_INPUT}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  disabled={!e.selected}
                                  value={e.write_off}
                                  onChange={(ev) =>
                                    setEntry(line.procedure_id, "write_off", ev.target.value)
                                  }
                                  className={CELL_INPUT}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  disabled={!e.selected || isSecondary}
                                  value={e.deductible}
                                  onChange={(ev) =>
                                    setEntry(line.procedure_id, "deductible", ev.target.value)
                                  }
                                  className={CELL_INPUT}
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#E8EFF7] font-bold text-[#1F3A5F]">
                          <td className="px-2 py-1.5" colSpan={13}>
                            Totals
                          </td>
                          <td className="px-2 py-1.5 text-right">{money(totals.paid)}</td>
                          <td className="px-2 py-1.5 text-right">{money(totals.write_off)}</td>
                          <td className="px-2 py-1.5 text-right">{money(totals.deductible)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div
                  className={`text-xs px-3 py-1.5 rounded border ${
                    Math.abs(totals.unallocated) < 0.005
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-amber-300 bg-amber-50 text-amber-900"
                  }`}
                >
                  Payment {money(num(header.payment_amount))} · allocated {money(totals.paid)} ·{" "}
                  {totals.unallocated >= 0
                    ? `unallocated ${money(totals.unallocated)}`
                    : `over-allocated ${money(Math.abs(totals.unallocated))}`}
                  {isSecondary && " · posting to the secondary tier (this is a secondary claim)"}
                </div>
              </>
            )}

            {errors.length > 0 && (
              <div className="rounded border-l-4 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-800 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                  This payment cannot be posted yet
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {postError && (
              <div className="rounded border-l-4 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-800">
                {postError}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t-2 border-slate-300 px-4 py-2 flex items-center justify-end gap-2 rounded-b">
          <button
            onClick={handlePost}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <DollarSign className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            {saving ? "Posting…" : "Apply"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-slate-500 text-white hover:bg-slate-600 font-semibold uppercase tracking-wide disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// DIRECT PRINT → ADA Dental Claim Form (2024) pre-flight.
//
// Assembles the form from the backend, runs the completion-instruction checks
// and shows what will print before the paper leaves the building:
//   • summary of every block + the checklist with "where to fix" hints
//   • switches for the boxes no screen captures (EPSDT, locum tenens, SRP date,
//     signatures on file) — kept with the claim's fill-out record
//   • Item 33 missing-teeth picker (per-claim override of the chart)
//   • live PDF preview, overlay offsets + alignment test page, reverse side
//   • a local print log (no server audit yet — ADA-BE-1)
//
// PRINT runs synchronously inside the click so the PDF tab is not popup-blocked.

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, PenLine, Printer, X, XCircle } from "lucide-react";
import type { ClaimDetailCoverageRead, ClaimDetailProcedureRead, ClaimDetailResponse, ClaimEnclosures } from "@/api/generated/model";
import { useAuth } from "../../../contexts/AuthContext";
import { saveLocalClaimFillOut } from "../../../components/patient/claimFillOut";
import { assembleAdaClaimForm, type AssembledAdaClaimForm } from "./adaClaimFormData";
import ClaimSignatureDialog from "./ClaimSignatureDialog";
import { CLAIM_SIGNATURE_LABEL, type ClaimSignature, type ClaimSignatureKey } from "./adaClaimSignatures";
import { openAdaClaimFormForPrint, renderAdaCalibrationPage, renderAdaClaimForm, type AdaRenderMode } from "./adaClaimFormPdf";
import {
  appendClaimPrintLog,
  loadClaimPrintLog,
  loadPrintOffset,
  savePrintOffset,
  type ClaimPrintLogEntry,
} from "./adaLocalStores";
import {
  MISSING_TEETH_BOTTOM,
  MISSING_TEETH_PERTINENT_RE,
  MISSING_TEETH_TOP,
  adaDate,
  adaMoney,
  adaToday,
  checkAdaClaimForm,
  summariseIssues,
  totalFee,
  type AdaClaimForm,
  type AdaFormIssue,
} from "./adaClaimFormModel";

interface Props {
  detail: ClaimDetailResponse;
  procedures: ClaimDetailProcedureRead[];
  coverage: ClaimDetailCoverageRead[];
  enclosures?: ClaimEnclosures | null;
  onClose: () => void;
}

interface PrintOptions {
  is_epsdt: boolean;
  is_locum_tenens: boolean;
  /** YYYY-MM-DD override for Item 39a; blank = derived from history. */
  date_last_srp: string;
  signature_on_file: boolean;
  assign_benefits: boolean;
  mode: AdaRenderMode;
  include_instructions: boolean;
  /** Item 33 override; null = as charted. */
  missing_teeth_override: string[] | null;
  offset_x: number;
  offset_y: number;
}

const FORM_VERSION = "ADA 2024";

/** Apply the pre-flight switches to the assembled form (pure). */
function applyOptions(
  form: AdaClaimForm,
  o: PrintOptions,
  srp_history: string,
  charted: string[],
  sigs: Record<ClaimSignatureKey, ClaimSignature | null>,
): AdaClaimForm {
  const today = adaToday();
  const img = (k: ClaimSignatureKey) => sigs[k]?.image ?? "";
  const when = (k: ClaimSignatureKey) => adaDate(sigs[k]?.signed_at) || today;
  return {
    ...form,
    transaction: { ...form.transaction, epsdt: o.is_epsdt },
    treating: { ...form.treating, is_locum_tenens: o.is_locum_tenens, signature_image: img("treating_dentist") },
    ancillary: { ...form.ancillary, date_last_srp: adaDate(o.date_last_srp) || srp_history },
    missing_teeth: o.missing_teeth_override ?? charted,
    authorizations: {
      patient_signature_on_file: o.signature_on_file || !!img("patient_consent"),
      patient_signature_date: o.signature_on_file || img("patient_consent") ? when("patient_consent") : "",
      subscriber_signature_on_file: o.assign_benefits || !!img("assign_benefits"),
      subscriber_signature_date: o.assign_benefits || img("assign_benefits") ? when("assign_benefits") : "",
      patient_signature_image: img("patient_consent"),
      subscriber_signature_image: img("assign_benefits"),
    },
  };
}

const LEVEL_STYLE: Record<AdaFormIssue["level"], { icon: typeof Info; cls: string; label: string }> = {
  error: { icon: XCircle, cls: "text-red-700 bg-red-50 border-red-200", label: "Must fix" },
  warning: { icon: AlertTriangle, cls: "text-amber-700 bg-amber-50 border-amber-200", label: "Check" },
  info: { icon: Info, cls: "text-slate-600 bg-slate-50 border-slate-200", label: "Note" },
};

/** Where staff fix the source record for an item — shown next to the issue. */
function fixHint(item: string): string {
  const n = parseInt(item, 10);
  if (Number.isNaN(n)) return "";
  if (n === 1 || n === 2 || (n >= 34 && n <= 47) || item === "53a") return "Claim Fill-Out";
  if (n === 3 || n === 11) return "Setup → Insurance → Carriers";
  if (n >= 4 && n <= 10) return "Patient → Insurance (other plan)";
  if (n >= 12 && n <= 18) return "Patient → Insurance → Subscriber";
  if (n >= 20 && n <= 23) return "Patient → Edit Patient";
  if (n >= 24 && n <= 32) return "Transactions / Claim Fill-Out lines";
  if (n === 33) return "Restorative chart / picker below";
  if (n >= 48 && n <= 52) return "Setup → Office → Billing";
  if (n >= 53 && n <= 58) return "Setup → Providers → Info";
  return "";
}

export default function AdaClaimPrintModal({ detail, procedures, coverage, enclosures, onClose }: Props) {
  const { user } = useAuth();
  const [assembled, setAssembled] = useState<AssembledAdaClaimForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [log, setLog] = useState<ClaimPrintLogEntry[]>(() => loadClaimPrintLog(detail.claim.id));
  const [sigs, setSigs] = useState<Record<ClaimSignatureKey, ClaimSignature | null>>({ patient_consent: null, assign_benefits: null, treating_dentist: null });
  const [capture, setCapture] = useState<ClaimSignatureKey | null>(null);
  const officeId = detail.claim.office_id ?? null;
  const [opts, setOpts] = useState<PrintOptions>(() => {
    const off = loadPrintOffset(officeId);
    return {
      is_epsdt: false,
      is_locum_tenens: false,
      date_last_srp: "",
      signature_on_file: false,
      assign_benefits: false,
      mode: "form",
      include_instructions: false,
      missing_teeth_override: null,
      offset_x: off.offset_x,
      offset_y: off.offset_y,
    };
  });

  useEffect(() => {
    let cancelled = false;
    setAssembled(null);
    setLoadError(null);
    assembleAdaClaimForm({ detail, procedures, coverage, enclosures })
      .then((res) => {
        if (cancelled) return;
        setAssembled(res);
        setSigs(res.sources.claim_signatures);
        setOpts((prev) => ({
          ...prev,
          is_epsdt: !!res.fill_out.is_epsdt,
          is_locum_tenens: !!res.fill_out.is_locum_tenens,
          date_last_srp: res.fill_out.date_last_srp || "",
          signature_on_file: !!res.fill_out.signature_on_file,
          assign_benefits: !!res.fill_out.assign_benefits,
          missing_teeth_override: res.fill_out.missing_teeth_override,
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError((err as Error)?.message || "Could not assemble the claim form.");
      });
    return () => {
      cancelled = true;
    };
  }, [detail, procedures, coverage, enclosures]);

  // The SRP date the history produced (before any override) so clearing the
  // override falls back to it.
  const srp_history = useMemo(() => {
    if (!assembled) return "";
    return assembled.sources.srp_from_history ? assembled.form.ancillary.date_last_srp : "";
  }, [assembled]);
  // Teeth the restorative chart reports as missing (the override starts from these).
  const charted = useMemo(() => {
    if (!assembled) return [] as string[];
    return assembled.fill_out.missing_teeth_override ? [] : assembled.form.missing_teeth;
  }, [assembled]);

  const form = useMemo(() => (assembled ? applyOptions(assembled.form, opts, srp_history, charted, sigs) : null), [assembled, opts, srp_history, charted, sigs]);
  const issues = useMemo(() => (form ? checkAdaClaimForm(form) : []), [form]);
  const counts = summariseIssues(issues);
  const lookupErrors = Object.entries(assembled?.sources.lookup_errors ?? {});
  const forms = form ? Math.max(1, Math.ceil(form.service_lines.length / 10)) : 1;

  // Live preview (UI-17): re-render on every option change, debounced.
  useEffect(() => {
    if (!form || !showPreview) {
      setPreviewUrl(null);
      return;
    }
    const handle = window.setTimeout(() => {
      try {
        const doc = renderAdaClaimForm(form, { mode: opts.mode, offset_x: opts.offset_x, offset_y: opts.offset_y, include_instructions: opts.include_instructions });
        setPreviewUrl(doc.output("bloburl").toString());
      } catch {
        setPreviewUrl(null);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [form, showPreview, opts.mode, opts.offset_x, opts.offset_y, opts.include_instructions]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const set = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => setOpts((p) => ({ ...p, [key]: value }));

  const persistFillOut = () => {
    if (!assembled) return;
    try {
      saveLocalClaimFillOut(detail.claim.id, {
        ...assembled.fill_out,
        is_epsdt: opts.is_epsdt,
        is_locum_tenens: opts.is_locum_tenens,
        date_last_srp: opts.date_last_srp,
        signature_on_file: opts.signature_on_file,
        assign_benefits: opts.assign_benefits,
        missing_teeth_override: opts.missing_teeth_override,
        signature_ids: {
          patient_consent: sigs.patient_consent?.source === "claim" ? sigs.patient_consent.signature_id : assembled.fill_out.signature_ids.patient_consent,
          assign_benefits: sigs.assign_benefits?.source === "claim" ? sigs.assign_benefits.signature_id : assembled.fill_out.signature_ids.assign_benefits,
          treating_dentist: sigs.treating_dentist?.source === "claim" ? sigs.treating_dentist.signature_id : assembled.fill_out.signature_ids.treating_dentist,
        },
      });
    } catch {
      /* storage full / private mode — printing still proceeds */
    }
  };

  // A signature captured here is pinned to the claim straight away (the row
  // itself has no claim column — SIG-11), so it survives Cancel.
  const onSignatureSaved = (sig: ClaimSignature) => {
    setSigs((prev) => ({ ...prev, [sig.key]: sig }));
    setCapture(null);
    if (!assembled) return;
    try {
      saveLocalClaimFillOut(detail.claim.id, {
        ...assembled.fill_out,
        signature_ids: { ...assembled.fill_out.signature_ids, [sig.key]: sig.signature_id },
      });
      assembled.fill_out.signature_ids = { ...assembled.fill_out.signature_ids, [sig.key]: sig.signature_id };
    } catch {
      /* best effort */
    }
  };

  const signerName = (key: ClaimSignatureKey): string => {
    if (!form) return "";
    if (key === "patient_consent") return form.patient.name || "Patient / guardian";
    if (key === "assign_benefits") return form.subscriber.name || form.patient.name || "Subscriber";
    return form.treating.name || "Treating dentist";
  };

  const signedInUserId = (() => {
    const n = parseInt(String(user?.id ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  })();

  const recordPrint = (mode: ClaimPrintLogEntry["mode"], n: number) => {
    setLog(
      appendClaimPrintLog(detail.claim.id, {
        printed_at: new Date().toISOString(),
        printed_by: user?.name || user?.email || "unknown user",
        mode,
        forms: n,
        form_version: FORM_VERSION,
        errors: counts.errors,
      }),
    );
  };

  const handlePrint = () => {
    if (!form || !assembled) return;
    persistFillOut();
    savePrintOffset(officeId, { offset_x: opts.offset_x, offset_y: opts.offset_y });
    openAdaClaimFormForPrint(form, { mode: opts.mode, offset_x: opts.offset_x, offset_y: opts.offset_y, include_instructions: opts.include_instructions });
    recordPrint(opts.mode, forms);
    onClose();
  };

  const handleCalibration = () => {
    savePrintOffset(officeId, { offset_x: opts.offset_x, offset_y: opts.offset_y });
    const doc = renderAdaCalibrationPage({ offset_x: opts.offset_x, offset_y: opts.offset_y });
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
    recordPrint("calibration", 1);
  };

  // Item 33 picker (UI-12).
  const missingSet = useMemo(() => new Set(form?.missing_teeth ?? []), [form]);
  const pertinent = !!form && form.service_lines.some((l) => MISSING_TEETH_PERTINENT_RE.test(l.procedure_code));
  const toggleTooth = (t: string) => {
    setOpts((p) => {
      const base = p.missing_teeth_override ?? charted;
      const next = base.includes(t) ? base.filter((x) => x !== t) : [...base, t];
      next.sort((a, b) => Number(a) - Number(b));
      return { ...p, missing_teeth_override: next };
    });
  };

  const lastPrint = log[log.length - 1];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2 flex items-center justify-between rounded-t">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Printer className="w-4 h-4" strokeWidth={2} />
            Print ADA Dental Claim Form (2024)
          </h2>
          <div className="flex items-center gap-3">
            {lastPrint && (
              <span className="text-[11px] text-white/80" title={log.map((e) => `${new Date(e.printed_at).toLocaleString()} · ${e.printed_by} · ${e.mode}`).join("\n")}>
                Last printed {new Date(lastPrint.printed_at).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} by {lastPrint.printed_by}
                {log.length > 1 ? ` (${log.length}×)` : ""}
              </span>
            )}
            <button onClick={onClose} className="p-1 text-white hover:bg-white/20 rounded" title="Close">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="p-4 space-y-3 overflow-y-auto overflow-x-hidden min-w-0 text-xs">
            {!assembled && !loadError && (
              <div className="flex items-center gap-2 text-slate-600 py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Assembling claim, patient, subscriber, carrier and provider data…
              </div>
            )}
            {loadError && <div className="border border-red-200 bg-red-50 text-red-700 rounded px-3 py-2">{loadError}</div>}

            {form && assembled && (
              <>
                {/* What prints */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-1 border-2 border-[#E2E8F0] rounded p-3">
                  <Row k="1. Transaction" v={[form.transaction.actual_services && "Actual services", form.transaction.predetermination && "Predetermination", form.transaction.epsdt && "EPSDT"].filter(Boolean).join(", ")} />
                  <Row k="3. Payer" v={form.payer.name ? `${form.payer.name}${form.payer.payer_id ? ` · Payer ID ${form.payer.payer_id}` : ""}` : ""} />
                  <Row k="4. Other coverage" v={[form.other_coverage.dental && "Dental", form.other_coverage.medical && "Medical"].filter(Boolean).join(" + ") ? `${[form.other_coverage.dental && "Dental", form.other_coverage.medical && "Medical"].filter(Boolean).join(" + ")}${form.other_coverage.payer.name ? ` · ${form.other_coverage.payer.name}` : ""}` : "None"} />
                  <Row k="12. Subscriber" v={form.subscriber.name ? `${form.subscriber.name} · ID ${form.subscriber.subscriber_id || "—"}` : ""} />
                  <Row k="18–23. Patient" v={form.patient.name ? `${form.patient.name} (${form.patient.relationship || "?"}) · ${form.patient.dob || "no DOB"}` : ""} />
                  <Row k="24–32. Services" v={`${form.service_lines.length} line(s) · Total $${adaMoney(totalFee(form.service_lines, form.other_fees))}${form.other_fees ? ` (incl. other fees $${adaMoney(form.other_fees)})` : ""}${forms > 1 ? ` · ${forms} forms` : ""}`} />
                  <Row k="34a. Diagnosis" v={form.diagnosis_codes.filter(Boolean).join(", ") || "none"} />
                  <Row k="38/39. Place / Encl." v={`${form.ancillary.place_of_treatment} / ${form.ancillary.enclosures || "—"}`} />
                  <Row k="48. Billing entity" v={form.billing.name ? `${form.billing.name} · NPI ${form.billing.npi || "—"} · TIN ${form.billing.ssn_or_tin || "—"}` : ""} />
                  <Row k="53. Treating dentist" v={form.treating.name ? `${form.treating.name} · NPI ${form.treating.npi || "—"} · Lic ${form.treating.license_number || "—"}` : ""} />
                  <Row k="56a. Specialty" v={form.treating.specialty_code} />
                  <Row
                    k="36. Consent evidence"
                    v={
                      assembled.sources.consent_signature
                        ? `Captured ${assembled.sources.consent_signature.signature_type || "signature"} ${adaDate(assembled.sources.consent_signature.signed_at || assembled.sources.consent_signature.created_at)}`
                        : "No captured patient signature on file"
                    }
                  />
                </div>

                {/* Switches for the boxes no screen captures */}
                <fieldset className="border-2 border-[#E2E8F0] rounded p-3 grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-2">
                  <legend className="px-1 text-[11px] font-semibold text-slate-700 uppercase">Before printing</legend>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={opts.signature_on_file} onChange={(e) => set("signature_on_file", e.target.checked)} />
                    <span>36. Patient signature on file</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={opts.assign_benefits} onChange={(e) => set("assign_benefits", e.target.checked)} />
                    <span>37. Assign benefits — subscriber signature on file</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={opts.is_epsdt} onChange={(e) => set("is_epsdt", e.target.checked)} />
                    <span>1. EPSDT / Title XIX</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={opts.is_locum_tenens} onChange={(e) => set("is_locum_tenens", e.target.checked)} />
                    <span>53a. Locum tenens treating dentist</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="whitespace-nowrap">39a. Date last SRP</span>
                    <input type="date" value={opts.date_last_srp} onChange={(e) => set("date_last_srp", e.target.value)} className="border border-slate-300 rounded px-1 py-0.5" />
                    {!opts.date_last_srp && srp_history && <span className="text-slate-500">(from history: {srp_history})</span>}
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={opts.include_instructions} onChange={(e) => set("include_instructions", e.target.checked)} />
                    <span>Add reverse side (instructions page)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="whitespace-nowrap">Print as</span>
                    <select value={opts.mode} onChange={(e) => set("mode", e.target.value as AdaRenderMode)} className="border border-slate-300 rounded px-1 py-0.5">
                      <option value="form">Complete form (plain paper)</option>
                      <option value="overlay">Data only (pre-printed ADA stock)</option>
                    </select>
                  </label>
                  {opts.mode === "overlay" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="whitespace-nowrap">Offset X / Y (pt)</span>
                      <input type="number" step={1} value={opts.offset_x} onChange={(e) => set("offset_x", Number(e.target.value) || 0)} className="w-16 border border-slate-300 rounded px-1 py-0.5" aria-label="Offset X" />
                      <input type="number" step={1} value={opts.offset_y} onChange={(e) => set("offset_y", Number(e.target.value) || 0)} className="w-16 border border-slate-300 rounded px-1 py-0.5" aria-label="Offset Y" />
                      <button type="button" onClick={handleCalibration} className="px-2 py-0.5 rounded border border-[#1F3A5F] text-[#1F3A5F] hover:bg-[#E8EFF7]">
                        Print alignment test
                      </button>
                      <span className="text-slate-500">saved per office</span>
                    </div>
                  )}
                </fieldset>

                {/* Item 33 picker */}
                <fieldset className="border-2 border-[#E2E8F0] rounded p-3">
                  <legend className="px-1 text-[11px] font-semibold text-slate-700 uppercase">
                    33. Missing teeth {pertinent ? "(pertinent — perio / prosthodontic / implant codes on this claim)" : "(not pertinent to these codes)"}
                  </legend>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-slate-600">
                      {opts.missing_teeth_override ? "Claim-specific selection" : "As charted on the restorative chart"}
                      {charted.length ? ` · chart: ${charted.join(", ")}` : " · chart: none"}
                    </span>
                    {opts.missing_teeth_override && (
                      <button type="button" onClick={() => set("missing_teeth_override", null)} className="px-2 py-0.5 rounded border border-slate-400 text-slate-700 hover:bg-slate-100">
                        Reset to chart
                      </button>
                    )}
                  </div>
                  {[MISSING_TEETH_TOP, MISSING_TEETH_BOTTOM].map((row, ri) => (
                    <div key={ri} className="grid grid-cols-16 gap-0.5 mb-0.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                      {row.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTooth(t)}
                          className={`h-6 rounded text-[11px] font-semibold border ${missingSet.has(t) ? "bg-[#1F3A5F] text-white border-[#1F3A5F]" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}
                          title={missingSet.has(t) ? `Tooth ${t} marked missing` : `Mark tooth ${t} missing`}
                        >
                          {missingSet.has(t) ? "X" : t}
                        </button>
                      ))}
                    </div>
                  ))}
                </fieldset>

                {/* Signatures — Items 36 / 37 / 53 */}
                <fieldset className="border-2 border-[#E2E8F0] rounded p-3 min-w-0">
                  <legend className="px-1 text-[11px] font-semibold text-slate-700 uppercase">Signatures (Topaz pad or on screen)</legend>
                  <div className="divide-y divide-slate-200">
                    {(Object.keys(CLAIM_SIGNATURE_LABEL) as ClaimSignatureKey[]).map((key) => {
                      const meta = CLAIM_SIGNATURE_LABEL[key];
                      const sig = sigs[key];
                      const sourceLabel =
                        sig?.source === "claim"
                          ? "captured for this claim"
                          : sig?.source === "patient_latest"
                            ? "latest on the patient record"
                            : sig?.source === "user_account"
                              ? "provider's signature on file"
                              : "";
                      return (
                        <div key={key} className="grid grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 min-w-0">
                          {/* who */}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">Item {meta.item}</div>
                            <div className="text-[11px] text-slate-600 leading-tight">{meta.title}</div>
                          </div>
                          {/* what is on file */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="shrink-0 w-24 h-9 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                              {sig?.image ? (
                                <img src={sig.image} alt={`${meta.title} signature`} className="max-h-8 max-w-[88px] object-contain" />
                              ) : (
                                <span className="text-[10px] text-slate-400">none</span>
                              )}
                            </div>
                            <div className="min-w-0 text-[11px] leading-tight text-slate-600 break-words">
                              {sig?.image ? (
                                <>
                                  <div className="text-slate-800">
                                    {adaDate(sig.signed_at) || "—"} · {sig.device_source || "?"}
                                  </div>
                                  <div>{sourceLabel}</div>
                                </>
                              ) : (
                                <div className="italic">
                                  Not captured — prints a blank line{key !== "treating_dentist" ? " (or \u201cSignature on File\u201d when switched on above)" : ""}.
                                </div>
                              )}
                            </div>
                          </div>
                          {/* actions */}
                          <div className="flex flex-col items-stretch gap-1 shrink-0 w-24">
                            <button
                              type="button"
                              onClick={() => setCapture(key)}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded border border-[#1F3A5F] text-[#1F3A5F] hover:bg-[#E8EFF7] whitespace-nowrap"
                            >
                              <PenLine className="w-3 h-3" /> {sig?.image ? "Re-capture" : "Capture"}
                            </button>
                            {sig?.image && (
                              <button
                                type="button"
                                onClick={() => setSigs((p) => ({ ...p, [key]: null }))}
                                className="px-2 py-1 rounded border border-slate-400 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                                title="Print this item without the image (the stored signature is kept)"
                              >
                                Don't print
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 text-[11px] text-slate-500">
                    Stored with POST /patient-signatures (same store as Progress Notes and Medical History). The rows carry no claim id yet (SIG-11), so the claim keeps the ids in its fill-out record.
                  </div>
                </fieldset>

                {/* Completion-rule checks */}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[11px] font-semibold text-slate-700 uppercase">Completion check</span>
                    {counts.errors === 0 && counts.warnings === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All required items present
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        {counts.errors} must fix · {counts.warnings} to check · {counts.infos} notes
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {issues.map((it, i) => {
                      const st = LEVEL_STYLE[it.level];
                      const Icon = st.icon;
                      const hint = fixHint(it.item);
                      return (
                        <li key={i} className={`flex items-start gap-2 border rounded px-2 py-1 ${st.cls}`}>
                          <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="font-semibold shrink-0 w-14">Item {it.item}</span>
                          <span className="flex-1">{it.message}</span>
                          {hint && <span className="text-[10px] text-slate-500 shrink-0">{hint}</span>}
                        </li>
                      );
                    })}
                    {lookupErrors.map(([k, v]) => (
                      <li key={k} className="flex items-start gap-2 border rounded px-2 py-1 text-amber-700 bg-amber-50 border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="flex-1">
                          Lookup <code>{k}</code> failed ({v}) — the boxes it feeds print blank.
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Preview pane */}
          <div className="border-l-2 border-[#E2E8F0] bg-slate-100 flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-600 border-b border-slate-300">
              <span className="font-semibold uppercase">Preview{forms > 1 ? ` · ${forms} forms` : ""}{opts.include_instructions ? " + instructions" : ""}</span>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showPreview} onChange={(e) => setShowPreview(e.target.checked)} />
                show
              </label>
            </div>
            {showPreview && previewUrl ? (
              <iframe title="ADA claim form preview" src={`${previewUrl}#toolbar=0&view=FitH`} className="flex-1 w-full min-h-[300px]" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">{form ? (showPreview ? "Rendering…" : "Preview hidden") : "Waiting for data…"}</div>
            )}
          </div>
        </div>

        <div className="bg-slate-100 border-t-2 border-slate-300 px-4 py-2 flex items-center justify-between gap-3 rounded-b">
          <span className="text-[11px] text-slate-500">
            {counts.errors > 0 ? "The form prints with blanks for the items marked 'Must fix'." : "Complete all items; four-digit years throughout."}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md bg-slate-500 text-white hover:bg-slate-600 font-semibold uppercase tracking-wide">
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={!form}
              className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-3 h-3" strokeWidth={2} />
              Print {forms > 1 ? `${forms} forms` : "form"}
            </button>
          </div>
        </div>
      </div>
      {capture && (
        <ClaimSignatureDialog
          patient_id={detail.claim.patient_id}
          signature_key={capture}
          signer_name={signerName(capture)}
          signed_by_user_id={signedInUserId}
          onSaved={onSignatureSaved}
          onClose={() => setCapture(null)}
        />
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-slate-500 shrink-0 w-32">{k}</span>
      <span className={`truncate ${v ? "text-slate-900 font-medium" : "text-red-600 italic"}`} title={v}>
        {v || "blank"}
      </span>
    </div>
  );
}

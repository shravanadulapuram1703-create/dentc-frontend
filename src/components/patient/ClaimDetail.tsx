import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  useNavigate,
  useParams,
  useOutletContext,
} from "react-router-dom";
import {
  Printer,
  Send,
  Save,
  X,
  CheckCircle,
  Trash2,
  RefreshCw,
  Plus,
  Upload,
  Paperclip,
  Eye,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  evaluateClaimAttachments,
  ClaimProcedureData,
} from "../../utils/attachmentEvaluator";
import { procedureCodes } from "../../data/procedureCodes";
import {
  getClaimDetail,
  setClaimStatus,
  updateInsuranceClaim,
  deleteInsuranceClaim,
  useListClaimAttachments,
  uploadClaimAttachment,
  deleteClaimAttachment,
} from "@/api/generated/endpoints/billing/billing";
import { getInsuranceCarrier } from "@/api/generated/endpoints/insurance/insurance";
import type { ClaimDetailResponse } from "@/api/generated/model";
import InsurancePaymentModal from "./InsurancePaymentModal";
import ClaimFillOutModal from "./ClaimFillOutModal";
import UpdateClaimStatusModal from "./UpdateClaimStatusModal";
import { claimStatusLabel } from "./claimStatus";
import { env } from "@/shared/config/env";
import { useAuth } from "../../contexts/AuthContext";

const fileHref = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : `${env.apiBaseUrl}${url}`;

// ✅ ONLY tooltip needed: Overpayment Disbursement (professional billing systems only explain what's truly complex)
function OverpaymentInfo() {
  return (
    <span className="relative group inline-flex items-center ml-1">
      <span className="w-3 h-3 rounded-full border border-white text-[9px] font-bold flex items-center justify-center cursor-help">
        ?
      </span>
      <div className="absolute hidden group-hover:block top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-white border-2 border-slate-300 shadow-lg rounded text-xs z-50 pointer-events-none">
        <div className="px-2 py-1.5 font-semibold border-b bg-slate-100 text-slate-900">
          INSURANCE OVERPAYMENT DISBURSEMENT
        </div>
        <div className="p-2 space-y-1 text-slate-900">
          <div><strong>C</strong> – Credit to Patient</div>
          <div><strong>I</strong> – Increase Production</div>
          <div>
            <strong>H</strong> – Increase Production to
            <div className="ml-3 text-slate-600">
              House Doctor (e.g., 1256 – Jinna, Dhileep)
            </div>
          </div>
        </div>
      </div>
    </span>
  );
}

interface ClaimProcedure {
  id: string;
  dos: string;
  code: string;
  tooth: string;
  surface: string;
  description: string;
  bref: string;
  submitted: number;
  fee: number;
  estIns: number;
  insPayD: number;
  insOverD: number;
  insAllocat: number;
  overDtc: number;
  writeOff1: number;
  writeOff2: number;
  writeOff3: number;
  otherIns: number;
  reasonCo: string;
}

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: string;
}

interface OutletContext {
  patient: PatientData;
}

// Format claim ID to be shorter and more readable
// If it's a UUID, show only first 8 characters with CLM- prefix
// Otherwise, return as-is or use claim_number if available
function formatClaimId(claimId: string): string {
  if (!claimId) return "";
  
  // If it's a long UUID-like string (32+ characters without dashes, or 36 with dashes)
  if (claimId.length >= 32) {
    // Extract first 8 characters and format as CLM-XXXXXXXX
    const shortId = claimId.replace(/-/g, '').substring(0, 8).toUpperCase();
    return `CLM-${shortId}`;
  }
  
  // If it already has CLM- prefix, return as-is
  if (claimId.startsWith('CLM-')) {
    return claimId;
  }
  
  // For other formats, return as-is
  return claimId;
}

export default function ClaimDetail() {
  const navigate = useNavigate();
  const { patientId, claimId } = useParams();
  const { currentOrganization, currentOffice } = useAuth();

  // Make patient context optional
  let patient: PatientData | undefined;
  try {
    const context = useOutletContext<OutletContext>();
    patient = context?.patient;
  } catch {
    patient = undefined;
  }

  const queryClient = useQueryClient();
  const attachFileRef = useRef<HTMLInputElement>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attType, setAttType] = useState("");
  const [attFile, setAttFile] = useState<File | null>(null);
  const [uploadingAtt, setUploadingAtt] = useState(false);
  const [deletingAttId, setDeletingAttId] = useState<number | null>(null);

  const attachmentsQuery = useListClaimAttachments(claimId ?? "", {
    query: { enabled: showAttachments && !!claimId },
  });
  const attachments = (attachmentsQuery.data ?? []).filter((a) => !a.is_deleted);

  // Extract numeric tenant ID from organization ID (e.g., "ORG-1" -> 1, "1" -> 1)
  const getTenantId = (): string => {
    if (!currentOrganization) return "N/A";
    // Extract numeric ID from formats like "ORG-1", "1", "001", etc.
    const match = currentOrganization.match(/(\d+)$/);
    if (match && match[1]) {
      // Convert to number to remove leading zeros (e.g., "001" -> 1), then back to string
      const numericId = parseInt(match[1], 10);
      return isNaN(numericId) ? currentOrganization : String(numericId);
    }
    // If no numeric match, try to use the value directly (might already be numeric)
    if (/^\d+$/.test(currentOrganization)) {
      return currentOrganization;
    }
    return currentOrganization;
  };

  // Extract numeric office ID from currentOffice (e.g., "OFF-1" -> 1, "1" -> 1)
  const getOfficeId = (): string => {
    if (!currentOffice) return "N/A";
    // Extract numeric ID from formats like "OFF-1", "O-1", "1", etc.
    const match = currentOffice.match(/(\d+)$/);
    if (match && match[1]) {
      return match[1];
    }
    // If already numeric, return as-is
    if (/^\d+$/.test(currentOffice)) {
      return currentOffice;
    }
    return currentOffice;
  };

  // Backend-driven claim data (composed: claim + procedures + payments + coverage)
  const [data, setData] = useState<ClaimDetailResponse | null>(null);
  const [carrierName, setCarrierName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInsPayment, setShowInsPayment] = useState(false);
  const [showFillOut, setShowFillOut] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  // ✅ Notes state management
  const [claimNotes, setClaimNotes] = useState<string>("");
  const [notesDirty, setNotesDirty] = useState(false);

  const num = (s?: string | number | null): number => {
    if (s == null) return 0;
    const n = typeof s === "number" ? s : parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };
  // Date-only values (submitted_date, close_date, date_of_service_*) must be read
  // from their parts: `new Date("2026-08-29")` is parsed as UTC midnight, which
  // renders as the 28th in any timezone behind UTC — the Claim Sent Date stamped
  // "today" by the backend showed up as yesterday. Timestamps keep local
  // conversion, which is what they mean.
  const fmtDate = (s?: string | null): string => {
    if (!s) return "-";
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      return `${m}/${d}/${y}`;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime())
      ? s
      : d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };
  const errMsg = (err: unknown): string | undefined =>
    (err as { response?: { data?: { detail?: string; error?: { message?: string } } } })?.response
      ?.data?.detail ||
    (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message;

  // Load composed claim detail from /insurance-claims/{id}/detail.
  const loadClaim = useCallback(async () => {
    if (!claimId) {
      setError("Claim ID is required");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getClaimDetail(claimId);
      setData(res);
      setClaimNotes(res.claim.notes || "");
      setNotesDirty(false);
      if (res.claim.carrier_id != null) {
        getInsuranceCarrier(res.claim.carrier_id)
          .then((c) => setCarrierName(c.name))
          .catch(() => setCarrierName(""));
      } else {
        setCarrierName("");
      }
    } catch (err) {
      console.error("Error fetching claim details:", err);
      setError(errMsg(err) || "Failed to load claim details");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadClaim();
  }, [loadClaim]);

  // Adapt the composed response into the shape this screen renders. Fields the
  // backend doesn't expose (subscriber, employer, ICD-10, check/bank/EOB) show "-".
  const claim = useMemo(() => {
    if (!data) return null;
    const c = data.claim;
    const billed = num(c.total_billed);
    const estIns = num(c.est_insurance);
    const paid = num(c.total_paid);
    return {
      claim_id: c.id,
      claim_number: c.claim_number,
      billing_order: c.billing_order || "-",
      date_of_service_from: [
        fmtDate(c.date_of_service_from),
        c.date_of_service_to ? fmtDate(c.date_of_service_to) : null,
      ]
        .filter(Boolean)
        .join(" – "),
      created_by: c.created_by != null ? `User #${c.created_by}` : "-",
      created_date: fmtDate(c.created_at),
      created_time: "",
      last_status_update_date: fmtDate(c.submitted_date),
      icd10_codes: "-",
      status: c.status,
      claim_type: c.claim_type,
      claim_sent_date: fmtDate(c.submitted_date),
      claim_close_date: fmtDate(c.close_date),
      claim_closed_by: "-",
      dxc_attachment_id: "-",
      notes: c.notes || "",
      patient_info: {
        patient_name: patient?.name || "-",
        patient_id: patientId || String(c.patient_id),
        patient_dob: patient?.dob || "-",
        subscriber_name: "-",
        subscriber_id: "-",
        subscriber_dob: "-",
      },
      coverage_info: {
        insurance_carrier:
          carrierName || (c.carrier_id != null ? `Carrier #${c.carrier_id}` : "-"),
        group_plan: c.ins_plan_id != null ? `Plan #${c.ins_plan_id}` : "-",
        employer_name: "-",
        benefits_used: "-",
      },
      amounts: {
        total_submitted_fees: billed,
        total_fee: billed,
        total_est_insurance: estIns,
        total_insurance_paid: paid,
        variance: estIns - paid,
      },
      // Remittance identifiers live on the coverage rows the Insurance Payment
      // window writes (INS-1). Show the most recently posted values.
      payment_info: (() => {
        const posted = data.coverage
          .filter((cv) => cv.check_number || cv.bank_number || cv.eob_number || cv.eft_trace_number)
          .sort((a, b) => (a.payment_date ?? "").localeCompare(b.payment_date ?? ""));
        const last = posted[posted.length - 1];
        return {
          check_number: last?.check_number ?? null,
          bank_number: last?.bank_number ?? null,
          eob_number: last?.eob_number ?? last?.eft_trace_number ?? null,
        };
      })(),
    };
  }, [data, patient, patientId, carrierName]);

  // Derive procedures from the composed response, joining coverage by procedure_id.
  const procedures: ClaimProcedure[] = useMemo(() => {
    if (!data) return [];
    const covByProc = new Map(
      data.coverage.filter((cv) => cv.procedure_id).map((cv) => [cv.procedure_id as string, cv]),
    );
    return data.procedures.map((p) => {
      const cov = covByProc.get(p.id);
      const description =
        procedureCodes.find((pc) => pc.code === p.procedure_code)?.description ?? p.procedure_code;
      return {
        id: p.id,
        dos: fmtDate(p.date_of_service),
        code: p.procedure_code,
        tooth: p.tooth || "",
        surface: p.surface || "-",
        description,
        bref: p.billing_order || "-",
        submitted: num(p.fee),
        fee: num(p.fee),
        estIns: num(p.insurance_estimate),
        insPayD: num(cov?.prim_ins_paid),
        insOverD: 0,
        insAllocat: num(cov?.prim_ins_paid) + num(cov?.sec_ins_paid),
        overDtc: 0,
        writeOff1: num(cov?.prim_ins_adjust),
        writeOff2: num(cov?.sec_ins_adjust),
        writeOff3: 0,
        otherIns: num(cov?.sec_ins_paid),
        reasonCo: "-",
      };
    });
  }, [data]);

  // ✅ Evaluate attachment requirements dynamically
  const attachmentEvaluation = useMemo(() => {
    const procedureData: ClaimProcedureData[] = procedures.map((p) => {
      const procCodeData = procedureCodes.find((pc) => pc.code === p.code);
      return {
        code: p.code,
        category: procCodeData?.category,
        description: p.description,
        tooth: p.tooth,
      };
    });

    return evaluateClaimAttachments(procedureData);
  }, [procedures]);

  // ✅ Only ERROR blocks submission
  const hasBlockingError =
    attachmentEvaluation.validationSeverity === "error";

  // Save editable claim notes via PATCH /insurance-claims/{id}.
  const handleSave = async () => {
    if (!claimId) return;
    setBusy(true);
    try {
      await updateInsuranceClaim(claimId, { notes: claimNotes });
      setNotesDirty(false);
      await loadClaim();
    } catch (err) {
      alert(errMsg(err) || "Failed to save claim notes. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Manual status transitions via POST /insurance-claims/{id}/status (the backend
  // sets submitted/paid/close dates and closes the claim on "closed").
  const handleCloseClaim = async () => {
    if (!claimId || !confirm("Are you sure you want to close this claim?")) return;
    setBusy(true);
    try {
      await setClaimStatus(claimId, { status: "closed" });
      navigate(`/patient/${patientId}/ledger`);
    } catch (err) {
      alert(errMsg(err) || "Failed to close claim.");
    } finally {
      setBusy(false);
    }
  };

  // Opens the Update Claim Status dialog. It used to be a window.prompt taking
  // free text, which saved unusable values (a capitalised "Submitted" skipped
  // the backend's Claim Sent Date stamp) and never confirmed the write.
  const handleUpdateStatus = () => setShowStatus(true);

  const handleDeleteClaim = async () => {
    if (!claimId || !confirm("Are you sure you want to delete this claim?")) return;
    setBusy(true);
    try {
      await deleteInsuranceClaim(claimId);
      navigate(`/patient/${patientId}/ledger`);
    } catch (err) {
      alert(errMsg(err) || "Failed to delete claim.");
    } finally {
      setBusy(false);
    }
  };

  // Not yet available (clearinghouse = Phase-4 EDI; print = no report service).
  const handleValidateClaim = () =>
    alert("Clearinghouse validation is not available yet (Phase-4 EDI).");
  const handleEClaim = () =>
    alert("E-claim submission is not available yet (Phase-4 EDI). Use UPDATE STATUS for manual status changes.");
  const handleClaimAttachments = () => setShowAttachments((s) => !s);

  const handleUploadAttachment = async () => {
    if (!claimId || !attFile) {
      alert("Choose a file to attach.");
      return;
    }
    if (attFile.size > 10 * 1024 * 1024) {
      alert("File must be 10 MB or smaller.");
      return;
    }
    setUploadingAtt(true);
    try {
      await uploadClaimAttachment(claimId, {
        file: attFile,
        attachment_type: attType || null,
      });
      setAttFile(null);
      setAttType("");
      if (attachFileRef.current) attachFileRef.current.value = "";
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/insurance-claims/${claimId}/attachments`],
      });
    } catch (err) {
      alert(errMsg(err) || "Attachment upload failed.");
    } finally {
      setUploadingAtt(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!claimId || !confirm("Delete this attachment?")) return;
    setDeletingAttId(attachmentId);
    try {
      await deleteClaimAttachment(claimId, attachmentId);
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/insurance-claims/${claimId}/attachments`],
      });
    } catch (err) {
      alert(errMsg(err) || "Attachment delete failed.");
    } finally {
      setDeletingAttId(null);
    }
  };
  // Opens the Dental Insurance Fill-out Form (legacy "Claim Fill-Out Information").
  const handleClaimFillOut = () => setShowFillOut(true);
  const handleInsurancePayment = () => {
    if (!data) return;
    setShowInsPayment(true);
  };
  const handleDirectPrint = () =>
    alert("Claim form printing is not available yet (no report service).");

  const handleCancel = () => {
    navigate(`/patient/${patientId}/ledger`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 font-medium">Loading claim details...</p>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 font-medium">
            {error || "Claim not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-full mx-auto">
        {/* 1️⃣ HEADER */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between border-b-2 border-[#16293B]">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">
            Primary Dental Insurance Claim
          </h1>
          <div className="text-white text-sm font-bold">
            PGID {getTenantId()} / OID {getOfficeId()}
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* 2️⃣ INLINE DOCUMENTATION WARNING (SLIM FYI STRIP) */}
          {attachmentEvaluation.validationSeverity &&
            attachmentEvaluation.validationSeverity !==
              "error" && (
              <div className="mb-2 rounded-md border-l-4 border-orange-400 bg-orange-50 p-2 text-sm space-y-0.5">
                <div className="font-semibold text-orange-900">
                  ⚠️ Documentation Expected
                </div>
                {attachmentEvaluation.validationMessages.map(
                  (msg, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-orange-900"
                    >
                      {msg}
                    </div>
                  ),
                )}
                <div className="text-xs text-slate-600 pt-1">
                  <strong>Tip:</strong> Upload documentation via
                  CLAIM ATTACHMENTS before submitting to
                  clearinghouse.
                </div>
                <div className="text-xs text-slate-600">
                  <strong>Note:</strong> This is informational
                  and does not block E-Claim submission.
                </div>
              </div>
            )}

          {/* 3️⃣ TOP ACTION BUTTONS (SINGLE COMPACT ROW) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleValidateClaim}
              className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide"
            >
              VALIDATE CLAIM
            </button>
            <button
              onClick={handleClaimAttachments}
              className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide"
            >
              CLAIM ATTACHMENTS
            </button>
            <button
              onClick={handleClaimFillOut}
              className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide"
            >
              CLAIM FILL-OUT
            </button>
            <button
              onClick={handleInsurancePayment}
              className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide"
            >
              INSURANCE PAYMENT
            </button>
          </div>

          {/* Claim Attachments panel (toggled by CLAIM ATTACHMENTS) */}
          {showAttachments && (
            <div className="bg-white border-2 border-[#E2E8F0] rounded">
              <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0] flex items-center justify-between">
                <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                  Claim Attachments
                </h2>
                <button
                  onClick={() => setShowAttachments(false)}
                  className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
              <div className="p-3 space-y-3">
                {/* Upload row */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={attType}
                    onChange={(e) => setAttType(e.target.value)}
                    placeholder="Type (e.g. X-Ray, EOB)"
                    className="px-2 py-1 text-xs border-2 border-slate-300 rounded w-40"
                  />
                  <input
                    ref={attachFileRef}
                    type="file"
                    onChange={(e) => setAttFile(e.target.files?.[0] ?? null)}
                    className="text-xs"
                  />
                  <button
                    onClick={handleUploadAttachment}
                    disabled={uploadingAtt || !attFile}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingAtt ? (
                      <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />
                    ) : (
                      <Upload className="w-3 h-3" strokeWidth={2} />
                    )}
                    {uploadingAtt ? "Uploading…" : "Upload"}
                  </button>
                  <span className="text-xs text-slate-500">Max 10 MB.</span>
                </div>

                {/* List */}
                {attachmentsQuery.isLoading ? (
                  <div className="py-4 text-center">
                    <Loader2 className="w-5 h-5 text-[#1F3A5F] animate-spin mx-auto" strokeWidth={2} />
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">No attachments yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded">
                    {attachments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={2} />
                        <span className="font-semibold text-slate-900 truncate">{a.file_name}</span>
                        {a.attachment_type && (
                          <span className="text-slate-500">({a.attachment_type})</span>
                        )}
                        <a
                          href={fileHref(a.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="View / Download"
                        >
                          <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(a.id)}
                          disabled={deletingAttId === a.id}
                          className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingAttId === a.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4️⃣ PATIENT / COVERAGE SUMMARY ROW (2 COLUMNS) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left: Patient / Subscriber */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">Patient:</span>{" "}
                {claim.patient_info.patient_name}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">Pat ID:</span>{" "}
                {claim.patient_info.patient_id} &nbsp;&nbsp;
                <span className="text-slate-500">
                  DOB:
                </span>{" "}
                {claim.patient_info.patient_dob}
              </div>
              <div className="text-xs font-medium text-slate-900 pt-1">
                <span className="text-slate-500">
                  Subscriber:
                </span>{" "}
                {claim.patient_info.subscriber_name}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">Sub ID:</span>{" "}
                {claim.patient_info.subscriber_id} &nbsp;&nbsp;
                <span className="text-slate-500">
                  DOB:
                </span>{" "}
                {claim.patient_info.subscriber_dob}
              </div>
            </div>

            {/* Right: Coverage */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">Carrier:</span>{" "}
                {claim.coverage_info.insurance_carrier}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">
                  Group Plan:
                </span>{" "}
                {claim.coverage_info.group_plan || "–"}
              </div>
              <div className="text-xs font-medium text-slate-900 pt-1">
                <span className="text-slate-500">
                  Employer:
                </span>{" "}
                {claim.coverage_info.employer_name}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">
                  Benefits Used:
                </span>{" "}
                {claim.coverage_info.benefits_used || "–"}
              </div>
            </div>
          </div>

          {/* 5️⃣ PROCEDURES IN THIS CLAIM (FULL WIDTH TABLE) */}
          <div className="bg-white border-2 border-[#E2E8F0] rounded overflow-hidden">
            <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
              <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                Procedures in This Claim
              </h2>
            </div>

            {/* Scroll container with proper overflow handling */}
            <div className="overflow-x-auto overflow-y-auto max-h-[320px]">
              <table className="min-w-[1600px] w-full text-xs">
                <thead className="sticky top-0 z-30 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                  <tr>
                    <th className="sticky left-0 z-40 bg-[#1F3A5F] px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                      DOS
                    </th>
                    <th className="sticky left-[80px] z-40 bg-[#1F3A5F] px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                      Code
                    </th>
                    <th className="sticky left-[140px] z-40 bg-[#1F3A5F] px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                      Th
                    </th>
                    <th className="px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                      Surf
                    </th>
                    <th className="px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                      Description
                    </th>
                    <th className="px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                      Bref
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Submitted
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Fee
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Est. Ins
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Ins Pay D
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Ins Over D
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Ins Allocat
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Over DTC
                      <OverpaymentInfo />
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Write-Off 1
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Write-Off 2
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Write-Off 3
                    </th>
                    <th className="px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                      Other Ins
                    </th>
                    <th className="px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                      Reason Co
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {procedures.map((proc) => (
                    <tr
                      key={proc.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="sticky left-0 z-20 bg-white px-2 py-1.5 whitespace-nowrap">
                        {proc.dos}
                      </td>
                      <td className="sticky left-[80px] z-20 bg-white px-2 py-1.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                          {proc.code}
                        </span>
                      </td>
                      <td className="sticky left-[140px] z-20 bg-white px-2 py-1.5 text-center whitespace-nowrap">
                        {proc.tooth || "-"}
                      </td>

                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {proc.surface}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {proc.description}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {proc.bref}
                      </td>

                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.submitted.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.fee.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.estIns.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.insPayD.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.insOverD.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.insAllocat.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.overDtc.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.writeOff1.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.writeOff2.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.writeOff3.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        ${proc.otherIns.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {proc.reasonCo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6️⃣ COMPACT INFO STRIP ROW (4 COLUMNS) */}
          <div className="grid grid-cols-4 gap-3 text-xs">
            {/* Column 1: CLAIM INFO */}
            <div className="border border-slate-300 rounded">
              <div className="bg-[#E8EFF7] px-2 py-1.5 font-bold text-[#1F3A5F] uppercase tracking-wide border-b border-slate-300">
                Claim Info
              </div>

              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim ID
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claim.claim_number || formatClaimId(claim.claim_id)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Billing Order
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claim.billing_order}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim DOS Dates
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claim.date_of_service_from}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Created By / On
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claim.created_by} {claim.created_date}{" "}
                    {claim.created_time}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Last Status Update Date
                  </span>
                  <span className="text-slate-900">
                    {claim.last_status_update_date || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    ICD-10 (Diagnostic Codes)
                  </span>
                  <span className="text-slate-900">
                    {claim.icd10_codes || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: CLAIM STATUS */}
            <div className="border border-slate-300 rounded">
              <div className="bg-[#E8EFF7] px-2 py-1.5 font-bold text-[#1F3A5F] uppercase tracking-wide border-b border-slate-300">
                Claim Status
              </div>

              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Sent Date / Claim Type
                  </span>
                  <span className="text-slate-900">
                    {claim.claim_sent_date || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Sent Status
                  </span>
                  <span className="font-semibold text-orange-600">
                    {claimStatusLabel(claim.status)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Close Date
                  </span>
                  <span className="text-slate-900">
                    {claim.claim_close_date || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Closed By
                  </span>
                  <span className="text-slate-900">
                    {claim.claim_closed_by || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Status
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claimStatusLabel(claim.status)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Clearinghouse Attachment ID
                  </span>
                  <span className="text-slate-900">
                    {claim.dxc_attachment_id || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: CLAIM AMOUNT */}
            <div className="border border-slate-300 rounded">
              <div className="bg-[#E8EFF7] px-2 py-1.5 font-bold text-[#1F3A5F] uppercase tracking-wide border-b border-slate-300">
                Claim Amount
              </div>

              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-900">
                    a. Total Submitted Fees
                  </span>
                  <span className="font-semibold text-slate-900">
                    ${claim.amounts.total_submitted_fees.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-900">
                    b. Total Fee
                  </span>
                  <span className="font-semibold text-slate-900">
                    ${claim.amounts.total_fee.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-900">
                    c. Total Est. Ins
                  </span>
                  <span className="font-semibold text-slate-900">
                    ${claim.amounts.total_est_insurance.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-900">
                    d. Total Ins. Paid
                  </span>
                  <span className="font-semibold text-slate-900">
                    ${claim.amounts.total_insurance_paid.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1 font-bold">
                  <span className="text-slate-900">
                    e. Variance (c-d)
                  </span>
                  <span className="text-orange-600">
                    ${claim.amounts.variance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 4: INSURANCE PAYMENT */}
            <div className="border border-slate-300 rounded">
              <div className="bg-[#E8EFF7] px-2 py-1.5 font-bold text-[#1F3A5F] uppercase tracking-wide border-b border-slate-300">
                Insurance Payment
              </div>

              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Check #
                  </span>
                  <span className="text-slate-900">
                    {claim.payment_info.check_number || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">Bank #</span>
                  <span className="text-slate-900">
                    {claim.payment_info.bank_number || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">EOB #</span>
                  <span className="text-slate-900">
                    {claim.payment_info.eob_number || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7️⃣ CLAIM NOTES (EDITABLE, NON-BLOCKING) */}
          <div className="bg-white border-2 border-[#E2E8F0] rounded">
            <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                Claim Notes
              </h2>

              {notesDirty && (
                <span className="text-xs text-orange-600 italic">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="p-3">
              <textarea
                value={claimNotes}
                onChange={(e) => {
                  setClaimNotes(e.target.value);
                  setNotesDirty(true);
                }}
                placeholder="Enter internal claim notes (not sent to payer)..."
                className="
                  w-full
                  min-h-[80px]
                  resize-y
                  text-xs
                  border
                  border-slate-300
                  rounded
                  p-2
                  focus:outline-none
                  focus:ring-1
                  focus:ring-[#1F3A5F]
                "
              />
            </div>
          </div>

          {/* 8️⃣ BOTTOM ACTION BAR (COMPACT) */}
          <div className="bg-slate-100 border-t-2 border-slate-300 px-6 py-2 flex items-center justify-between gap-3">
            {/* Left group: Destructive */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteClaim}
                className="px-3 py-1.5 text-xs rounded-md bg-slate-600 text-white hover:bg-slate-700 font-semibold uppercase tracking-wide flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" strokeWidth={2} />
                DELETE
              </button>
              <button
                onClick={handleDirectPrint}
                className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide flex items-center gap-1"
              >
                <Printer className="w-3 h-3" strokeWidth={2} />
                DIRECT PRINT
              </button>
              <button
                onClick={handleCloseClaim}
                className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide flex items-center gap-1"
              >
                <CheckCircle
                  className="w-3 h-3"
                  strokeWidth={2}
                />
                CLOSE CLAIM
              </button>
            </div>

            {/* Right group: Primary actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleEClaim}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold uppercase tracking-wide flex items-center gap-1 ${
                  hasBlockingError
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-[#1F3A5F] text-white hover:bg-[#2d5080]"
                }`}
                disabled={hasBlockingError}
              >
                <Send className="w-3 h-3" strokeWidth={2} />
                E-CLAIM
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide flex items-center gap-1"
              >
                <RefreshCw
                  className="w-3 h-3"
                  strokeWidth={2}
                />
                UPDATE STATUS
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3 h-3" strokeWidth={2} />
                {busy ? "SAVING…" : "SAVE"}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs rounded-md bg-slate-500 text-white hover:bg-slate-600 font-semibold uppercase tracking-wide flex items-center gap-1"
              >
                <X className="w-3 h-3" strokeWidth={2} />
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>

      {showStatus && data && (
        <UpdateClaimStatusModal
          claimId={data.claim.id}
          currentStatus={data.claim.status}
          onClose={() => setShowStatus(false)}
          onUpdated={loadClaim}
        />
      )}

      {showFillOut && data && (
        <ClaimFillOutModal
          claimId={data.claim.id}
          patientId={data.claim.patient_id}
          claimNumber={data.claim.claim_number}
          carrierName={claim.coverage_info.insurance_carrier}
          estInsurance={claim.amounts.total_est_insurance}
          totalBilled={claim.amounts.total_submitted_fees}
          onClose={() => setShowFillOut(false)}
          onSaved={loadClaim}
        />
      )}

      {showInsPayment && data && (
        <InsurancePaymentModal
          isOpen={showInsPayment}
          onClose={() => setShowInsPayment(false)}
          claim={data.claim}
          procedures={data.procedures}
          coverage={data.coverage}
          carrierName={carrierName}
          onPosted={loadClaim}
        />
      )}
    </div>
  );
}
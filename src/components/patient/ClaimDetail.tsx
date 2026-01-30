import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { components } from "../../styles/theme";
import {
  evaluateClaimAttachments,
  ClaimProcedureData,
} from "../../utils/attachmentEvaluator";
import { procedureCodes } from "../../data/procedureCodes";
import { getClaim, type ClaimDetailResponse } from "../../services/ledgerApi";

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

export default function ClaimDetail() {
  const navigate = useNavigate();
  const { patientId, claimId } = useParams();

  // Make patient context optional
  let patient: PatientData | undefined;
  try {
    const context = useOutletContext<OutletContext>();
    patient = context?.patient;
  } catch (e) {
    patient = undefined;
  }

  // Backend-driven claim data
  const [claim, setClaim] = useState<ClaimDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Notes state management
  const [claimNotes, setClaimNotes] = useState<string>("");
  const [notesDirty, setNotesDirty] = useState(false);

  // Load claim details from backend
  useEffect(() => {
    const fetchClaim = async () => {
      if (!patientId || !claimId) {
        setError("Patient ID and Claim ID are required");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getClaim(patientId, claimId);
        setClaim(data);
        setClaimNotes(data.notes || "");
        setNotesDirty(false);
      } catch (err: any) {
        console.error("Error fetching claim details:", err);
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            "Failed to load claim details",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchClaim();
  }, [patientId, claimId]);

  // Derive procedures array from claim
  const procedures: ClaimProcedure[] = useMemo(() => {
    if (!claim) return [];
    return claim.procedures.map((p) => ({
      id: p.procedure_id,
      dos: p.dos,
      code: p.code,
      tooth: p.tooth || "",
      surface: p.surface || "-",
      description: p.description,
      bref: p.bref,
      submitted: p.submitted,
      fee: p.fee,
      estIns: p.est_ins,
      insPayD: p.ins_paid,
      insOverD: p.ins_overpayment,
      insAllocat: p.ins_allocated,
      overDtc: p.overpayment_disbursement,
      writeOff1: p.write_off_1,
      writeOff2: p.write_off_2,
      writeOff3: p.write_off_3,
      otherIns: p.other_insurance,
      reasonCo: p.reason_code || "-",
    }));
  }, [claim]);

  const totalRow = {
    submitted: procedures.reduce((sum, p) => sum + p.submitted, 0),
    fee: procedures.reduce((sum, p) => sum + p.fee, 0),
    estIns: procedures.reduce((sum, p) => sum + p.estIns, 0),
    insPayD: procedures.reduce((sum, p) => sum + p.insPayD, 0),
    insOverD: procedures.reduce((sum, p) => sum + p.insOverD, 0),
    insAllocat: procedures.reduce((sum, p) => sum + p.insAllocat, 0),
    overDtc: procedures.reduce((sum, p) => sum + p.overDtc, 0),
    writeOff1: procedures.reduce((sum, p) => sum + p.writeOff1, 0),
    writeOff2: procedures.reduce((sum, p) => sum + p.writeOff2, 0),
    writeOff3: procedures.reduce((sum, p) => sum + p.writeOff3, 0),
    otherIns: procedures.reduce((sum, p) => sum + p.otherIns, 0),
  };

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

  // ✅ Handle save (placeholder - wire to backend when available)

  const handleValidateClaim = () => {
    alert("Validating claim with clearinghouse...");
  };

  const handleClaimAttachments = () => {
    alert("Opening Claim Attachment Manager...");
  };

  const handleClaimFillOut = () => {
    alert("Opening Claim Fill-Out Information...");
  };

  const handleInsurancePayment = () => {
    alert("Opening Insurance Payment Entry...");
  };

  const handleDeleteClaim = () => {
    if (
      confirm("Are you sure you want to delete this claim?")
    ) {
      alert("Claim deleted");
      navigate(`/patient/${patientId}/ledger`);
    }
  };

  const handleDirectPrint = () => {
    alert("Printing ADA Dental Claim Form...");
  };

  const handleCloseClaim = () => {
    if (confirm("Are you sure you want to close this claim?")) {
      alert("Claim closed");
      navigate(`/patient/${patientId}/ledger`);
    }
  };

  const handleEClaim = () => {
    alert("Adding claim to E-Claim batch queue...");
  };

  const handleUpdateStatus = () => {
    alert("Updating claim status from clearinghouse...");
  };

  const handleSave = () => {
    // ✅ Save notes along with other claim data
    // In production, this would call updateClaim(patientId, claimId, { notes: claimNotes })
    setNotesDirty(false);
    alert("Claim saved");
  };

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
            PGID {claim.claim_number} / CID-CLM-{claim.claim_id}
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
                    {claim.claim_id}
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
                    {claim.status}
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
                    {claim.status}
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
                className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide flex items-center gap-1"
              >
                <Save className="w-3 h-3" strokeWidth={2} />
                SAVE
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
    </div>
  );
}
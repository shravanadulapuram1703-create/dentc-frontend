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

  // Mock claim data
  const [claim] = useState({
    claimId: claimId || "108",
    pgid: "2829",
    status: "Claim Created, Not Sent",
    createdDate: "12/19/2025",
    createdBy: "UDAIVS",
    createdTime: "10/23/2025 11:06 AM PT",
    lastStatusUpdateDate: "",
    claimType: "Dental",
    claimBillingOrder: "Dental",
    claimDOSDates: "12/19/2025",
    claimSentDate: "",
    claimSentStatus: "",
    claimCloseDate: "",
    claimClosedBy: "",
    dxcAttachmentId: "",
    icd10Codes: "",

    // Patient/Subscriber Info
    patientName: "Miller, Nicolas",
    patientId: "920097",
    patientDOB: "12/09/1993",
    subscriberName: "Miller, Nick",
    subscriberID: "mmmmm",
    subscriberDOB: "12/08/1993",
    responsibleParty: "Miller, Nick",
    rpID: "920088",
    rpDOB: "12/08/1993",

    // Coverage Info
    insuranceCarrier: "United Concordia",
    carrierPhone: "",
    groupPlan: "",
    benefitsUsed: "",
    employerName: "No Employer",
    deductiblesUsed: "",

    // Billing Dentist
    billingDentist: "Jinna, Onileaip DMD",

    // Treating Dentist
    treatingDentist: "Sharma, Neha",

    // Amounts
    totalSubmittedFees: 1795.0,
    totalFee: 665.79,
    totalEstIns: 469.95,
    totalInsPaid: 0.0,
    variance: 469.95,
    checkNumber: "",
    bankNumber: "",
    eobNumber: "",

    // Notes
    notes: "",

    // Flags
    attachmentRequired: true,
  });

  // ✅ Notes state management
  const [claimNotes, setClaimNotes] = useState<string>("");
  const [notesDirty, setNotesDirty] = useState(false);

  // Mock procedures in claim
  const [procedures] = useState<ClaimProcedure[]>([
    {
      id: "1",
      dos: "12/19/2025",
      code: "D0140",
      tooth: "",
      surface: "-",
      description: "Limited Oral Eval...",
      bref: "7/15",
      submitted: 100.0,
      fee: 36.59,
      estIns: 36.59,
      insPayD: 0.0,
      insOverD: 0.0,
      insAllocat: 0.0,
      overDtc: 0.0,
      writeOff1: 0.0,
      writeOff2: 0.0,
      writeOff3: 0.0,
      otherIns: 0.0,
      reasonCo: "-",
    },
    {
      id: "2",
      dos: "12/19/2025",
      code: "D3330",
      tooth: "31",
      surface: "-",
      description: "Endodontic Thera...",
      bref: "7/15",
      submitted: 1600.0,
      fee: 629.2,
      estIns: 433.36,
      insPayD: 0.0,
      insOverD: 0.0,
      insAllocat: 0.0,
      overDtc: 0.0,
      writeOff1: 0.0,
      writeOff2: 0.0,
      writeOff3: 0.0,
      otherIns: 0.0,
      reasonCo: "-",
    },
  ]);

  const totalRow = {
    submitted: procedures.reduce(
      (sum, p) => sum + p.submitted,
      0,
    ),
    fee: procedures.reduce((sum, p) => sum + p.fee, 0),
    estIns: procedures.reduce((sum, p) => sum + p.estIns, 0),
    insPayD: 0.0,
    insOverD: 0.0,
    insAllocat: 0.0,
    overDtc: 0.0,
    writeOff1: 0.0,
    writeOff2: 0.0,
    writeOff3: 0.0,
    otherIns: 0.0,
  };

  // ✅ Evaluate attachment requirements dynamically
  const attachmentEvaluation = useMemo(() => {
    const procedureData: ClaimProcedureData[] = procedures.map(
      (p) => {
        const procCodeData = procedureCodes.find(
          (pc) => pc.code === p.code,
        );
        return {
          code: p.code,
          category: procCodeData?.category,
          description: p.description,
          tooth: p.tooth,
        };
      },
    );

    return evaluateClaimAttachments(procedureData);
  }, [procedures]);

  // ✅ Only ERROR blocks submission
  const hasBlockingError =
    attachmentEvaluation.validationSeverity === "error";

  // ✅ Initialize notes from claim data when component loads or claim changes
  useEffect(() => {
    setClaimNotes(claim.notes || "");
    setNotesDirty(false);
  }, [claim]);

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
    // In production, this would be: await api.updateClaim(claimId, { notes: claimNotes });
    console.log("Saving claim with notes:", claimNotes);

    setNotesDirty(false);
    alert("Claim saved");
  };

  const handleCancel = () => {
    navigate(`/patient/${patientId}/ledger`);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-full mx-auto">
        {/* 1️⃣ HEADER */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between border-b-2 border-[#16293B]">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">
            Primary Dental Insurance Claim
          </h1>
          <div className="text-white text-sm font-bold">
            PGID {claim.pgid} / CID-CLM-{claim.claimId}
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
                {claim.patientName}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">Pat ID:</span>{" "}
                {claim.patientId} &nbsp;&nbsp;
                <span className="text-slate-500">
                  DOB:
                </span>{" "}
                {claim.patientDOB}
              </div>
              <div className="text-xs font-medium text-slate-900 pt-1">
                <span className="text-slate-500">
                  Subscriber:
                </span>{" "}
                {claim.subscriberName}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">Sub ID:</span>{" "}
                {claim.subscriberID} &nbsp;&nbsp;
                <span className="text-slate-500">
                  DOB:
                </span>{" "}
                {claim.subscriberDOB}
              </div>
            </div>

            {/* Right: Coverage */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">Carrier:</span>{" "}
                {claim.insuranceCarrier}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">
                  Group Plan:
                </span>{" "}
                {claim.groupPlan || "–"}
              </div>
              <div className="text-xs font-medium text-slate-900 pt-1">
                <span className="text-slate-500">
                  Employer:
                </span>{" "}
                {claim.employerName}
              </div>
              <div className="text-xs font-medium text-slate-900">
                <span className="text-slate-500">
                  Benefits Used:
                </span>{" "}
                {claim.benefitsUsed || "–"}
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
                    {claim.claimId}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Billing Order
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claim.claimBillingOrder}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim DOS Dates
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claim.claimDOSDates}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Created By / On
                  </span>
                  <span className="font-semibold text-slate-900">
                    {claim.createdBy} {claim.createdDate}{" "}
                    {claim.createdTime}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Last Status Update Date
                  </span>
                  <span className="text-slate-900">
                    {claim.lastStatusUpdateDate || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    ICD-10 (Diagnostic Codes)
                  </span>
                  <span className="text-slate-900">
                    {claim.icd10Codes || "-"}
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
                    {claim.claimSentDate || "-"}
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
                    {claim.claimCloseDate || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">
                    Claim Closed By
                  </span>
                  <span className="text-slate-900">
                    {claim.claimClosedBy || "-"}
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
                    {claim.dxcAttachmentId || "-"}
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
                    ${claim.totalSubmittedFees.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-900">
                    b. Total Fee
                  </span>
                  <span className="font-semibold text-slate-900">
                    ${claim.totalFee.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-900">
                    c. Total Est. Ins
                  </span>
                  <span className="font-semibold text-slate-900">
                    ${claim.totalEstIns.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-900">
                    d. Total Ins. Paid
                  </span>
                  <span className="font-semibold text-slate-900">
                    ${claim.totalInsPaid.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1 font-bold">
                  <span className="text-slate-900">
                    e. Variance (c-d)
                  </span>
                  <span className="text-orange-600">
                    ${claim.variance.toFixed(2)}
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
                    {claim.checkNumber || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">Bank #</span>
                  <span className="text-slate-900">
                    {claim.bankNumber || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[55%_45%] px-2 py-1">
                  <span className="text-slate-600">EOB #</span>
                  <span className="text-slate-900">
                    {claim.eobNumber || "-"}
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
import { useState } from "react";
import { X, DollarSign, Loader2 } from "lucide-react";
import { components } from "../../styles/theme";
import {
  createLedgerInsuranceDetail,
  recalculateClaim,
} from "@/api/generated/endpoints/billing/billing";
import type { ClaimDetailProcedureRead, LedgerInsuranceDetailCreate } from "@/api/generated/model";

interface ClaimLite {
  id: string;
  patient_id: number;
  office_id?: number | null;
  ins_plan_id?: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimLite;
  procedures: ClaimDetailProcedureRead[];
  /** Called after the insurance detail rows post + the claim recalculates. */
  onPosted: () => void;
}

interface RowInput {
  paid: string;
  adjust: string;
  deductible: string;
}

const money = (value: number): string => `$${value.toFixed(2)}`;

/**
 * Post a primary-insurance payment against a claim's procedures.
 *
 * Each procedure row writes a LedgerInsuranceDetail (POST /ledger-insurance-details)
 * carrying prim_ins_paid / prim_ins_adjust (contractual write-off) / prim_deductible,
 * keyed to claim_id + procedure_id + prim_ins_plan_id; then the claim is recalculated
 * (POST /insurance-claims/{id}/recalculate).
 *
 * NOTE: carrier check / EFT / EOB numbers have no field on LedgerInsuranceDetailCreate
 * (backend gap INS-1 — see docs/transactions), so they are not captured here yet.
 */
export default function InsurancePaymentModal({ isOpen, onClose, claim, procedures, onPosted }: Props) {
  const [rows, setRows] = useState<Record<string, RowInput>>({});
  const [saving, setSaving] = useState(false);

  const setField = (procId: string, field: keyof RowInput, value: string) =>
    setRows((prev) => ({
      ...prev,
      [procId]: { paid: "", adjust: "", deductible: "", ...prev[procId], [field]: value },
    }));

  const totalPaid = Object.values(rows).reduce((s, r) => s + (parseFloat(r.paid) || 0), 0);
  const totalAdjust = Object.values(rows).reduce((s, r) => s + (parseFloat(r.adjust) || 0), 0);

  const handlePost = async () => {
    // Build one LedgerInsuranceDetail per procedure with any entered value.
    const details: LedgerInsuranceDetailCreate[] = procedures
      .map((p): LedgerInsuranceDetailCreate | null => {
        const r = rows[p.id];
        const paid = parseFloat(r?.paid ?? "") || 0;
        const adjust = parseFloat(r?.adjust ?? "") || 0;
        const deductible = parseFloat(r?.deductible ?? "") || 0;
        if (paid <= 0 && adjust <= 0 && deductible <= 0) return null;
        return {
          patient_id: claim.patient_id,
          claim_id: claim.id,
          procedure_id: p.id,
          office_id: claim.office_id ?? p.office_id ?? null,
          prim_ins_plan_id: claim.ins_plan_id ?? null,
          prim_ins_paid: paid.toFixed(2),
          prim_ins_adjust: adjust.toFixed(2),
          prim_deductible: deductible.toFixed(2),
          prim_posted: true,
        };
      })
      .filter((d): d is LedgerInsuranceDetailCreate => d !== null);

    if (details.length === 0) {
      alert("Enter at least one paid, write-off, or deductible amount.");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(details.map((d) => createLedgerInsuranceDetail(d)));
      const failed = results.filter((r) => r.status === "rejected").length;

      // Recompute the claim totals from its procedures.
      await recalculateClaim(claim.id).catch(() => null);

      if (failed > 0) {
        alert(`Posted ${details.length - failed} of ${details.length} rows. ${failed} failed — please review.`);
      }
      onPosted();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || "Failed to post insurance payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-[#E2E8F0]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between rounded-t-lg border-b-2 border-[#16293B]">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">Insurance Payment</h2>
          <button onClick={onClose} className="text-white hover:bg-[#16314d] rounded-lg p-2 transition-colors">
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4 bg-[#F7F9FC]">
          <p className="text-xs text-slate-500 mb-3">
            Enter the carrier&apos;s paid amount, contractual write-off, and deductible per procedure.
          </p>
          <div className="bg-white border-2 border-[#E2E8F0] rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                <tr>
                  <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">DOS</th>
                  <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Code</th>
                  <th className="px-2 py-3 text-center font-bold uppercase tracking-wide">Th</th>
                  <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Fee</th>
                  <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Est Ins</th>
                  <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Ins Paid</th>
                  <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Write-Off</th>
                  <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Deductible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {procedures.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7F9FC] transition-colors">
                    <td className="px-2 py-2 font-mono">{p.date_of_service}</td>
                    <td className="px-2 py-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                        {p.procedure_code}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">{p.tooth || "-"}</td>
                    <td className="px-2 py-2 text-right">{money(Number(p.fee) || 0)}</td>
                    <td className="px-2 py-2 text-right">{money(Number(p.insurance_estimate) || 0)}</td>
                    {(["paid", "adjust", "deductible"] as const).map((field) => (
                      <td key={field} className="px-2 py-2 text-right">
                        <input
                          type="number"
                          value={rows[p.id]?.[field] ?? ""}
                          onChange={(e) => setField(p.id, field, e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-right"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#E8EFF7] font-bold text-[#1F3A5F]">
                  <td className="px-2 py-2" colSpan={5}>
                    Totals
                  </td>
                  <td className="px-2 py-2 text-right">{money(totalPaid)}</td>
                  <td className="px-2 py-2 text-right">{money(totalAdjust)}</td>
                  <td className="px-2 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t-2 border-slate-300 px-6 py-3 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={handlePost}
            disabled={saving}
            className={components.buttonPrimary + " flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <DollarSign className="w-4 h-4" strokeWidth={2} />}
            {saving ? "POSTING…" : "POST PAYMENT"}
          </button>
          <button onClick={onClose} className={components.buttonSecondary}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

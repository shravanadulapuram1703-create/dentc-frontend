// "Add Procedure" for the Add / Edit Appointment screen.
//
// The button used to append a hardcoded row (D0120 "Periodic Oral Evaluation",
// tooth 1, $50) — a fixture, not a procedure the user chose. This picker is the
// real flow: browse/search the full procedure-code catalogue, satisfy the code's
// tooth / surface / quadrant / material requirements, pick the treating
// provider, and price the line against the patient's fee schedule.
//
// It deliberately does NOT post a ledger charge (that is Transactions → Add
// Procedures, `patient-procedures`). An appointment procedure is a *planned*
// line and is persisted to `appointment-procedures` when the appointment saves.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import ToothSurfaceEnforcement from "../patient/ToothSurfaceEnforcement";
import {
  newRowId,
  type AppointmentProcedureLine,
} from "../../services/appointmentProceduresApi";
import {
  resolveProcedureFee,
  type FeeScheduleContext,
} from "../../services/feeScheduleResolver";
import type { ProcedureCode, Provider } from "../../services/schedulerApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  /** Full catalogue, already loaded by the parent. */
  procedureCodes: ProcedureCode[];
  categories: Array<{ id: string; name: string; displayName: string }>;
  providers: Provider[];
  /** Provider pre-selected from the appointment. */
  defaultProviderId: string;
  /** Pricing context for this patient/office/provider. */
  feeContext: FeeScheduleContext;
  /** Status stamped on the new line ("C" for a same-day visit, else "TP"). */
  defaultStatus: string;
  /** Pre-selected code (Quick Add row click). */
  initialCode?: ProcedureCode | null;
  onAdd: (line: AppointmentProcedureLine) => void;
}

const DEFAULT_SURFACES = ["M", "O", "D", "B", "L", "I", "F"];
const DEFAULT_MATERIALS = [
  "High Noble Metal",
  "Base Metal",
  "Noble Metal",
  "Titanium",
  "Resin",
  "Porcelain/Ceramic",
  "Zirconia",
  "E.max",
];

const normalizeCategory = (value: string) =>
  (value ?? "").replace(/\s+/g, "").toUpperCase();

export default function AppointmentProcedurePicker({
  isOpen,
  onClose,
  patientName,
  procedureCodes,
  categories,
  providers,
  defaultProviderId,
  feeContext,
  defaultStatus,
  initialCode = null,
  onAdd,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchCode, setSearchCode] = useState("");
  const [searchUserCode, setSearchUserCode] = useState("");
  const [searchDescription, setSearchDescription] = useState("");
  const [selected, setSelected] = useState<ProcedureCode | null>(initialCode);

  const [providerId, setProviderId] = useState(defaultProviderId);
  const [duration, setDuration] = useState<number>(initialCode?.defaultDuration ?? 30);
  const [tooth, setTooth] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showEnforcement, setShowEnforcement] = useState(false);

  const [pricing, setPricing] = useState<{
    fee: number;
    est_patient: number;
    est_insurance: number;
    reason: string;
  } | null>(null);
  const [isPricing, setIsPricing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProviderId(defaultProviderId);
  }, [defaultProviderId]);

  // Pre-selected from a Quick Add row: adopt it and immediately ask for the
  // anatomy the code requires.
  useEffect(() => {
    if (!isOpen || !initialCode) return;
    setSelected(initialCode);
    setDuration(initialCode.defaultDuration ?? 30);
    const r = initialCode.requirements;
    if (r.tooth || r.surface || r.quadrant || r.materials) setShowEnforcement(true);
  }, [isOpen, initialCode]);

  // Price the selected code against the patient's fee schedule. This replaces
  // the invented "30% patient / 70% insurance" split the old Quick Add used.
  useEffect(() => {
    if (!selected) {
      setPricing(null);
      return;
    }
    let cancelled = false;
    setIsPricing(true);
    void resolveProcedureFee(feeContext, selected.code, {
      default_fee: selected.defaultFee,
    })
      .then((p) => {
        if (cancelled) return;
        setPricing({
          fee: p.fee,
          est_patient: p.patient_estimate,
          est_insurance: p.insurance_estimate,
          reason: p.reason,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPricing({
          fee: selected.defaultFee,
          est_patient: selected.defaultFee,
          est_insurance: 0,
          reason: "Fee schedule unavailable — using the code's default fee",
        });
      })
      .finally(() => {
        if (!cancelled) setIsPricing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, feeContext]);

  const filtered = useMemo(() => {
    const code = searchCode.trim().toLowerCase();
    const user = searchUserCode.trim().toLowerCase();
    const desc = searchDescription.trim().toLowerCase();
    return procedureCodes
      .filter(
        (p) =>
          selectedCategory === "ALL" ||
          normalizeCategory(p.category) === selectedCategory,
      )
      .filter(
        (p) =>
          (!code || p.code.toLowerCase().includes(code)) &&
          (!user || (p.userCode ?? "").toLowerCase().includes(user)) &&
          (!desc || p.description.toLowerCase().includes(desc)),
      )
      .slice(0, 500);
  }, [procedureCodes, selectedCategory, searchCode, searchUserCode, searchDescription]);

  if (!isOpen) return null;

  const pickCode = (proc: ProcedureCode) => {
    setSelected(proc);
    setError(null);
    setDuration(proc.defaultDuration ?? 30);
    setTooth("");
    setQuadrant("");
    setSurfaces([]);
    setMaterials([]);
    const r = proc.requirements;
    if (r.tooth || r.surface || r.quadrant || r.materials) setShowEnforcement(true);
  };

  const handleAdd = () => {
    if (!selected) {
      setError("Select a procedure code first.");
      return;
    }
    if (!providerId) {
      setError("Select the treating provider.");
      return;
    }
    const r = selected.requirements;
    const missing: string[] = [];
    if (r.tooth && !tooth) missing.push("tooth number");
    if (r.surface && surfaces.length === 0) missing.push("surface");
    if (r.quadrant && !quadrant) missing.push("quadrant");
    if (r.materials && materials.length === 0) missing.push("material");
    if (missing.length > 0) {
      setError(`This procedure requires: ${missing.join(", ")}.`);
      setShowEnforcement(true);
      return;
    }

    const fee = pricing?.fee ?? selected.defaultFee;
    const est_insurance = pricing?.est_insurance ?? 0;
    const est_patient = pricing?.est_patient ?? Math.max(fee - est_insurance, 0);

    onAdd({
      row_id: newRowId(),
      status: defaultStatus,
      procedure_code: selected.code,
      tooth: tooth || quadrant || "",
      surface: surfaces.join(""),
      description: selected.description,
      bill_to: "Patient",
      duration: Number(duration) || 0,
      provider_id: providerId,
      provider_units: 1,
      est_patient,
      est_insurance,
      fee,
      notes: [notes.trim(), materials.length ? `Materials: ${materials.join(", ")}` : ""]
        .filter(Boolean)
        .join(" | ") || null,
    });
    onClose();
  };

  const enforcementProcedure = selected
    ? {
        code: selected.code,
        userCode: selected.userCode,
        description: selected.description,
        category: selected.category,
        requirements: selected.requirements,
        anatomyRules: {
          mode: selected.requirements.quadrant
            ? ("QUADRANT" as const)
            : selected.requirements.tooth
              ? ("TOOTH" as const)
              : ("NONE" as const),
          allowedToothSet: "BOTH" as const,
          allowMultipleTeeth: false,
        },
        surfaceRules: {
          enabled: selected.requirements.surface ?? false,
          min: selected.requirements.surface ? 1 : undefined,
          max: selected.requirements.surface ? 5 : undefined,
          allowedSurfaces: DEFAULT_SURFACES,
        },
        materialsRules: {
          enabled: selected.requirements.materials ?? false,
          options: DEFAULT_MATERIALS,
          min: selected.requirements.materials ? 1 : undefined,
          max: undefined,
        },
        defaultFee: selected.defaultFee,
        defaultDuration: selected.defaultDuration,
      }
    : null;

  const inputCls =
    "px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
        <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-3 text-white">
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
              Add Procedure to Appointment
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#B0C4DE]">{patientName}</span>
              <button onClick={onClose} className="rounded p-1 hover:bg-[#162942]">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-[1.6fr_1fr] gap-4 overflow-hidden p-4">
            {/* LEFT: code browser */}
            <div className="flex flex-col overflow-hidden">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[{ id: "ALL", displayName: "All" }, ...categories].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id.toUpperCase())}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                      selectedCategory === cat.id.toUpperCase()
                        ? "bg-[#3A6EA5] text-white"
                        : "border border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#3A6EA5]"
                    }`}
                  >
                    {cat.displayName}
                  </button>
                ))}
              </div>
              <div className="mb-2 grid grid-cols-3 gap-2">
                <input
                  className={inputCls}
                  placeholder="By Code"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="By User Code"
                  value={searchUserCode}
                  onChange={(e) => setSearchUserCode(e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="By Description"
                  value={searchDescription}
                  onChange={(e) => setSearchDescription(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-auto rounded-lg border-2 border-[#E2E8F0]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Code</th>
                      <th className="px-3 py-2 text-left font-semibold">User Code</th>
                      <th className="px-3 py-2 text-left font-semibold">Description</th>
                      <th className="px-3 py-2 text-right font-semibold">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[#64748B]">
                          {procedureCodes.length === 0
                            ? "Loading procedure codes…"
                            : "No procedure codes match these filters."}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((proc) => (
                        <tr
                          key={proc.code}
                          onClick={() => pickCode(proc)}
                          className={`cursor-pointer border-b border-[#E2E8F0] transition-colors hover:bg-[#E8F4F8] ${
                            selected?.code === proc.code
                              ? "border-l-4 border-l-[#3A6EA5] bg-[#D1E9F6]"
                              : ""
                          }`}
                        >
                          <td className="px-3 py-1.5 font-semibold text-[#1F3A5F]">
                            {proc.code}
                          </td>
                          <td className="px-3 py-1.5 text-[#475569]">{proc.userCode}</td>
                          <td className="px-3 py-1.5 text-[#1E293B]">{proc.description}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-[#475569]">
                            {proc.defaultFee.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: line detail */}
            <div className="flex flex-col gap-3 overflow-auto rounded-lg border-2 border-[#E2E8F0] bg-[#F7F9FC] p-3">
              {!selected ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-[#64748B]">
                  <Search className="h-6 w-6" />
                  Pick a procedure code on the left.
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      Selected
                    </div>
                    <div className="text-sm font-bold text-[#1F3A5F]">{selected.code}</div>
                    <div className="text-sm text-[#1E293B]">{selected.description}</div>
                  </div>

                  <label className="text-xs font-semibold text-[#1E293B]">
                    Treating Provider <span className="text-[#EF4444]">*</span>
                    <select
                      value={providerId}
                      onChange={(e) => setProviderId(e.target.value)}
                      className={`mt-1 w-full bg-white ${inputCls}`}
                    >
                      <option value="">— Select provider —</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-[#1E293B]">
                    Duration (min)
                    <input
                      type="number"
                      min={0}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className={`mt-1 w-full bg-white ${inputCls}`}
                    />
                  </label>

                  <div className="rounded-lg border border-[#CBD5E1] bg-white p-2 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wide text-[#64748B]">
                        Tooth / Surface
                      </span>
                      <button
                        onClick={() => setShowEnforcement(true)}
                        className="rounded bg-[#3A6EA5] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#1F3A5F]"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-[#1E293B]">
                      Tooth: {tooth || quadrant || "—"} &nbsp;|&nbsp; Surfaces:{" "}
                      {surfaces.join("") || "—"}
                      {materials.length > 0 && (
                        <div className="mt-0.5 text-[#64748B]">
                          Materials: {materials.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>

                  <label className="text-xs font-semibold text-[#1E293B]">
                    Notes
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`mt-1 w-full bg-white ${inputCls}`}
                    />
                  </label>

                  <div className="rounded-lg border-2 border-[#3A6EA5] bg-[#E8F4F8] p-2 text-xs">
                    <div className="mb-1 font-semibold uppercase tracking-wide text-[#1F3A5F]">
                      Estimate
                    </div>
                    {isPricing ? (
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pricing…
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Fee</span>
                          <span className="font-semibold tabular-nums">
                            ${(pricing?.fee ?? selected.defaultFee).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. insurance</span>
                          <span className="tabular-nums">
                            ${(pricing?.est_insurance ?? 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. patient</span>
                          <span className="tabular-nums">
                            $
                            {(
                              pricing?.est_patient ?? selected.defaultFee
                            ).toFixed(2)}
                          </span>
                        </div>
                        {pricing?.reason && (
                          <div className="mt-1 text-[10px] text-[#64748B]">
                            {pricing.reason}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="rounded border-l-4 border-[#EF4444] bg-red-50 p-2 text-xs text-[#B91C1C]">
                      {error}
                    </div>
                  )}
                </>
              )}

              <div className="mt-auto flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border-2 border-[#E2E8F0] bg-white px-4 py-1.5 text-sm font-medium text-[#64748B] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!selected}
                  className="rounded-lg bg-[#2FB9A7] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#26a396] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Add to Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEnforcement && enforcementProcedure && (
        <ToothSurfaceEnforcement
          isOpen={showEnforcement}
          onClose={() => setShowEnforcement(false)}
          onSave={(data) => {
            setTooth(data.tooth);
            setQuadrant(data.quadrant);
            setSurfaces(data.surfaces);
            setMaterials(data.materials);
            setShowEnforcement(false);
            setError(null);
          }}
          procedure={enforcementProcedure as any}
          initialTooth={tooth}
          initialQuadrant={quadrant}
          initialSurfaces={surfaces}
          initialMaterials={materials}
        />
      )}
    </>,
    document.body,
  );
}

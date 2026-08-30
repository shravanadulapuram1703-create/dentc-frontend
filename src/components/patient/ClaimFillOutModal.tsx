// Dental Insurance Fill-out Form (legacy "Claim Fill-Out Information").
//
// Opened from the CLAIM FILL-OUT button on the claim screen. Mirrors the
// on-prem window: a patient/coverage banner across the top, then the ADA-form
// boxes that are not derived from the procedures — prior authorisation, place
// of treatment, ICD pointers, enclosures, accident, orthodontics, prosthesis
// and the printed remarks.
//
// Persistence is split (see claimFillOut.ts): first visit / student status /
// school name / assign-benefits are PATCHed onto the patient record, the rest
// is held per-claim in the browser until the backend grows the columns
// (docs/account-ledger/claim_fillout_backend_devreport.md).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Save, X } from "lucide-react";
import { getPatient, updatePatient } from "@/api/generated/endpoints/patients/patients";
import { listIcdCodes } from "@/api/generated/endpoints/procedures/procedures";
import type { PatientRead } from "@/api/generated/model";
import { US_STATES } from "@/components/modals/patient/constants";
import NoteMacroPickerModal from "./NoteMacroPickerModal";
import {
  clampEnclosure,
  emptyClaimFillOut,
  loadLocalClaimFillOut,
  saveLocalClaimFillOut,
  PLACE_OF_TREATMENT_OPTIONS,
  REMARKS_MAX_LENGTH,
  STUDENT_STATUS_OPTIONS,
  type ClaimFillOutForm,
} from "./claimFillOut";

interface Props {
  claimId: string;
  /** Real numeric patient id (claim.patient_id — not the chart number in the URL). */
  patientId: number;
  /** Header context already resolved by the claim screen. */
  claimNumber?: string | null;
  carrierName?: string;
  estInsurance?: number;
  totalBilled?: number;
  onClose: () => void;
  /** Fired after a successful save so the claim screen can refresh. */
  onSaved?: () => void;
}

const ICD_PAGE_SIZE = 200;

const dateOnly = (value?: string | null): string => (value ? String(value).slice(0, 10) : "");

const fmtDate = (value?: string | null): string => {
  const iso = dateOnly(value);
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
};

const money = (value?: number): string =>
  value == null || Number.isNaN(value) ? "-" : `$${value.toFixed(2)}`;

const ageFrom = (dob?: string | null): string => {
  const iso = dateOnly(dob);
  if (!iso) return "";
  const birth = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const before =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (before) age -= 1;
  return age >= 0 ? String(age) : "";
};

const errMsg = (err: unknown): string | undefined =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
  (err as { message?: string })?.message;

const LABEL = "text-xs font-medium text-slate-600";
const INPUT =
  "px-2 py-1 text-xs border-2 border-slate-300 rounded focus:outline-none focus:border-[#1F3A5F] disabled:bg-slate-100 disabled:text-slate-400";
const SECTION_HEAD =
  "bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0] text-xs font-bold text-[#1F3A5F] uppercase tracking-wide";

export default function ClaimFillOutModal({
  claimId,
  patientId,
  claimNumber,
  carrierName,
  estInsurance,
  totalBilled,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<ClaimFillOutForm>(() => emptyClaimFillOut());
  const [patient, setPatient] = useState<PatientRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string>("");
  const [showMacros, setShowMacros] = useState(false);

  const set = useCallback(
    <K extends keyof ClaimFillOutForm>(key: K, value: ClaimFillOutForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  // Seed from the patient record, then overlay anything saved locally for this
  // claim so the user's own entries win over the patient defaults.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getPatient(patientId)
      .then((p) => {
        if (cancelled) return;
        setPatient(p);
        const seeded: ClaimFillOutForm = {
          ...emptyClaimFillOut(),
          first_visit: dateOnly(p.first_visit),
          student_status: p.student_status || "No",
          school_name: p.school_name || "",
          assign_benefits: Boolean(p.assign_benefits),
        };
        const stored = loadLocalClaimFillOut(claimId);
        setForm(stored ? { ...seeded, ...stored.form } : seeded);
        setSavedAt(stored?.saved_at || "");
      })
      .catch((err) => {
        if (cancelled) return;
        // The patient lookup only supplies defaults — still let the user work.
        setLoadError(errMsg(err) || "Could not load patient details.");
        const stored = loadLocalClaimFillOut(claimId);
        if (stored) {
          setForm(stored.form);
          setSavedAt(stored.saved_at);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [claimId, patientId]);

  // ICD-10 pick list for the four diagnosis pointers. Free text is still
  // accepted, because the library ships unseeded on most tenants.
  const icdQuery = useQuery({
    queryKey: ["/api/v1/icd-codes", "fill-out"],
    queryFn: () =>
      listIcdCodes({ is_active: true, page: 1, size: ICD_PAGE_SIZE, sort: "code", order: "asc" }),
    staleTime: 5 * 60 * 1000,
  });
  const icdCodes = useMemo(() => icdQuery.data?.items ?? [], [icdQuery.data]);

  const patientName = patient
    ? [patient.last_name, patient.first_name].filter(Boolean).join(", ")
    : "-";
  const age = ageFrom(patient?.dob);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // 1. The four boxes the backend really stores live on the patient.
      await updatePatient(patientId, {
        first_visit: form.first_visit || null,
        student_status: form.student_status === "No" ? null : form.student_status,
        school_name: form.student_status === "No" ? null : form.school_name || null,
        assign_benefits: form.assign_benefits,
      });
      // 2. Everything else has no claim column yet (CLM-FO-1…5).
      saveLocalClaimFillOut(claimId, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(errMsg(err) || "Failed to save the fill-out form.");
    } finally {
      setSaving(false);
    }
  };

  const remarksLeft = REMARKS_MAX_LENGTH - form.remarks.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2 flex items-center justify-between rounded-t">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">
            Dental Insurance Fill-out Form
          </h2>
          <div className="flex items-center gap-3">
            {claimNumber && (
              <span className="text-white text-xs font-semibold">Claim {claimNumber}</span>
            )}
            <button
              onClick={onClose}
              className="p-1 text-white hover:bg-white/20 rounded"
              title="Close"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#1F3A5F] animate-spin" strokeWidth={2} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Patient / coverage banner (legacy header strip) */}
            <div className="border-b-2 border-[#E2E8F0] bg-slate-50 px-4 py-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900">{patientName}</div>
                <div className="text-slate-600">
                  {[age && `${age}y`, patient?.gender, fmtDate(patient?.dob)]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="text-slate-600">
                  ID {patient?.chart_no || patient?.id || "-"}
                  {patient?.home_office_name ? ` · ${patient.home_office_name}` : ""}
                </div>
              </div>
              <div className="space-y-0.5 text-slate-600">
                <div>(C) {patient?.cell_phone || "-"}</div>
                <div>(H) {patient?.phone || "-"}</div>
                <div>(W) {patient?.work_phone || "-"}</div>
              </div>
              <div className="space-y-0.5 text-slate-600">
                <div>
                  <span className="text-slate-500">First Visit</span> {fmtDate(patient?.first_visit)}
                  {"  "}
                  <span className="text-slate-500 ml-2">Last Visit</span>{" "}
                  {fmtDate(patient?.last_visit)}
                </div>
                <div>
                  <span className="text-slate-500">Next Recall</span>{" "}
                  {fmtDate(patient?.next_recall)}
                </div>
                <div className="font-semibold text-slate-900">
                  {carrierName && carrierName !== "-" ? carrierName : "No carrier on claim"} · Est
                  Ins {money(estInsurance)} · Billed {money(totalBilled)}
                </div>
              </div>
            </div>

            {loadError && (
              <div className="mx-4 mt-3 rounded border-l-4 border-orange-400 bg-orange-50 px-3 py-2 text-xs text-orange-900">
                {loadError} Patient-backed fields could not be pre-filled.
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Top two columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                <div className="space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_220px] items-center gap-2">
                    <label className={LABEL} htmlFor="fo-first-visit">
                      First Visit Date
                    </label>
                    <input
                      id="fo-first-visit"
                      type="date"
                      value={form.first_visit}
                      onChange={(e) => set("first_visit", e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_220px] items-center gap-2">
                    <label className={LABEL} htmlFor="fo-prior-auth">
                      Prior Authorization Number
                    </label>
                    <input
                      id="fo-prior-auth"
                      type="text"
                      maxLength={40}
                      value={form.prior_authorization_number}
                      onChange={(e) => set("prior_authorization_number", e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.has_other_coverage}
                        onChange={(e) => set("has_other_coverage", e.target.checked)}
                      />
                      Other Dental or Medical coverages?
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.assign_benefits}
                        onChange={(e) => set("assign_benefits", e.target.checked)}
                      />
                      Assign Benefits to Patient
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.signature_on_file}
                      onChange={(e) => set("signature_on_file", e.target.checked)}
                    />
                    Signature on File
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_220px_60px_minmax(0,150px)] items-center gap-2">
                    <label className={LABEL} htmlFor="fo-pot">
                      Place Of Treatment
                    </label>
                    <select
                      id="fo-pot"
                      value={form.place_of_treatment}
                      onChange={(e) => set("place_of_treatment", e.target.value)}
                      className={INPUT}
                    >
                      {PLACE_OF_TREATMENT_OPTIONS.map((o) => (
                        <option key={o.code} value={o.code}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <label className={LABEL} htmlFor="fo-icd-1">
                      ICD 1
                    </label>
                    <input
                      id="fo-icd-1"
                      list="fo-icd-codes"
                      value={form.icd_1}
                      onChange={(e) => set("icd_1", e.target.value)}
                      placeholder="--- None ---"
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_220px_60px_minmax(0,150px)] items-center gap-2">
                    <label className={LABEL} htmlFor="fo-ins-ref">
                      Insurance Ref. #
                    </label>
                    <input
                      id="fo-ins-ref"
                      type="text"
                      maxLength={40}
                      value={form.insurance_reference_number}
                      onChange={(e) => set("insurance_reference_number", e.target.value)}
                      className={INPUT}
                    />
                    <label className={LABEL} htmlFor="fo-icd-2">
                      ICD 2
                    </label>
                    <input
                      id="fo-icd-2"
                      list="fo-icd-codes"
                      value={form.icd_2}
                      onChange={(e) => set("icd_2", e.target.value)}
                      placeholder="--- None ---"
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_220px_60px_minmax(0,150px)] items-center gap-2">
                    <label className={LABEL} htmlFor="fo-student">
                      Student Status
                    </label>
                    <select
                      id="fo-student"
                      value={form.student_status}
                      onChange={(e) => set("student_status", e.target.value)}
                      className={INPUT}
                    >
                      {STUDENT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <label className={LABEL} htmlFor="fo-icd-3">
                      ICD 3
                    </label>
                    <input
                      id="fo-icd-3"
                      list="fo-icd-codes"
                      value={form.icd_3}
                      onChange={(e) => set("icd_3", e.target.value)}
                      placeholder="--- None ---"
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_220px_60px_minmax(0,150px)] items-center gap-2">
                    <label className={LABEL} htmlFor="fo-school">
                      School Name
                    </label>
                    <input
                      id="fo-school"
                      type="text"
                      maxLength={80}
                      value={form.school_name}
                      disabled={form.student_status === "No"}
                      onChange={(e) => set("school_name", e.target.value)}
                      className={INPUT}
                    />
                    <label className={LABEL} htmlFor="fo-icd-4">
                      ICD 4
                    </label>
                    <input
                      id="fo-icd-4"
                      list="fo-icd-codes"
                      value={form.icd_4}
                      onChange={(e) => set("icd_4", e.target.value)}
                      placeholder="--- None ---"
                      className={INPUT}
                    />
                  </div>
                  <datalist id="fo-icd-codes">
                    {icdCodes.map((c) => (
                      <option key={c.id} value={c.icd10 || c.code}>
                        {c.description}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Enclosures + treatment is result of */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border-2 border-[#E2E8F0] rounded">
                  <div className={SECTION_HEAD}>Number of Enclosures (00 to 99)</div>
                  <div className="p-3 space-y-2">
                    {(
                      [
                        ["enclosures_radiographs", "Radiograph(s)"],
                        ["enclosures_oral_images", "Oral Image(s)"],
                        ["enclosures_models", "Model(s)"],
                      ] as [keyof ClaimFillOutForm, string][]
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-2"
                      >
                        <label className={LABEL} htmlFor={`fo-${key}`}>
                          {label}
                        </label>
                        <input
                          id={`fo-${key}`}
                          type="text"
                          inputMode="numeric"
                          value={form[key] as string}
                          onChange={(e) =>
                            set(key, clampEnclosure(e.target.value) as ClaimFillOutForm[typeof key])
                          }
                          className={`${INPUT} text-right`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-2 border-[#E2E8F0] rounded">
                  <div className={SECTION_HEAD}>Treatment is Result Of</div>
                  <div className="p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.is_other_accident}
                          onChange={(e) => set("is_other_accident", e.target.checked)}
                        />
                        Other Accident
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.is_occupational_illness}
                          onChange={(e) => set("is_occupational_illness", e.target.checked)}
                        />
                        Occupational Illness
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.is_auto_accident}
                          onChange={(e) => set("is_auto_accident", e.target.checked)}
                        />
                        Auto Accident
                      </label>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-2">
                      <label className={LABEL} htmlFor="fo-accident-date">
                        Accident Date
                      </label>
                      <input
                        id="fo-accident-date"
                        type="date"
                        value={form.accident_date}
                        onChange={(e) => set("accident_date", e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-2">
                      <label className={LABEL} htmlFor="fo-accident-state">
                        Accident State
                      </label>
                      <select
                        id="fo-accident-state"
                        value={form.accident_state}
                        onChange={(e) => set("accident_state", e.target.value)}
                        className={INPUT}
                      >
                        <option value="">--- None ---</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orthodontics + prosthesis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border-2 border-[#E2E8F0] rounded">
                  <div className={SECTION_HEAD}>
                    <label className="flex items-center gap-2 normal-case">
                      <input
                        type="checkbox"
                        checked={form.is_orthodontic_treatment}
                        onChange={(e) => set("is_orthodontic_treatment", e.target.checked)}
                      />
                      <span className="uppercase">Treatment is for Orthodontics</span>
                    </label>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-2">
                      <label className={LABEL} htmlFor="fo-ortho-date">
                        Date Appliance Placed
                      </label>
                      <input
                        id="fo-ortho-date"
                        type="date"
                        disabled={!form.is_orthodontic_treatment}
                        value={form.ortho_appliance_placed_date}
                        onChange={(e) => set("ortho_appliance_placed_date", e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-2">
                      <label className={LABEL} htmlFor="fo-ortho-months">
                        Months Remaining
                      </label>
                      <input
                        id="fo-ortho-months"
                        type="text"
                        inputMode="numeric"
                        disabled={!form.is_orthodontic_treatment}
                        value={form.ortho_months_remaining}
                        onChange={(e) =>
                          set(
                            "ortho_months_remaining",
                            e.target.value.replace(/\D/g, "").slice(0, 3) || "0",
                          )
                        }
                        className={`${INPUT} text-right`}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-2 border-[#E2E8F0] rounded">
                  <div className={SECTION_HEAD}>
                    <label className="flex items-center gap-2 normal-case">
                      <input
                        type="checkbox"
                        checked={form.is_prosthesis_treatment}
                        onChange={(e) => set("is_prosthesis_treatment", e.target.checked)}
                      />
                      <span className="uppercase">Treatment is for Prosthesis</span>
                    </label>
                  </div>
                  <div className="p-3 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        disabled={!form.is_prosthesis_treatment}
                        checked={form.is_replacement_of_prosthesis}
                        onChange={(e) => set("is_replacement_of_prosthesis", e.target.checked)}
                      />
                      Replacement of Prosthesis
                    </label>
                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-2">
                      <label className={LABEL} htmlFor="fo-prosthesis-date">
                        Date Prior Placement
                      </label>
                      <input
                        id="fo-prosthesis-date"
                        type="date"
                        disabled={!form.is_prosthesis_treatment}
                        value={form.prosthesis_prior_placement_date}
                        onChange={(e) => set("prosthesis_prior_placement_date", e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="border-2 border-[#E2E8F0] rounded">
                <div className={`${SECTION_HEAD} flex items-center justify-between`}>
                  <span>Remarks</span>
                  <button
                    type="button"
                    onClick={() => setShowMacros(true)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide"
                  >
                    <Plus className="w-3 h-3" strokeWidth={2} />
                    Add Notes Macro
                  </button>
                </div>
                <div className="p-3">
                  <textarea
                    value={form.remarks}
                    maxLength={REMARKS_MAX_LENGTH}
                    onChange={(e) => set("remarks", e.target.value)}
                    rows={4}
                    className="w-full px-2 py-1 text-xs border-2 border-slate-300 rounded focus:outline-none focus:border-[#1F3A5F]"
                  />
                  <div className="text-right text-[11px] text-slate-500 pt-1">
                    Characters {form.remarks.length}/{REMARKS_MAX_LENGTH}
                    {remarksLeft === 0 && " (limit reached)"}
                  </div>
                </div>
              </div>

              {/* Persistence reality check */}
              <div className="rounded border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 space-y-0.5">
                <div className="font-semibold">Where these values are stored</div>
                <div>
                  First Visit Date, Student Status, School Name and Assign Benefits are saved to the
                  patient record. The remaining boxes have no column on the claim yet (backend gaps
                  CLM-FO-1…5), so they are kept for this claim in this browser only and are not
                  transmitted with an e-claim.
                </div>
                {savedAt && (
                  <div className="text-amber-800">
                    Last saved {new Date(savedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {saveError && (
                <div className="rounded border-l-4 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {saveError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-[#E2E8F0] px-4 py-2 flex items-center justify-end gap-2 bg-slate-50 rounded-b">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />
            ) : (
              <Save className="w-3 h-3" strokeWidth={2} />
            )}
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-slate-500 text-white hover:bg-slate-600 font-semibold uppercase tracking-wide disabled:opacity-50"
          >
            <X className="w-3 h-3" strokeWidth={2} />
            Cancel
          </button>
        </div>
      </div>

      {showMacros && (
        <NoteMacroPickerModal
          onInsert={(text) =>
            setForm((prev) => {
              const merged = prev.remarks ? `${prev.remarks} ${text}` : text;
              return { ...prev, remarks: merged.slice(0, REMARKS_MAX_LENGTH) };
            })
          }
          onClose={() => setShowMacros(false)}
        />
      )}
    </div>
  );
}

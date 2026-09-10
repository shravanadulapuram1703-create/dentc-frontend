// Quick "New Patient Appointment" form — the lightweight first step of the
// Scheduler's New Patient flow (legacy Denticon parity).
//
// The full Add New Patient wizard is exhaustive; front-desk staff booking a
// walk-in call just need name, birthdate and a phone number. This screen asks
// for that minimum plus the slot details, and offers:
//   • QUICK SAVE — register the patient with these fields and book the
//     appointment immediately.
//   • CONTINUE   — carry the same values into the full Add New Patient wizard
//     and then the complete appointment-details form.
//   • CLOSE      — abandon.
//
// The component is presentational + validation only; the host modal owns the
// form state (so CONTINUE can seed the next screens) and performs the saves.

import { useEffect, useMemo, useState } from "react";
import { X, ChevronRight, Save, Plus, Loader2, ArrowLeft } from "lucide-react";
import type { Operatory, Provider, ProcedureType } from "../../services/schedulerApi";
import { resolveOffice } from "../../services/officeLookup";
import { MIN_DOB_ISO, todayIsoDate, validateDob } from "../../utils/datetime";
import NoteMacroPickerModal from "../patient/NoteMacroPickerModal";
import { providerDisplayLabel } from "@/services/providerDirectory";

/** Form state shared with NewAppointmentModal (it seeds the later screens). */
export interface QuickAppointmentFormData {
  birthdate: string; // YYYY-MM-DD
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber: string;
  phoneType: "Cell" | "Home" | "Work" | string;
  gender: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  duration: number;
  procedureType: string;
  notes: string;
  operatory: string;
  provider: string;
}

interface QuickNewPatientAppointmentProps {
  formData: QuickAppointmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuickAppointmentFormData>>;
  providers: Provider[];
  operatories: Operatory[];
  procedureTypes: ProcedureType[];
  /** Office slot interval (minutes) — drives the Duration choices. */
  slotInterval: number;
  /** Canonical office key ("OFF-1"); resolved to the display name here. */
  currentOffice: string;
  /** Slot the user right-clicked, or null when opened from the toolbar button
   *  (date / time / operatory become editable in that case). */
  selectedSlot: { time: string; operatory: string } | null;
  isSaving: boolean;
  isLoadingMetadata: boolean;
  onQuickSave: () => void;
  onContinue: () => void;
  onBack: () => void;
  onClose: () => void;
}

const DURATION_MAX_MIN = 240;

/** "04 Sep 2026 10:40 AM" from YYYY-MM-DD + HH:MM. */
const formatSlotDateTime = (ymd: string, hhmm: string): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return `${ymd} ${hhmm}`.trim();
  const dt = new Date(y, m - 1, d);
  const datePart = dt.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (!hhmm) return datePart;
  const parts = hhmm.split(":").map(Number);
  const h = parts[0] ?? 0;
  const min = parts[1] ?? 0;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${datePart} ${h12}:${String(min).padStart(2, "0")} ${suffix}`;
};

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** Label | control row. Declared at module level so React keeps the inputs
 *  mounted between renders (an inline component would remount on each key). */
const Row = ({
  label,
  required,
  field,
  errors,
  children,
}: {
  label: string;
  required?: boolean;
  field?: string;
  errors: Record<string, string>;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-[170px_1fr] border-b border-[#E2E8F0] last:border-b-0">
    <div className="bg-[#F1F5F9] px-3 py-2 text-xs font-medium text-[#1E293B] flex items-start pt-2.5">
      {label}
      {required && <span className="text-[#EF4444] ml-0.5">*</span>}
    </div>
    <div className="px-3 py-1.5">
      {children}
      {field && errors[field] && (
        <div className="text-[11px] text-[#DC2626] mt-0.5">{errors[field]}</div>
      )}
    </div>
  </div>
);

/** Required-field validation run before QUICK SAVE. */
const validateQuickForm = (
  f: QuickAppointmentFormData,
  bypassPhone: boolean,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const dobErr = validateDob(f.birthdate);
  if (dobErr) errors.birthdate = dobErr;
  if (!f.lastName.trim()) errors.lastName = "Last name is required";
  if (!f.firstName.trim()) errors.firstName = "First name is required";
  if (!bypassPhone) {
    const digits = digitsOnly(f.phoneNumber);
    if (!digits) errors.phoneNumber = "Phone number is required (or use BYPASS)";
    else if (digits.length < 10) errors.phoneNumber = "Enter a 10-digit phone number";
  }
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (!f.date) errors.date = "Date is required";
  if (!f.time) errors.time = "Time is required";
  if (!f.operatory) errors.operatory = "Operatory is required";
  if (!f.provider) errors.provider = "Provider is required";
  if (!f.procedureType) errors.procedureType = "Prod. Type is required";
  return errors;
};

export default function QuickNewPatientAppointment({
  formData,
  setFormData,
  providers,
  operatories,
  procedureTypes,
  slotInterval,
  currentOffice,
  selectedSlot,
  isSaving,
  isLoadingMetadata,
  onQuickSave,
  onContinue,
  onBack,
  onClose,
}: QuickNewPatientAppointmentProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  // BYPASS (legacy): skip the phone requirement for this booking.
  const [bypass_phone, setBypassPhone] = useState(false);
  const [office_name, setOfficeName] = useState<string>("");
  const [showMacroPicker, setShowMacroPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveOffice(currentOffice)
      .then((o) => {
        if (!cancelled) setOfficeName(o?.name ?? currentOffice);
      })
      .catch(() => {
        if (!cancelled) setOfficeName(currentOffice);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOffice]);

  const step = slotInterval > 0 ? slotInterval : 10;
  const durationOptions = useMemo(() => {
    const opts: number[] = [];
    for (let m = step; m <= DURATION_MAX_MIN; m += step) opts.push(m);
    // Keep whatever the form already holds selectable even if off-grid.
    if (formData.duration > 0 && !opts.includes(formData.duration)) {
      opts.push(formData.duration);
      opts.sort((a, b) => a - b);
    }
    return opts;
  }, [step, formData.duration]);

  const operatoryName =
    operatories.find((o) => o.id === formData.operatory)?.name || formData.operatory;

  const selectedProcType = procedureTypes.find((p) => p.name === formData.procedureType);

  const set = <K extends keyof QuickAppointmentFormData>(
    key: K,
    value: QuickAppointmentFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const runValidation = (): boolean => {
    const next = validateQuickForm(formData, bypass_phone);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      document
        .querySelector<HTMLElement>(`[data-quick-field="${first}"]`)
        ?.focus();
      return false;
    }
    return true;
  };

  const handleQuickSaveClick = () => {
    if (!runValidation()) return;
    onQuickSave();
  };

  const busy = isSaving || isLoadingMetadata;

  const inputClass = (field: string) =>
    `w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]/30 focus:border-[#3A6EA5] ${
      errors[field] ? "border-[#EF4444] bg-red-50" : "border-[#CBD5E1] bg-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto border-2 border-[#E2E8F0] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-new-patient-appt-title"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-3 flex items-center justify-between border-b-2 border-[#162942]">
          <h2 id="quick-new-patient-appt-title" className="font-bold tracking-wide">
            New Patient Appointment
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-[#162942] p-1.5 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Top: Personal info | Slot details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#1F3A5F] mb-2">
                Personal Information
              </h3>
              <div className="border border-[#E2E8F0] rounded overflow-hidden">
                <Row label="Birthdate" required field="birthdate" errors={errors}>
                  <input
                    type="date"
                    data-quick-field="birthdate"
                    value={formData.birthdate}
                    min={MIN_DOB_ISO}
                    max={todayIsoDate()}
                    onChange={(e) => set("birthdate", e.target.value)}
                    className={`${inputClass("birthdate")} max-w-[180px]`}
                  />
                </Row>
                <Row label="Last Name" required field="lastName" errors={errors}>
                  <input
                    type="text"
                    data-quick-field="lastName"
                    value={formData.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    className={inputClass("lastName")}
                    autoFocus
                  />
                </Row>
                <Row label="First Name" required field="firstName" errors={errors}>
                  <input
                    type="text"
                    data-quick-field="firstName"
                    value={formData.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    className={inputClass("firstName")}
                  />
                </Row>
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#1F3A5F] mb-2">
                Selected Appointment Slot Details
              </h3>
              <div className="border border-[#E2E8F0] rounded overflow-hidden">
                <Row label="Date and Time" required={!selectedSlot} field={errors.date ? "date" : "time"} errors={errors}>
                  {selectedSlot ? (
                    <div className="text-sm text-[#1E293B] py-1">
                      {formatSlotDateTime(formData.date, formData.time)}{" "}
                      <span className="text-[#64748B]">{formData.duration} mins.</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        data-quick-field="date"
                        value={formData.date}
                        onChange={(e) => set("date", e.target.value)}
                        className={`${inputClass("date")} max-w-[170px]`}
                      />
                      <input
                        type="time"
                        data-quick-field="time"
                        value={formData.time}
                        step={step * 60}
                        onChange={(e) => set("time", e.target.value)}
                        className={`${inputClass("time")} max-w-[140px]`}
                      />
                    </div>
                  )}
                </Row>
                <Row label="Office" errors={errors}>
                  <div className="text-sm text-[#1E293B] py-1">{office_name || "…"}</div>
                </Row>
                <Row label="Provider" required field="provider" errors={errors}>
                  <select
                    data-quick-field="provider"
                    value={formData.provider}
                    onChange={(e) => set("provider", e.target.value)}
                    className={inputClass("provider")}
                    disabled={isLoadingMetadata}
                  >
                    {providers.length === 0 ? (
                      <option value="">
                        {isLoadingMetadata ? "Loading…" : "No providers available"}
                      </option>
                    ) : (
                      <>
                        {!formData.provider && <option value="">Select provider</option>}
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {providerDisplayLabel(p)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </Row>
                <Row label="Operatory" required={!selectedSlot} field="operatory" errors={errors}>
                  {selectedSlot ? (
                    <div className="text-sm text-[#1E293B] py-1">{operatoryName}</div>
                  ) : (
                    <select
                      data-quick-field="operatory"
                      value={formData.operatory}
                      onChange={(e) => set("operatory", e.target.value)}
                      className={inputClass("operatory")}
                      disabled={isLoadingMetadata}
                    >
                      {!formData.operatory && <option value="">Select operatory</option>}
                      {operatories.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Row>
              </div>
            </section>
          </div>

          {/* Contact + appointment basics */}
          <section className="border border-[#E2E8F0] rounded overflow-hidden">
            <Row label="Email" field="email" errors={errors}>
              <input
                type="email"
                data-quick-field="email"
                value={formData.email}
                onChange={(e) => set("email", e.target.value)}
                className={`${inputClass("email")} max-w-md`}
                placeholder="name@example.com"
              />
            </Row>
            <Row label="Phone Number" required={!bypass_phone} field="phoneNumber" errors={errors}>
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="tel"
                  data-quick-field="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  className={inputClass("phoneNumber")}
                  placeholder="(555) 555-5555"
                  disabled={bypass_phone}
                />
                <button
                  type="button"
                  onClick={() => {
                    setBypassPhone((b) => !b);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.phoneNumber;
                      return next;
                    });
                  }}
                  className={`px-3 py-1 text-[11px] font-bold rounded whitespace-nowrap transition-colors ${
                    bypass_phone
                      ? "bg-[#F59E0B] text-white hover:bg-[#D97706]"
                      : "bg-[#3A6EA5] text-white hover:bg-[#2d5080]"
                  }`}
                  title={
                    bypass_phone
                      ? "Phone requirement bypassed — click to require it again"
                      : "Book without a phone number"
                  }
                  aria-pressed={bypass_phone}
                >
                  {bypass_phone ? "BYPASSED" : "BYPASS"}
                </button>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                {(["Cell", "Home", "Work"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1 text-xs text-[#1E293B] cursor-pointer">
                    <input
                      type="radio"
                      name="quick-phone-type"
                      value={t}
                      checked={formData.phoneType === t}
                      onChange={() => set("phoneType", t)}
                      className="w-3.5 h-3.5 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </Row>
            <Row label="Duration" errors={errors}>
              <select
                value={formData.duration}
                onChange={(e) => set("duration", Number(e.target.value))}
                className={`${inputClass("duration")} max-w-[120px]`}
              >
                {durationOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Prod. Type" required field="procedureType" errors={errors}>
              <div className="flex items-center gap-2">
                <select
                  data-quick-field="procedureType"
                  value={formData.procedureType}
                  onChange={(e) => set("procedureType", e.target.value)}
                  className={`${inputClass("procedureType")} max-w-xs`}
                  disabled={isLoadingMetadata}
                >
                  {procedureTypes.length === 0 ? (
                    <option value="">
                      {isLoadingMetadata ? "Loading…" : "No procedure types"}
                    </option>
                  ) : (
                    <>
                      {!formData.procedureType && <option value="">Select type</option>}
                      {procedureTypes.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <span
                  className="inline-block w-4 h-4 rounded-sm border border-[#CBD5E1]"
                  style={{ backgroundColor: selectedProcType?.color || "#E2E8F0" }}
                  title={
                    selectedProcType?.color
                      ? `Scheduler color for ${selectedProcType.name}`
                      : "No color assigned to this procedure type"
                  }
                  aria-hidden
                />
              </div>
            </Row>
            <Row label="Appt. Notes" errors={errors}>
              <div className="flex items-start gap-3">
                <textarea
                  value={formData.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  className={`${inputClass("notes")} max-w-md resize-y`}
                />
                <button
                  type="button"
                  onClick={() => setShowMacroPicker(true)}
                  className="mt-0.5 inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded bg-[#3A6EA5] text-white hover:bg-[#2d5080] whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" strokeWidth={3} />
                  ADD NOTES MACRO
                </button>
              </div>
            </Row>
            <Row label="Explosion Codes" errors={errors}>
              <select
                disabled
                className="w-full max-w-xs px-2 py-1 text-sm border border-[#E2E8F0] rounded bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed"
                title="Explosion codes are not available yet — add procedures from CONTINUE › Appointment Details"
              >
                <option>*Select Exp. Code*</option>
              </select>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">
                Not available yet. Use CONTINUE to add procedures on the full form.
              </div>
            </Row>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#F1F5F9] border-t-2 border-[#E2E8F0] px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#475569] hover:text-[#1F3A5F] disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            BACK
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickSaveClick}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded bg-[#3A6EA5] text-white hover:bg-[#2d5080] disabled:opacity-60 disabled:cursor-not-allowed"
              title="Register the patient with just these details and book the appointment"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
              {isSaving ? "SAVING…" : "QUICK SAVE"}
            </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={busy}
              className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded bg-[#3A6EA5] text-white hover:bg-[#2d5080] disabled:opacity-60 disabled:cursor-not-allowed"
              title="Enter full patient details, then the complete appointment form"
            >
              CONTINUE
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded bg-[#475569] text-white hover:bg-[#334155] disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" strokeWidth={3} />
              CLOSE
            </button>
          </div>
        </div>
      </div>

      {showMacroPicker && (
        <NoteMacroPickerModal
          onInsert={(text) => {
            set("notes", formData.notes ? `${formData.notes}\n${text}` : text);
            setShowMacroPicker(false);
          }}
          onClose={() => setShowMacroPicker(false)}
        />
      )}
    </div>
  );
}

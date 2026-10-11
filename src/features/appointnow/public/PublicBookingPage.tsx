// PublicBookingPage — the anonymous, embeddable online-booking screen served at
// /book/:office_code. Renders WITHOUT the app shell / global nav (App.tsx keeps
// /book/* out of the authed layout), so it can be pasted into a third-party
// office website (iframe or direct link). Talks only to getBookingTransport().
// The reason catalog comes from the office (backend AN-1) when configured and
// falls back to the built-in APPOINTMENT_REASONS otherwise.
//
// Step 1 asks New vs Existing patient, then the office's operatories (AN-28)
// plus an always-present Emergency choice. A regular operatory only offers the
// open slots of THAT chair; Emergency (AN-29) shows open times as suggestions
// but lets the patient request any time — the office triages it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  Siren,
  Armchair,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { getBookingTransport } from "../bookingService";
import {
  APPOINTMENT_REASONS,
  EMERGENCY_OPERATORY_ID,
  type AppointmentReason,
  type AvailableSlot,
  type BookingContactDetails,
  type BookingRequest,
  type PublicOfficeInfo,
  type PublicOperatory,
} from "../transport/types";
import OfficeHeader from "./OfficeHeader";
import SlotPicker from "./SlotPicker";
import PatientDetailsForm from "./PatientDetailsForm";
import ConfirmationScreen from "./ConfirmationScreen";
import {
  addDaysIso,
  addMinutesHHMM,
  formatDateLong,
  formatTime12,
  nowHHMM,
  todayIso,
  validateContact,
  type ContactErrors,
} from "./bookingUtils";

type Step = "reason" | "slot" | "details" | "review" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "reason", label: "Reason" },
  { key: "slot", label: "Time" },
  { key: "details", label: "Details" },
  { key: "review", label: "Confirm" },
];

const EMPTY_CONTACT: BookingContactDetails = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  date_of_birth: null,
  is_new_patient: true,
  notes: null,
  insurance_info: null,
  disclaimer_accepted: null,
  consent_accepted: null,
  payment_terms_accepted: null,
};

/** Pick a sensible starting date (skip Sunday). */
function initialDate(): string {
  let iso = todayIso();
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  if (new Date(y, m - 1, d).getDay() === 0) iso = addDaysIso(iso, 1);
  return iso;
}

const DEFAULT_REASON = APPOINTMENT_REASONS[0] as AppointmentReason;

/**
 * Stand-in chair when the office serves no operatories (simulation / a backend
 * without AN-28): keeps regular booking possible against "any chair".
 */
const ANY_OPERATORY_ID = "any";

type PatientType = "new" | "existing";

/** The office's reason that best fits an emergency visit, if any. */
function emergencyReason(reasons: AppointmentReason[]): AppointmentReason | null {
  return (
    reasons.find((r) => r.id === "emergency") ??
    reasons.find((r) => /emergenc|pain/i.test(r.label)) ??
    null
  );
}

/** Office-configured reasons when present, else the built-in catalog. */
function reasonsFor(office: PublicOfficeInfo | null): AppointmentReason[] {
  return office?.reasons && office.reasons.length > 0 ? office.reasons : APPOINTMENT_REASONS;
}

function Stepper({ current }: { current: Step }) {
  const activeIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={s.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-[#3A6EA5] text-white"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:inline ${
                  active ? "text-[#3A6EA5]" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-slate-300 sm:w-8" />}
          </div>
        );
      })}
    </div>
  );
}

export default function PublicBookingPage() {
  const { office_code = "" } = useParams();
  const transport = useMemo(() => getBookingTransport(), []);

  const [office, setOffice] = useState<PublicOfficeInfo | null>(null);
  const [loadingOffice, setLoadingOffice] = useState(true);
  const [officeError, setOfficeError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("reason");
  const [patientType, setPatientType] = useState<PatientType | null>(null);
  const [patientTypeError, setPatientTypeError] = useState<string | null>(null);
  const [operatoryId, setOperatoryId] = useState<string | null>(null);
  const [operatoryError, setOperatoryError] = useState<string | null>(null);
  const [reason, setReason] = useState<AppointmentReason>(DEFAULT_REASON);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(initialDate);

  const reasons = useMemo(() => reasonsFor(office), [office]);
  const operatories = useMemo<PublicOperatory[]>(
    () =>
      office?.operatories && office.operatories.length > 0
        ? office.operatories
        : [{ id: ANY_OPERATORY_ID, name: "Any available operatory" }],
    [office],
  );
  const isEmergency = operatoryId === EMERGENCY_OPERATORY_ID;
  const selectedOperatory = operatories.find((o) => o.id === operatoryId) ?? null;
  /** Operatory filter for availability: none for Emergency / "any chair". */
  const availabilityOperatoryId =
    operatoryId && operatoryId !== EMERGENCY_OPERATORY_ID && operatoryId !== ANY_OPERATORY_ID
      ? operatoryId
      : null;
  const operatoryLabel = isEmergency ? "Emergency" : (selectedOperatory?.name ?? "");

  // Emergency: a patient-chosen time (not required to be an open slot).
  const [customTime, setCustomTime] = useState("");
  const [customTimeError, setCustomTimeError] = useState<string | null>(null);

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [contact, setContact] = useState<BookingContactDetails>(EMPTY_CONTACT);
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingRequest | null>(null);

  // Load office info once.
  useEffect(() => {
    let cancelled = false;
    setLoadingOffice(true);
    setOfficeError(null);
    transport
      .getOfficeInfo(office_code)
      .then((info) => {
        if (cancelled) return;
        setOffice(info);
        // Default to the office's first configured reason (ids differ per office).
        const first = reasonsFor(info)[0];
        if (first) setReason(first);
        document.title = `Book — ${info.name}`;
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const notFound =
          typeof e === "object" && e !== null && "status" in e && (e as { status?: number }).status === 404;
        setOfficeError(
          notFound
            ? "This office is not available for online booking."
            : "We couldn't load this office's booking page.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingOffice(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transport, office_code]);

  // Fetch availability whenever we're on the slot step and the query changes.
  useEffect(() => {
    if (step !== "slot" || !office) return;
    let cancelled = false;
    setLoadingSlots(true);
    transport
      .getAvailability({
        office_code: office.office_code,
        date,
        provider_id: providerId,
        operatory_id: availabilityOperatoryId,
        duration_minutes: reason.duration_minutes,
      })
      .then((res) => {
        if (!cancelled) setSlots(res);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transport, office, step, date, providerId, availabilityOperatoryId, reason.duration_minutes]);

  const handleSelectSlot = useCallback((slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep("details");
  }, []);

  const handleDetailsContinue = () => {
    const errs = validateContact(contact);
    setContactErrors(errs);
    if (Object.keys(errs).length === 0) setStep("review");
  };

  const handleFindTime = () => {
    let ok = true;
    if (!patientType) {
      setPatientTypeError("Please tell us whether you are a new or existing patient.");
      ok = false;
    }
    if (!operatoryId) {
      setOperatoryError("Please choose an operatory, or Emergency.");
      ok = false;
    }
    // Some reasons must be booked with a specific provider (backend `requires_provider`).
    // An emergency is triaged by the office, so it never requires one.
    if (
      !isEmergency &&
      reason.requires_provider &&
      !providerId &&
      office &&
      office.providers.length > 0
    ) {
      setProviderError("Please choose a provider for this type of visit.");
      ok = false;
    } else {
      setProviderError(null);
    }
    if (!ok) return;
    setSelectedSlot(null);
    setCustomTime("");
    setCustomTimeError(null);
    setStep("slot");
  };

  const choosePatientType = (t: PatientType) => {
    setPatientType(t);
    setPatientTypeError(null);
    setContact((c) => ({ ...c, is_new_patient: t === "new" }));
  };

  const chooseOperatory = (id: string) => {
    setOperatoryId(id);
    setOperatoryError(null);
    if (id === EMERGENCY_OPERATORY_ID) {
      const er = emergencyReason(reasons);
      if (er) setReason(er);
      setProviderError(null);
    }
  };

  /** Emergency: request the typed time even if it is not an open slot. */
  const handleRequestCustomTime = () => {
    if (!customTime) {
      setCustomTimeError("Choose a time.");
      return;
    }
    if (date === todayIso() && customTime <= nowHHMM()) {
      setCustomTimeError("That time has already passed today.");
      return;
    }
    const end = addMinutesHHMM(customTime, reason.duration_minutes);
    if (!end) {
      setCustomTimeError("Please choose an earlier time.");
      return;
    }
    setCustomTimeError(null);
    handleSelectSlot({
      date,
      start_time: customTime,
      end_time: end,
      duration_minutes: reason.duration_minutes,
      provider_id: null,
      provider_name: null,
      operatory_id: null,
      operatory_name: null,
    });
  };

  const handleSubmit = async () => {
    if (!office || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const req = await transport.submitRequest({
        office_code: office.office_code,
        reason_id: reason.id,
        reason_label: reason.label,
        // Emergency rides with no chair (the office assigns one on approve).
        slot: isEmergency ? { ...selectedSlot, operatory_id: null, operatory_name: null } : selectedSlot,
        contact,
        is_emergency: isEmergency,
      });
      setConfirmation(req);
      setStep("done");
    } catch (e) {
      // The backend answers with a human message ("That time was just taken…",
      // rate-limited, human verification…) — show it rather than a generic one.
      setSubmitError(
        e instanceof Error && e.message
          ? e.message
          : "Could not submit your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep("reason");
    setPatientType(null);
    setPatientTypeError(null);
    setOperatoryId(null);
    setOperatoryError(null);
    setCustomTime("");
    setCustomTimeError(null);
    setProviderError(null);
    setSelectedSlot(null);
    setContact(EMPTY_CONTACT);
    setContactErrors({});
    setConfirmation(null);
    setSubmitError(null);
    setDate(initialDate());
  };

  // --- Render states -------------------------------------------------------
  if (loadingOffice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (officeError || !office) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-800">Booking unavailable</p>
          <p className="mt-1 text-sm text-slate-500">
            {officeError ?? "This office is not available for online booking."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <OfficeHeader office={office} />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
          {step !== "done" && (
            <div className="mb-6">
              <Stepper current={step} />
            </div>
          )}

          {/* STEP: Reason */}
          {step === "reason" && (
            <section>
              <h2 className="text-lg font-bold text-slate-900">
                Are you a new or existing patient?
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {(
                  [
                    { key: "new", label: "New patient", icon: UserPlus },
                    { key: "existing", label: "Existing patient", icon: UserCheck },
                  ] as const
                ).map(({ key, label, icon: Icon }) => {
                  const active = patientType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => choosePatientType(key)}
                      aria-pressed={active}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                        active
                          ? "border-[#3A6EA5] bg-[#3A6EA5]/5 text-[#3A6EA5] ring-1 ring-[#3A6EA5]"
                          : patientTypeError
                            ? "border-red-300 text-slate-700"
                            : "border-slate-200 text-slate-700 hover:border-[#3A6EA5]/60"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
              {patientTypeError && (
                <p className="mt-1 text-xs text-red-600">{patientTypeError}</p>
              )}

              <h2 className="mt-6 text-lg font-bold text-slate-900">Choose an operatory</h2>
              <p className="mt-1 text-sm text-slate-500">
                We'll only show times that chair is free. In pain or need urgent care? Choose
                Emergency.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {operatories.map((o) => {
                  const active = o.id === operatoryId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => chooseOperatory(o.id)}
                      aria-pressed={active}
                      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-[#3A6EA5] bg-[#3A6EA5]/5 ring-1 ring-[#3A6EA5]"
                          : operatoryError
                            ? "border-red-300"
                            : "border-slate-200 hover:border-[#3A6EA5]/60"
                      }`}
                    >
                      <Armchair className="h-4 w-4 shrink-0 text-[#3A6EA5]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {o.name}
                        </span>
                        {o.provider_name && (
                          <span className="block truncate text-xs text-slate-500">
                            {o.provider_name}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => chooseOperatory(EMERGENCY_OPERATORY_ID)}
                  aria-pressed={isEmergency}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-colors ${
                    isEmergency
                      ? "border-red-500 bg-red-50 ring-1 ring-red-500"
                      : "border-red-200 bg-red-50/40 hover:border-red-400"
                  }`}
                >
                  <Siren className="h-4 w-4 shrink-0 text-red-600" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-red-700">Emergency</span>
                    <span className="block text-xs text-red-600/80">Request any time</span>
                  </span>
                </button>
              </div>
              {operatoryError && (
                <p className="mt-1 text-xs text-red-600">{operatoryError}</p>
              )}

              <h2 className="mt-6 text-lg font-bold text-slate-900">
                What brings you in?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a reason so we can reserve enough time.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {reasons.map((r) => {
                  const active = r.id === reason.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setReason(r);
                        setProviderError(null);
                      }}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-[#3A6EA5] bg-[#3A6EA5]/5 ring-1 ring-[#3A6EA5]"
                          : "border-slate-200 hover:border-[#3A6EA5]/60"
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {r.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {r.duration_minutes} min
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Provider
                </label>
                {office.providers.length > 0 ? (
                  <select
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 ${
                      providerError ? "border-red-400" : "border-slate-300"
                    }`}
                    value={providerId ?? ""}
                    onChange={(e) => {
                      setProviderId(e.target.value || null);
                      setProviderError(null);
                    }}
                    aria-invalid={providerError ? true : undefined}
                  >
                    <option value="">
                      {reason.requires_provider ? "Choose a provider…" : "Any available provider"}
                    </option>
                    {office.providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title ? `${p.title} ` : ""}
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-500">
                    You'll be seen by the next available provider.
                  </p>
                )}
                {providerError && (
                  <p className="mt-1 text-xs text-red-600">{providerError}</p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleFindTime}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A6EA5] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2C5282]"
                >
                  Find a time <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {/* STEP: Slot */}
          {step === "slot" && (
            <section>
              <h2 className="text-lg font-bold text-slate-900">Pick a time</h2>
              <p className="mt-1 text-sm text-slate-500">
                {reason.label} · {reason.duration_minutes} min · {operatoryLabel}
              </p>
              {isEmergency && (
                <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  <Siren className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Emergency request — these are the times open right now, but you can ask
                    for any time below. The office will call you to confirm as soon as
                    possible.
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                <button
                  type="button"
                  onClick={() => setDate((d) => addDaysIso(d, -1))}
                  disabled={date <= todayIso()}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-white disabled:opacity-30"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CalendarDays className="h-4 w-4 text-[#3A6EA5]" />
                  {formatDateLong(date)}
                </div>
                <button
                  type="button"
                  onClick={() => setDate((d) => addDaysIso(d, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-white"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5">
                <SlotPicker
                  slots={slots}
                  loading={loadingSlots}
                  selectedStart={selectedSlot?.start_time ?? null}
                  onSelect={handleSelectSlot}
                  emptyMessage={
                    isEmergency
                      ? "No open times on this day — you can still request a time below."
                      : undefined
                  }
                />
              </div>

              {isEmergency && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label
                    htmlFor="emergency-time"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Or request a specific time
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id="emergency-time"
                      type="time"
                      value={customTime}
                      onChange={(e) => {
                        setCustomTime(e.target.value);
                        setCustomTimeError(null);
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 ${
                        customTimeError ? "border-red-400" : "border-slate-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleRequestCustomTime}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Request this time <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  {customTimeError && (
                    <p className="mt-1 text-xs text-red-600">{customTimeError}</p>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep("reason")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
            </section>
          )}

          {/* STEP: Details */}
          {step === "details" && selectedSlot && (
            <section>
              <h2 className="text-lg font-bold text-slate-900">Your details</h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatDateLong(selectedSlot.date)} at{" "}
                {formatTime12(selectedSlot.start_time)} · {reason.label} · {operatoryLabel}
              </p>
              <div className="mt-5">
                <PatientDetailsForm
                  value={contact}
                  errors={contactErrors}
                  onChange={(patch) => setContact((c) => ({ ...c, ...patch }))}
                />
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep("slot")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleDetailsContinue}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A6EA5] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2C5282]"
                >
                  Review <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {/* STEP: Review */}
          {step === "review" && selectedSlot && (
            <section>
              <h2 className="text-lg font-bold text-slate-900">Review & confirm</h2>
              <p className="mt-1 text-sm text-slate-500">
                Please check your details before sending the request.
              </p>

              <dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {[
                  ["Office", office.name],
                  ["Patient", contact.is_new_patient ? "New patient" : "Existing patient"],
                  [
                    "Operatory",
                    isEmergency ? "Emergency — the office will call you" : operatoryLabel,
                  ],
                  ["Reason", `${reason.label} (${reason.duration_minutes} min)`],
                  [
                    isEmergency ? "Requested time" : "When",
                    `${formatDateLong(selectedSlot.date)} at ${formatTime12(selectedSlot.start_time)}`,
                  ],
                  ["Name", `${contact.first_name} ${contact.last_name}`.trim()],
                  ["Phone", contact.phone],
                  ["Email", contact.email],
                  contact.date_of_birth ? ["Date of birth", contact.date_of_birth] : null,
                  contact.insurance_info?.trim()
                    ? ["Insurance provider & member ID", contact.insurance_info.trim()]
                    : null,
                  ["Disclaimer", contact.disclaimer_accepted ? "Yes" : "No"],
                  ["Consent", contact.consent_accepted ? "Yes" : "No"],
                  ["Payment terms", contact.payment_terms_accepted ? "Yes" : "No"],
                ]
                  .filter(Boolean)
                  .map((row) => {
                    const [k, v] = row as [string, string];
                    return (
                      <div
                        key={k}
                        className="flex justify-between gap-4 px-4 py-2.5 text-sm"
                      >
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="text-right font-semibold text-slate-800">{v}</dd>
                      </div>
                    );
                  })}
              </dl>

              {submitError && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </p>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send request
                </button>
              </div>
            </section>
          )}

          {/* STEP: Done */}
          {step === "done" && confirmation && (
            <ConfirmationScreen
              request={confirmation}
              office={office}
              onBookAnother={resetFlow}
            />
          )}
        </div>

        {office.is_simulated && (
          <p className="mx-auto mt-4 max-w-xl text-center text-xs text-slate-400">
            Demo mode — this booking page is a client-side simulation. Requests are
            visible to staff in the app but no live appointment is created until the
            practice connects the AppointNow backend.
          </p>
        )}
      </main>
    </div>
  );
}

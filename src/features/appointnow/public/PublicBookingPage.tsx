// PublicBookingPage — the anonymous, embeddable online-booking screen served at
// /book/:office_code. Renders WITHOUT the app shell / global nav (App.tsx keeps
// /book/* out of the authed layout), so it can be pasted into a third-party
// office website (iframe or direct link). Talks only to getBookingTransport().

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
} from "lucide-react";
import { getBookingTransport } from "../bookingService";
import {
  APPOINTMENT_REASONS,
  type AppointmentReason,
  type AvailableSlot,
  type BookingContactDetails,
  type BookingRequest,
  type PublicOfficeInfo,
} from "../transport/types";
import OfficeHeader from "./OfficeHeader";
import SlotPicker from "./SlotPicker";
import PatientDetailsForm from "./PatientDetailsForm";
import ConfirmationScreen from "./ConfirmationScreen";
import {
  addDaysIso,
  formatDateLong,
  formatTime12,
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
  const [reason, setReason] = useState<AppointmentReason>(DEFAULT_REASON);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(initialDate);

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
        document.title = `Book — ${info.name}`;
      })
      .catch(() => {
        if (!cancelled) setOfficeError("We couldn't load this office's booking page.");
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
  }, [transport, office, step, date, providerId, reason.duration_minutes]);

  const handleSelectSlot = useCallback((slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep("details");
  }, []);

  const handleDetailsContinue = () => {
    const errs = validateContact(contact);
    setContactErrors(errs);
    if (Object.keys(errs).length === 0) setStep("review");
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
        slot: selectedSlot,
        contact,
      });
      setConfirmation(req);
      setStep("done");
    } catch {
      setSubmitError("Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep("reason");
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
                What brings you in?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a reason so we can reserve enough time.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {APPOINTMENT_REASONS.map((r) => {
                  const active = r.id === reason.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setReason(r)}
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    value={providerId ?? ""}
                    onChange={(e) => setProviderId(e.target.value || null)}
                  >
                    <option value="">Any available provider</option>
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
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep("slot")}
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
                {reason.label} · {reason.duration_minutes} min
              </p>

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
                />
              </div>

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
                {formatTime12(selectedSlot.start_time)} · {reason.label}
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
                  ["Reason", `${reason.label} (${reason.duration_minutes} min)`],
                  [
                    "When",
                    `${formatDateLong(selectedSlot.date)} at ${formatTime12(selectedSlot.start_time)}`,
                  ],
                  ["Name", `${contact.first_name} ${contact.last_name}`.trim()],
                  ["Phone", contact.phone],
                  ["Email", contact.email],
                  contact.date_of_birth ? ["Date of birth", contact.date_of_birth] : null,
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

import {
  BOOKING_CONSENT_TEXT,
  BOOKING_DISCLAIMER_TEXT,
  type BookingContactDetails,
} from "../transport/types";
import type { ContactErrors } from "./bookingUtils";

interface PatientDetailsFormProps {
  value: BookingContactDetails;
  errors: ContactErrors;
  onChange: (patch: Partial<BookingContactDetails>) => void;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

/** A mandatory Yes/No acknowledgement with its explanatory text underneath. */
function YesNoAcknowledgement({
  name,
  label,
  text,
  value,
  error,
  onChange,
}: {
  name: string;
  label: string;
  text: string;
  value: boolean | null;
  error?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
        <span className="text-red-500"> *</span>
      </legend>
      <div className="flex flex-col gap-1.5">
        {[
          { v: true, l: "Yes" },
          { v: false, l: "No" },
        ].map((opt) => (
          <label
            key={opt.l}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
          >
            <input
              type="radio"
              name={name}
              className="h-4 w-4 border-slate-300 text-[#3A6EA5] focus:ring-[#3A6EA5]"
              checked={value === opt.v}
              onChange={() => onChange(opt.v)}
            />
            {opt.l}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </fieldset>
  );
}

/** The basic-details form captured on the public page. */
export default function PatientDetailsForm({
  value,
  errors,
  onChange,
}: PatientDetailsFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required error={errors.first_name}>
          <input
            className={inputCls}
            value={value.first_name}
            onChange={(e) => onChange({ first_name: e.target.value })}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" required error={errors.last_name}>
          <input
            className={inputCls}
            value={value.last_name}
            onChange={(e) => onChange({ last_name: e.target.value })}
            autoComplete="family-name"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone" required error={errors.phone}>
          <input
            className={inputCls}
            value={value.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 123-4567"
          />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input
            className={inputCls}
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date of birth">
          <input
            type="date"
            className={inputCls}
            value={value.date_of_birth ?? ""}
            onChange={(e) => onChange({ date_of_birth: e.target.value || null })}
            autoComplete="bday"
          />
        </Field>
        <div className="flex items-end">
          <label className="inline-flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-[#3A6EA5] focus:ring-[#3A6EA5]"
              checked={value.is_new_patient}
              onChange={(e) => onChange({ is_new_patient: e.target.checked })}
            />
            I'm a new patient
          </label>
        </div>
      </div>

      <Field label="Anything we should know? (optional)">
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          value={value.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value || null })}
          placeholder="Reason for visit, symptoms, etc."
        />
      </Field>

      <Field label="Name of Dental Insurance Provider & Member ID number">
        <input
          className={inputCls}
          value={value.insurance_info ?? ""}
          onChange={(e) => onChange({ insurance_info: e.target.value || null })}
          placeholder="e.g. Delta Dental — Member ID 123456789"
        />
      </Field>

      <YesNoAcknowledgement
        name="disclaimer_accepted"
        label="Disclaimer"
        text={BOOKING_DISCLAIMER_TEXT}
        value={value.disclaimer_accepted}
        error={errors.disclaimer_accepted}
        onChange={(v) => onChange({ disclaimer_accepted: v })}
      />

      <YesNoAcknowledgement
        name="consent_accepted"
        label="Consent"
        text={BOOKING_CONSENT_TEXT}
        value={value.consent_accepted}
        error={errors.consent_accepted}
        onChange={(v) => onChange({ consent_accepted: v })}
      />
    </div>
  );
}

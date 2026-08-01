import type { BookingContactDetails } from "../transport/types";
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
          placeholder="Reason for visit, symptoms, insurance, etc."
        />
      </Field>
    </div>
  );
}

// Shared presentational primitives for the patient-insurance screens.
import type { ReactNode } from "react";

export const INPUT_CLS =
  "w-full px-2.5 py-1.5 border-2 border-[#E2E8F0] rounded-md text-sm bg-white focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 disabled:bg-[#F1F5F9] disabled:text-[#64748B]";

/** A read-only value box used for plan-derived (non-editable) fields. */
export function ReadOnlyBox({ value }: { value?: string | null }) {
  return (
    <div className="w-full px-2.5 py-1.5 border-2 border-[#E2E8F0] rounded-md text-sm bg-[#F1F5F9] text-[#475569] min-h-[34px]">
      {value || " "}
    </div>
  );
}

/** Blue uppercase section heading, matching the legacy Denticon table headers. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[13px] font-bold text-[#1F6FB2] uppercase tracking-wide mb-2">{children}</h3>
  );
}

/** Label + control stacked or inline. */
export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-[#475569] mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/** A money input with a leading $ sign. */
export function MoneyInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${INPUT_CLS} pl-5`}
        placeholder="0.00"
      />
    </div>
  );
}

/** A read-only money box (plan-level benefit values). */
export function MoneyRO({ value }: { value?: string | null }) {
  const v = value && value !== "" ? `$${value}` : "";
  return <ReadOnlyBox value={v} />;
}

import type { ReactNode } from "react";
import { Info } from "lucide-react";

/** Section card used across the wizard steps (matches the Step-1 form styling). */
export function StepSection({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 border-b border-[#E2E8F0] pb-2">
        <h3 className="font-semibold text-[#1F3A5F] text-sm tracking-wide">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Amber notice used to flag steps whose data is not yet persisted (backend gap). */
export function GapNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-[#FEF9E7] border border-[#F59E0B] rounded-lg p-3 mb-3">
      <Info className="w-4 h-4 text-[#B45309] mt-0.5 shrink-0" />
      <p className="text-xs text-[#92400E]">{children}</p>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100";

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[#1E293B] font-normal mb-1 text-sm">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[#1E293B] font-normal mb-1 text-sm">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// The alert / questionnaire answer control lives in
// `@/components/ui/TriStateToggle` so this wizard and the Patient Medical
// History screen share one implementation. The two-state Yes/No toggle that
// used to live here could not express legacy's third state (NOT ANSWERED), so
// a mis-click on a wizard row could not be undone without clearing the whole
// step — and the two screens disagreed about what a blank answer meant.

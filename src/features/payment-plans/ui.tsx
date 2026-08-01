// Shared presentation primitives for the Ortho / Regular payment-plan screens.
//
// The legacy screens are dense label-cell + control-cell tables inside titled
// blocks. These primitives reproduce that structure with the app's existing
// design tokens (#1F3A5F navy, #3A6EA5 blue, #E2E8F0 borders) so the screens
// read as part of this app rather than a transplant.

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export const INPUT_CLS =
  "w-full px-2 py-1 border-2 border-[#E2E8F0] rounded text-[13px] bg-white text-[#1E293B] " +
  "focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 " +
  "disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed";

/** Titled block: blue uppercase heading with an optional right-hand action. */
export function Block({
  title,
  actions,
  children,
  className = "",
  enabled_toggle,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Renders the legacy "START … PAYMENT PLAN" checkbox in front of the title. */
  enabled_toggle?: { checked: boolean; on_change: (v: boolean) => void; label?: string };
}) {
  return (
    <section className={`bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm ${className}`}>
      <header className="flex items-center justify-between gap-2 px-3 py-1.5 border-b-2 border-[#E2E8F0] bg-[#F8FAFC] rounded-t-md flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {enabled_toggle && (
            <input
              type="checkbox"
              checked={enabled_toggle.checked}
              onChange={(e) => enabled_toggle.on_change(e.target.checked)}
              aria-label={enabled_toggle.label ?? String(title)}
              className="w-3.5 h-3.5 accent-[#3A6EA5] shrink-0"
            />
          )}
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-[#1F6FB2] truncate">
            {title}
          </h2>
        </div>
        {actions ? <div className="flex items-center gap-1.5 flex-wrap">{actions}</div> : null}
      </header>
      <div className="p-2.5">{children}</div>
    </section>
  );
}

/**
 * One legacy row: a shaded label cell and a control cell. `span` makes the row
 * take the full width of a two-column grid.
 */
export function Row({
  label,
  required,
  children,
  hint,
  error,
  not_saved,
  className = "",
}: {
  label: ReactNode;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  error?: string;
  /** Marks a field the backend has no column for (see the gap report). */
  not_saved?: string;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(120px,44%)_1fr] items-center gap-2 border-b border-[#E2E8F0] last:border-b-0 ${className}`}
    >
      <div className="px-2 py-1.5 bg-[#F8FAFC] text-[12px] font-medium text-[#475569] flex items-center gap-1 h-full">
        <span className="leading-tight">{label}</span>
        {required && <span className="text-[#DC2626]">*</span>}
        {not_saved && <NotSavedBadge gap={not_saved} />}
      </div>
      <div className="px-2 py-1">
        {children}
        {hint && <p className="mt-0.5 text-[10px] text-[#94A3B8] leading-tight">{hint}</p>}
        {error && <p className="mt-0.5 text-[10px] font-semibold text-[#DC2626] leading-tight">{error}</p>}
      </div>
    </div>
  );
}

/** Small amber marker on fields the backend cannot persist yet. */
export function NotSavedBadge({ gap }: { gap: string }) {
  return (
    <span
      title={`Not saved — no backend column. Gap ${gap} in docs/payment-plans/payment_plans_backend_devreport.md`}
      className="inline-flex items-center gap-0.5 px-1 rounded bg-[#FEF3C7] text-[#92400E] text-[9px] font-bold uppercase tracking-wide shrink-0"
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      {gap}
    </span>
  );
}

/** Read-only value box (legacy renders derived fields as greyed inputs). */
export function ReadOnly({
  value,
  mono = true,
  align = "right",
}: {
  value?: ReactNode;
  mono?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`w-full px-2 py-1 border-2 border-[#E2E8F0] rounded text-[13px] bg-[#F1F5F9] text-[#475569] min-h-[28px] ${
        mono ? "font-mono" : ""
      } ${align === "right" ? "text-right" : ""}`}
    >
      {value === "" || value == null ? " " : value}
    </div>
  );
}

/** Money input with a leading $ and right-aligned digits. */
export function MoneyInput({
  value,
  on_change,
  on_blur,
  disabled,
  invalid,
}: {
  value: string;
  on_change?: (v: string) => void;
  on_blur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-[#94A3B8] pointer-events-none">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => on_change?.(e.target.value)}
        onBlur={on_blur}
        placeholder="0.00"
        className={`${INPUT_CLS} pl-5 text-right font-mono ${invalid ? "border-[#DC2626]" : ""}`}
      />
    </div>
  );
}

/** Percent input with a trailing %. */
export function PercentInput({
  value,
  on_change,
  on_blur,
  disabled,
  invalid,
}: {
  value: string;
  on_change?: (v: string) => void;
  on_blur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => on_change?.(e.target.value)}
        onBlur={on_blur}
        placeholder="0.00"
        className={`${INPUT_CLS} pr-6 text-right font-mono ${invalid ? "border-[#DC2626]" : ""}`}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#94A3B8] pointer-events-none">
        %
      </span>
    </div>
  );
}

export function NumberInput({
  value,
  on_change,
  on_blur,
  disabled,
  invalid,
  placeholder,
}: {
  value: string;
  on_change?: (v: string) => void;
  on_blur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => on_change?.(e.target.value.replace(/[^\d]/g, ""))}
      onBlur={on_blur}
      className={`${INPUT_CLS} text-right font-mono ${invalid ? "border-[#DC2626]" : ""}`}
    />
  );
}

export function DateInput({
  value,
  on_change,
  disabled,
  invalid,
}: {
  value: string;
  on_change?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      type="date"
      value={value}
      disabled={disabled}
      onChange={(e) => on_change?.(e.target.value)}
      className={`${INPUT_CLS} ${invalid ? "border-[#DC2626]" : ""}`}
    />
  );
}

export function TextInput({
  value,
  on_change,
  disabled,
  placeholder,
  invalid,
  maxLength,
}: {
  value: string;
  on_change?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => on_change?.(e.target.value)}
      className={`${INPUT_CLS} ${invalid ? "border-[#DC2626]" : ""}`}
    />
  );
}

export function Select({
  value,
  on_change,
  disabled,
  invalid,
  children,
}: {
  value: string;
  on_change?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => on_change?.(e.target.value)}
      className={`${INPUT_CLS} ${invalid ? "border-[#DC2626]" : ""}`}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  checked,
  on_change,
  label,
  disabled,
}: {
  checked: boolean;
  on_change?: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-[12px] text-[#475569] ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => on_change?.(e.target.checked)}
        className="w-3.5 h-3.5 accent-[#3A6EA5]"
      />
      {label}
    </label>
  );
}

/** Legacy grey toolbar button. */
export function PlanButton({
  children,
  on_click,
  disabled,
  title,
  tone = "grey",
  type = "button",
}: {
  children: ReactNode;
  on_click?: () => void;
  disabled?: boolean;
  title?: string;
  tone?: "grey" | "primary" | "danger" | "dark";
  type?: "button" | "submit";
}) {
  const tones: Record<string, string> = {
    grey: "bg-white text-[#1F3A5F] border-[#CBD5E1] hover:bg-[#F1F5F9]",
    primary: "bg-[#3A6EA5] text-white border-[#3A6EA5] hover:bg-[#1F3A5F]",
    dark: "bg-[#1F3A5F] text-white border-[#1F3A5F] hover:bg-[#16314d]",
    danger: "bg-white text-[#B91C1C] border-[#FCA5A5] hover:bg-[#FEF2F2]",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={on_click}
      disabled={disabled}
      className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1 border-2 transition-colors whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/** Notes textarea with the legacy "INSERT TIME STAMP" affordance. */
export function NotesBox({
  value,
  on_change,
  on_stamp,
  disabled,
  title = "Notes",
  not_saved,
  rows = 4,
}: {
  value: string;
  on_change?: (v: string) => void;
  on_stamp?: () => void;
  disabled?: boolean;
  title?: string;
  not_saved?: string;
  rows?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#475569] flex items-center gap-1">
          {title}
          {not_saved && <NotSavedBadge gap={not_saved} />}
        </span>
        <PlanButton on_click={on_stamp} disabled={disabled}>
          Insert Time Stamp
        </PlanButton>
      </div>
      <textarea
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(e) => on_change?.(e.target.value)}
        className={`${INPUT_CLS} resize-y leading-snug`}
      />
    </div>
  );
}

/**
 * Sticky bottom action bar (legacy footer). Callers must leave room for it —
 * the page content above carries `pb-14` so nothing hides behind the bar.
 */
export function FooterBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-3 px-3 py-2 bg-[#F1F5F9] border-2 border-[#E2E8F0] rounded-md shadow-[0_-2px_6px_rgba(15,23,42,0.06)] flex items-center justify-end gap-2 flex-wrap print:hidden">
      {children}
    </div>
  );
}

/** Amber advisory strip used for the PCI / not-persisted notices. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded border-2 border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1.5 text-[11px] leading-snug text-[#92400E]">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

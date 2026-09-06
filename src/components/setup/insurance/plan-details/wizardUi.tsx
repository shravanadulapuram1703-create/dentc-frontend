// Presentational primitives shared by the INSURANCE DETAILS wizard steps —
// styled after the legacy dialog (blue header bands, striped label/value rows).
import type { ReactNode } from "react";

export const WZ_INPUT =
  "w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded text-[13px] bg-white focus:outline-none focus:border-[#1F6FB2] focus:ring-2 focus:ring-[#1F6FB2]/20 disabled:bg-[#F1F5F9] disabled:text-[#64748B]";

export const WZ_INPUT_SM =
  "w-full px-2 py-1 border border-[#CBD5E1] rounded text-[12px] bg-white text-right focus:outline-none focus:border-[#1F6FB2] disabled:bg-[#F1F5F9] disabled:text-[#64748B]";

export const WZ_BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded bg-[#1F6FB2] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#16406e] disabled:opacity-50";

export const WZ_BTN_DARK =
  "inline-flex items-center gap-1.5 rounded bg-[#0f2f52] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-black/40 disabled:opacity-50";

export const WZ_BTN_SECONDARY =
  "inline-flex items-center gap-1.5 rounded border border-[#CBD5E1] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-50";

/** One striped label / value row of the PLAN tab. */
export function FormRow({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 border-b border-[#E2E8F0] last:border-b-0 md:grid-cols-[340px_1fr]">
      <div className="flex items-center gap-1 bg-[#F7F9FC] px-3 py-2 text-[12px] font-semibold text-[#1F3A5F] md:border-r md:border-[#E2E8F0]">
        <span>
          {label}
          {required && <span className="text-[#DC2626]">*</span>}
        </span>
        {help && (
          <span
            title={help}
            className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full bg-[#1F6FB2] text-[9px] font-bold text-white"
          >
            i
          </span>
        )}
      </div>
      <div className="px-3 py-1.5">{children}</div>
    </div>
  );
}

/** Blue band heading (BENEFITS boxes, grids). */
export function BandHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1F6FB2] px-3 py-1.5 text-center text-[12px] font-bold text-white ${className}`}>{children}</div>
  );
}

/** Small "$" money input used on the BENEFITS tab. */
export function WzMoney({
  value,
  onChange,
  disabled,
  align = "right",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-[#64748B]">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0.00"
        className={`${WZ_INPUT} pl-5 ${align === "right" ? "text-right" : ""}`}
      />
    </div>
  );
}

/** Legacy-style disclaimer line under a section. */
export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <p
      className={`rounded px-3 py-1.5 text-[11px] ${
        tone === "warn" ? "border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]" : "border border-[#BFDBFE] bg-[#EFF6FF] text-[#1F3A5F]"
      }`}
    >
      {children}
    </p>
  );
}

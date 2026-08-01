// Small shared modal chrome for the Overview's edit dialogs.

import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  on_close,
  children,
  footer,
  width = "max-w-lg",
}: {
  title: string;
  on_close: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className={`w-full ${width} bg-white rounded-lg shadow-xl border-2 border-[#E2E8F0] my-8`}>
        <header className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] rounded-t-md">
          <h2 className="text-white font-bold uppercase tracking-wide text-sm">{title}</h2>
          <button
            type="button"
            onClick={on_close}
            aria-label="Close"
            className="text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-4">{children}</div>
        {footer && (
          <footer className="px-4 py-3 border-t-2 border-[#E2E8F0] flex justify-end gap-2 bg-[#F8FAFC] rounded-b-md">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide font-semibold text-[#475569] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

export const input_class =
  "w-full px-2.5 py-1.5 border-2 border-[#E2E8F0] rounded text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-1.5 rounded bg-[#3A6EA5] text-white text-sm font-bold hover:bg-[#1F3A5F] disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 rounded bg-white text-[#1F3A5F] border-2 border-[#CBD5E1] text-sm font-bold hover:bg-[#F1F5F9] transition-colors"
    >
      {children}
    </button>
  );
}

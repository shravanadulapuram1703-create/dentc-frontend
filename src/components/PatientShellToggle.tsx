// Collapse/expand button for the persistent patient shell (identity banner +
// icon tab strip). State lives in the usePatientShellCollapse hook.
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PatientShellToggleProps {
  collapsed: boolean;
  onClick: () => void;
  /** What the button minimizes, e.g. "patient header" — used for the tooltip/aria label. */
  target: string;
  /** Optional visible caption next to the chevron (default: Minimize / Expand). */
  caption?: { collapsed: string; expanded: string };
}

/** Compact pill button with a chevron; matches the app's slate/blue button look. */
export function PatientShellToggle({ collapsed, onClick, target, caption }: PatientShellToggleProps) {
  const label = collapsed ? `Expand ${target}` : `Minimize ${target}`;
  const text = collapsed ? caption?.collapsed ?? 'Expand' : caption?.expanded ?? 'Minimize';
  const Icon = collapsed ? ChevronDown : ChevronUp;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-expanded={!collapsed}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white pl-2 pr-2.5 text-[11px] font-semibold text-slate-600 shadow-sm transition-colors hover:border-[#3A6EA5] hover:bg-[#EFF6FE] hover:text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]/30"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span>{text}</span>
    </button>
  );
}

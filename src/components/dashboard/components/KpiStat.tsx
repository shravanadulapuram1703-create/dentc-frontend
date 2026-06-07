import type { ReactNode } from "react";
import { utils } from "../../../styles/theme.js";

export type KpiTone = "slate" | "teal" | "blue" | "amber" | "red" | "neutral";

const toneStyles: Record<KpiTone, { value: string; icon: string }> = {
  slate: { value: "text-[#1F3A5F]", icon: "text-[#1F3A5F]" },
  teal: { value: "text-[#259688]", icon: "text-[#2FB9A7]" },
  blue: { value: "text-[#2f5a8c]", icon: "text-[#3A6EA5]" },
  amber: { value: "text-[#D97706]", icon: "text-[#D97706]" },
  red: { value: "text-[#DC2626]", icon: "text-[#DC2626]" },
  neutral: { value: "text-[#475569]", icon: "text-[#94A3B8]" },
};

interface KpiStatProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: KpiTone;
  hint?: string;
  onClick?: () => void;
  loading?: boolean;
}

/** A single KPI metric tile. Clickable when `onClick` is provided (drill-down). */
export default function KpiStat({
  label,
  value,
  icon,
  tone = "slate",
  hint,
  onClick,
  loading,
}: KpiStatProps) {
  const t = toneStyles[tone];
  const interactive = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={utils.cn(
        "flex h-full w-full flex-col rounded-lg border border-[#E2E8F0] bg-white p-3 text-left transition-all",
        interactive
          ? "hover:border-[#3A6EA5] hover:shadow-sm cursor-pointer"
          : "cursor-default",
      )}
    >
      <div className="flex items-start gap-1.5">
        {icon && <span className={utils.cn("shrink-0 mt-px", t.icon)}>{icon}</span>}
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748B] leading-tight">
          {label}
        </span>
      </div>

      {loading ? (
        <div className="mt-2 h-7 w-14 rounded bg-[#E2E8F0] animate-pulse" />
      ) : (
        <p className={utils.cn("mt-1.5 text-2xl font-bold tabular-nums leading-none", t.value)}>
          {value}
        </p>
      )}

      <p className="mt-1 min-h-[14px] text-[11px] text-[#94A3B8] leading-tight">{hint ?? ""}</p>
    </button>
  );
}

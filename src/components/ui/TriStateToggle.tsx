/**
 * The legacy Denticon three-position answer control: **N · ● · Y**.
 *
 * Legacy prints a legend for all three states (NO / NOT ANSWERED / YES), so the
 * middle position is a real, selectable state rather than just an initial
 * value — clicking it returns a row to Not Answered, which is what removes the
 * stored answer on save. A plain Yes/No pair cannot express that, which is why
 * both the Add-Patient wizard and the Patient Medical History screen share this
 * one control: the two must be able to record exactly the same three answers.
 */

/** "" is Not Answered — modelled as the absence of a stored row. */
export type TriState = "yes" | "no" | "";

interface Props {
  value: TriState;
  onChange: (next: TriState) => void;
  disabled?: boolean;
  /** Accessible name — the row's alert or question label. */
  label: string;
}

export default function TriStateToggle({ value, onChange, disabled, label }: Props) {
  const base =
    "flex items-center justify-center text-[10px] font-bold leading-none transition-colors";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex items-center rounded-full border border-[#94A3B8] bg-white overflow-hidden select-none ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "no"}
        aria-label={`${label}: No`}
        title="No"
        disabled={disabled}
        onClick={() => onChange("no")}
        className={`${base} w-6 h-[18px] rounded-l-full ${
          value === "no" ? "bg-[#15803D] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"
        }`}
      >
        N
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === ""}
        aria-label={`${label}: Not answered`}
        title="Not answered"
        disabled={disabled}
        onClick={() => onChange("")}
        className={`${base} w-5 h-[18px] border-x border-[#CBD5E1] ${
          value === "" ? "bg-[#1E293B] text-white" : "text-[#94A3B8] hover:bg-[#F1F5F9]"
        }`}
      >
        ●
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "yes"}
        aria-label={`${label}: Yes`}
        title="Yes"
        disabled={disabled}
        onClick={() => onChange("yes")}
        className={`${base} w-6 h-[18px] rounded-r-full ${
          value === "yes" ? "bg-[#DC2626] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"
        }`}
      >
        Y
      </button>
    </div>
  );
}

/** The legend legacy prints above the answer grid. */
export function TriStateLegend() {
  const Chip = ({ tone, glyph }: { tone: string; glyph: string }) => (
    <span
      className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white ${tone}`}
    >
      {glyph}
    </span>
  );
  return (
    <div className="flex items-center gap-4 text-xs font-semibold text-[#475569]">
      <span className="flex items-center gap-1.5">
        NO <Chip tone="bg-[#15803D]" glyph="N" />
      </span>
      <span className="flex items-center gap-1.5">
        NOT ANSWERED <Chip tone="bg-[#1E293B]" glyph="●" />
      </span>
      <span className="flex items-center gap-1.5">
        YES <Chip tone="bg-[#DC2626]" glyph="Y" />
      </span>
    </div>
  );
}

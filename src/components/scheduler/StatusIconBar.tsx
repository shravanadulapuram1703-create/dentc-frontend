/**
 * Quick-status icon bar (PDF page 11, "Option 1" — click the appointment and
 * select the required status icon). Renders the legacy S·C·U·L·R·A·O·H letter
 * icons followed by Missed (M) and Cancelled (X). Cancelled routes through the
 * caller (which opens the cancellation dialog) rather than applying directly.
 */
import {
  QUICK_STATUS_ORDER,
  STATUS_META,
  statusColorFor,
} from "./statusMeta";
import type { AppointmentStatusName } from "../../services/schedulerApi";

interface Props {
  current?: string;
  /** Optional backend status→color overrides (from `appt_status` definitions). */
  colors?: Map<string, string>;
  onSetStatus: (status: AppointmentStatusName) => void;
  onMissed: () => void;
  onCancelRequest: () => void;
  disabled?: boolean;
}

function IconButton({
  letter,
  title,
  color,
  active,
  onClick,
  disabled,
}: {
  letter: string;
  title: string;
  color: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-transform hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "ring-2 ring-offset-1 ring-[#1F3A5F]" : ""
      }`}
      style={{ backgroundColor: color, color: "#FFFFFF", borderColor: "rgba(0,0,0,0.15)" }}
      aria-label={title}
      aria-pressed={active}
    >
      {letter}
    </button>
  );
}

export default function StatusIconBar({
  current,
  colors,
  onSetStatus,
  onMissed,
  onCancelRequest,
  disabled,
}: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {QUICK_STATUS_ORDER.map((name) => {
        const meta = STATUS_META[name];
        return (
          <IconButton
            key={name}
            letter={meta.letter}
            title={name}
            color={statusColorFor(name, colors)}
            active={current === name}
            onClick={() => onSetStatus(name)}
            disabled={disabled}
          />
        );
      })}
      <span className="mx-0.5 w-px h-5 bg-[#CBD5E1]" />
      <IconButton
        letter={STATUS_META.Missed.letter}
        title="Missed"
        color={STATUS_META.Missed.color}
        active={current === "Missed"}
        onClick={onMissed}
        disabled={disabled}
      />
      <IconButton
        letter={STATUS_META.Cancelled.letter}
        title="Cancelled"
        color={STATUS_META.Cancelled.color}
        active={current === "Cancelled"}
        onClick={onCancelRequest}
        disabled={disabled}
      />
    </div>
  );
}

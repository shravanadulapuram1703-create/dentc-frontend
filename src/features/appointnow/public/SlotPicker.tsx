import { Loader2, Sun, Sunset } from "lucide-react";
import type { AvailableSlot } from "../transport/types";
import { formatTime12, isMorning } from "./bookingUtils";

interface SlotPickerProps {
  slots: AvailableSlot[];
  loading: boolean;
  selectedStart: string | null;
  onSelect: (slot: AvailableSlot) => void;
}

function Group({
  title,
  icon,
  slots,
  selectedStart,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  slots: AvailableSlot[];
  selectedStart: string | null;
  onSelect: (slot: AvailableSlot) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((s) => {
          const active = s.start_time === selectedStart;
          return (
            <button
              key={s.start_time}
              type="button"
              onClick={() => onSelect(s)}
              className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-[#3A6EA5] bg-[#3A6EA5] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#3A6EA5] hover:text-[#3A6EA5]"
              }`}
            >
              {formatTime12(s.start_time)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The available-slots grid, split into morning / afternoon. */
export default function SlotPicker({
  slots,
  loading,
  selectedStart,
  onSelect,
}: SlotPickerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Finding open times…
      </div>
    );
  }
  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        No open times on this day. Try another date.
      </div>
    );
  }
  const morning = slots.filter((s) => isMorning(s.start_time));
  const afternoon = slots.filter((s) => !isMorning(s.start_time));
  return (
    <div className="space-y-5">
      <Group
        title="Morning"
        icon={<Sun className="h-3.5 w-3.5" />}
        slots={morning}
        selectedStart={selectedStart}
        onSelect={onSelect}
      />
      <Group
        title="Afternoon"
        icon={<Sunset className="h-3.5 w-3.5" />}
        slots={afternoon}
        selectedStart={selectedStart}
        onSelect={onSelect}
      />
    </div>
  );
}

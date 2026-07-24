import { formatDateSeparator } from "../lib/time";

/** Sticky-ish centered day divider between message groups. */
export default function DateSeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-xs font-semibold text-[#64748B] shadow-sm">
        {formatDateSeparator(iso)}
      </span>
    </div>
  );
}

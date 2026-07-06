import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, CheckCircle2 } from "lucide-react";
import WidgetCard from "../../dashboard/components/WidgetCard";
import { utils } from "../../../styles/theme.js";
import type { MyAlert, AlertTone } from "../lib/useMyDay";

interface MyAlertsWidgetProps {
  alerts: MyAlert[];
  isLoading: boolean;
}

const TONE: Record<AlertTone, { dot: string; ring: string; badge: string }> = {
  red: { dot: "bg-[#EF4444]", ring: "border-l-[#EF4444]", badge: "bg-[#EF4444]/10 text-[#DC2626]" },
  amber: { dot: "bg-[#F59E0B]", ring: "border-l-[#F59E0B]", badge: "bg-[#F59E0B]/10 text-[#D97706]" },
  blue: { dot: "bg-[#3A6EA5]", ring: "border-l-[#3A6EA5]", badge: "bg-[#3A6EA5]/10 text-[#3A6EA5]" },
};

/**
 * Prioritized alerts & reminders derived from live office data (no-shows,
 * overdue/due recalls, unconfirmed appointments). Each row deep-links to where
 * the item is resolved. When nothing is pending it shows an "all clear" state.
 */
export default function MyAlertsWidget({ alerts, isLoading }: MyAlertsWidgetProps) {
  const navigate = useNavigate();
  const urgent = alerts.filter((a) => a.tone === "red").length;

  return (
    <WidgetCard
      title="Alerts & Reminders"
      icon={<Bell className="w-4 h-4" />}
      isLoading={isLoading}
      actions={
        urgent > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#EF4444] text-white text-[11px] font-bold tabular-nums">
            {urgent}
          </span>
        ) : undefined
      }
      bodyClassName="p-0"
    >
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
          <CheckCircle2 className="w-7 h-7 text-[#2FB9A7]" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-[#259688]">You're all caught up</p>
          <p className="text-xs text-[#64748B]">No pending alerts right now.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E2E8F0]">
          {alerts.map((a) => {
            const tone = TONE[a.tone];
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => a.to && navigate(a.to)}
                  disabled={!a.to}
                  className={utils.cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 hover:bg-[#F7F9FC] transition-colors disabled:cursor-default",
                    tone.ring,
                  )}
                >
                  <span className={utils.cn("w-2 h-2 rounded-full shrink-0", tone.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1E293B] truncate">{a.title}</p>
                    <p className="text-xs text-[#64748B] truncate">{a.detail}</p>
                  </div>
                  {a.to && <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

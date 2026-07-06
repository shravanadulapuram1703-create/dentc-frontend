import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Info } from "lucide-react";
import type { AppointmentSchedulerRead } from "@/api/generated/model";
import WidgetCard from "../../dashboard/components/WidgetCard";
import { deriveApptStatus, formatTime } from "../../dashboard/lib/dashboardUtils";
import type { MyScheduleResult } from "../lib/useMyDay";
import { utils } from "../../../styles/theme.js";

interface MyScheduleWidgetProps {
  schedule: MyScheduleResult;
}

/**
 * "My Schedule Today" — the user's own appointments (scoped by their linked
 * provider). When the account has no provider link (front desk / admin) we show
 * the whole office feed and say so, rather than showing an empty chair.
 */
export default function MyScheduleWidget({ schedule }: MyScheduleWidgetProps) {
  const navigate = useNavigate();
  const { rows, isLoading, isError, scoped } = schedule;

  const openPatient = (appt: AppointmentSchedulerRead) => {
    if (appt.patient_id != null) navigate(`/patient/${appt.patient_id}/overview`);
  };

  return (
    <WidgetCard
      title="My Schedule Today"
      icon={<CalendarClock className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && rows.length === 0}
      emptyMessage={
        scoped ? "No appointments on your schedule today." : "No appointments scheduled for today."
      }
      bodyClassName="p-0"
      footer={
        <button
          type="button"
          onClick={() => navigate("/scheduler")}
          className="text-xs font-bold text-[#3A6EA5] hover:text-[#2f5a8c] inline-flex items-center gap-1"
        >
          Open full scheduler <ChevronRight className="w-3.5 h-3.5" />
        </button>
      }
    >
      {!scoped && rows.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-2 bg-[#3A6EA5]/5 border-b border-[#E2E8F0] text-[11px] text-[#64748B]">
          <Info className="w-3.5 h-3.5 mt-px shrink-0 text-[#3A6EA5]" />
          <span>
            Your account isn't linked to a provider, so this shows the whole office schedule.
          </span>
        </div>
      )}
      <ul className="divide-y divide-[#E2E8F0] max-h-[26rem] overflow-y-auto">
        {rows.map((appt) => {
          const status = deriveApptStatus(appt);
          return (
            <li key={appt.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F9FC]">
              <div className="w-16 shrink-0 text-right">
                <p className="text-sm font-bold text-[#1F3A5F] tabular-nums">
                  {formatTime(appt.start_time)}
                </p>
                <p className="text-[11px] text-[#94A3B8] tabular-nums">{appt.duration}m</p>
              </div>

              <button
                type="button"
                onClick={() => openPatient(appt)}
                disabled={appt.patient_id == null}
                className="flex-1 min-w-0 text-left disabled:cursor-default"
              >
                <p className="text-sm font-semibold text-[#1E293B] truncate hover:text-[#3A6EA5]">
                  {appt.patient_name || "(no patient)"}
                </p>
                <p className="text-xs text-[#64748B] truncate">
                  {[!scoped ? appt.provider_name : null, appt.operatory_name]
                    .filter(Boolean)
                    .join(" · ") ||
                    appt.procedure_label ||
                    "—"}
                </p>
              </button>

              <span className={utils.cn(status.badgeClass, "shrink-0")}>{status.label}</span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

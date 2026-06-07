import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, LogIn, LogOut, Loader2, ChevronRight } from "lucide-react";
import { useListDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import { useUpdateAppointmentStatus } from "@/api/generated/endpoints/appointments/appointments";
import type { AppointmentSchedulerRead, DefinitionRead } from "@/api/generated/model";
import WidgetCard from "../components/WidgetCard";
import { useTodayScheduler } from "../lib/useDashboardData";
import { deriveApptStatus, formatTime } from "../lib/dashboardUtils";
import { utils } from "../../../styles/theme.js";

interface Props {
  currentOffice: string;
}

/** Resolve the tenant's configured status value for a semantic action. */
function resolveStatus(defs: DefinitionRead[], patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const hit = defs.find((d) => re.test(`${d.key1} ${d.description}`));
    if (hit) return hit.key1 || hit.description;
  }
  return null;
}

/**
 * Today's Schedule — live denormalized feed with quick Check-In / Check-Out.
 * Status values are resolved from the `appt_status` definitions so we never PATCH
 * a guessed status string; the action is disabled when no matching status exists.
 */
export default function TodaysScheduleWidget({ currentOffice }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { rows, isLoading, isError } = useTodayScheduler(currentOffice);
  const defsQuery = useListDefinitions({ group_code: "appt_status", is_active: true, size: 200 });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const defs = useMemo(() => defsQuery.data?.items ?? [], [defsQuery.data]);
  const checkInStatus = useMemo(
    () => resolveStatus(defs, [/checked.?in/i, /in reception/i, /arriv/i, /reception/i, /waiting/i]),
    [defs],
  );
  const checkOutStatus = useMemo(
    () => resolveStatus(defs, [/checked.?out/i, /check.?out/i, /complete/i]),
    [defs],
  );

  const sorted = useMemo(
    () => [...rows].filter((r) => !r.is_blocked).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [rows],
  );

  const statusMutation = useUpdateAppointmentStatus({
    mutation: {
      onSettled: () => {
        setPendingId(null);
        queryClient.invalidateQueries({ queryKey: ["/api/v1/appointments/scheduler"] });
      },
    },
  });

  const setStatus = (appt: AppointmentSchedulerRead, status: string) => {
    setPendingId(appt.id);
    statusMutation.mutate({ appointmentId: appt.id, data: { status } });
  };

  const openPatient = (appt: AppointmentSchedulerRead) => {
    if (appt.patient_id != null) navigate(`/patient/${appt.patient_id}/overview`);
  };

  return (
    <WidgetCard
      title="Today's Schedule"
      icon={<CalendarClock className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && sorted.length === 0}
      emptyMessage="No appointments scheduled for today."
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
      <ul className="divide-y divide-[#E2E8F0] max-h-[26rem] overflow-y-auto">
        {sorted.map((appt) => {
          const status = deriveApptStatus(appt);
          const isPending = pendingId === appt.id && statusMutation.isPending;
          const canCheckIn =
            !!checkInStatus && !appt.checked_in_on && !appt.is_cancelled && !appt.is_missed;
          const canCheckOut = !!checkOutStatus && !!appt.checked_in_on && !appt.checked_out_on;
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
                  {[appt.provider_name, appt.operatory_name].filter(Boolean).join(" · ") ||
                    appt.procedure_label ||
                    "—"}
                </p>
              </button>

              <span className={utils.cn(status.badgeClass, "shrink-0")}>{status.label}</span>

              <div className="flex items-center gap-1.5 shrink-0 w-[2.25rem] justify-end">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" />
                ) : canCheckIn ? (
                  <button
                    type="button"
                    onClick={() => setStatus(appt, checkInStatus!)}
                    className="p-1.5 rounded-md bg-[#3A6EA5]/10 text-[#3A6EA5] hover:bg-[#3A6EA5] hover:text-white transition-colors"
                    title="Check in"
                  >
                    <LogIn className="w-4 h-4" />
                  </button>
                ) : canCheckOut ? (
                  <button
                    type="button"
                    onClick={() => setStatus(appt, checkOutStatus!)}
                    className="p-1.5 rounded-md bg-[#2FB9A7]/10 text-[#2FB9A7] hover:bg-[#2FB9A7] hover:text-white transition-colors"
                    title="Check out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  LogIn,
  CalendarClock,
  CheckCircle2,
  XCircle,
  UserX,
  RefreshCw,
} from "lucide-react";
import WidgetCard from "../components/WidgetCard";
import KpiStat from "../components/KpiStat";
import { useTodayScheduler } from "../lib/useDashboardData";
import { bucketAppointmentKpis } from "../lib/dashboardUtils";

interface Props {
  currentOffice: string;
}

/** "Today's Appointments" KPI card group — counts derived from the scheduler feed. */
export default function TodaysAppointmentsKpi({ currentOffice }: Props) {
  const navigate = useNavigate();
  const { rows, isLoading, isError, isFetching, refetch } = useTodayScheduler(currentOffice);
  const kpis = useMemo(() => bucketAppointmentKpis(rows), [rows]);

  const goScheduler = () => navigate("/scheduler");

  return (
    <WidgetCard
      title="Today's Appointments"
      icon={<CalendarCheck className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load today's appointments."
      actions={
        <button
          type="button"
          onClick={() => refetch()}
          className="p-1.5 rounded-md hover:bg-white text-[#475569]"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiStat
          label="Total"
          value={kpis.total}
          tone="slate"
          icon={<CalendarCheck className="w-4 h-4" />}
          onClick={goScheduler}
        />
        <KpiStat
          label="Checked In"
          value={kpis.checkedIn}
          tone="blue"
          icon={<LogIn className="w-4 h-4" />}
          onClick={goScheduler}
        />
        <KpiStat
          label="Scheduled"
          value={kpis.scheduled}
          tone="amber"
          icon={<CalendarClock className="w-4 h-4" />}
          onClick={goScheduler}
        />
        <KpiStat
          label="Completed"
          value={kpis.completed}
          tone="teal"
          icon={<CheckCircle2 className="w-4 h-4" />}
          onClick={goScheduler}
        />
        <KpiStat
          label="Cancelled"
          value={kpis.cancelled}
          tone="red"
          icon={<XCircle className="w-4 h-4" />}
          onClick={goScheduler}
        />
        <KpiStat
          label="No Shows"
          value={kpis.noShow}
          tone="red"
          icon={<UserX className="w-4 h-4" />}
          onClick={goScheduler}
        />
      </div>
    </WidgetCard>
  );
}

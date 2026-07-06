import { useNavigate } from "react-router-dom";
import { CalendarClock, LogIn, CheckCircle2, ListTodo } from "lucide-react";
import KpiStat from "../../dashboard/components/KpiStat";
import type { MyScheduleResult } from "../lib/useMyDay";

interface MyStatsStripProps {
  schedule: MyScheduleResult;
  openTaskCount: number;
}

/**
 * The at-a-glance personal KPI row: today's appointments scoped to the user,
 * how many remain, how many are checked in, plus the user's open task count.
 * Each tile is a drill-down into the relevant module.
 */
export default function MyStatsStrip({ schedule, openTaskCount }: MyStatsStripProps) {
  const navigate = useNavigate();
  const loading = schedule.isLoading;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      <KpiStat
        label={schedule.scoped ? "My Appointments" : "Appointments Today"}
        value={schedule.total}
        tone="slate"
        icon={<CalendarClock className="w-4 h-4" />}
        hint="Today"
        loading={loading}
        onClick={() => navigate("/scheduler")}
      />
      <KpiStat
        label="Remaining"
        value={schedule.remaining}
        tone="amber"
        icon={<CalendarClock className="w-4 h-4" />}
        hint="Not yet seen"
        loading={loading}
        onClick={() => navigate("/scheduler")}
      />
      <KpiStat
        label="Checked In"
        value={schedule.checkedIn}
        tone="blue"
        icon={<LogIn className="w-4 h-4" />}
        hint="In the office"
        loading={loading}
        onClick={() => navigate("/scheduler")}
      />
      <KpiStat
        label="Completed"
        value={schedule.completed}
        tone="teal"
        icon={<CheckCircle2 className="w-4 h-4" />}
        hint="Checked out"
        loading={loading}
        onClick={() => navigate("/scheduler")}
      />
      <KpiStat
        label="Open Tasks"
        value={openTaskCount}
        tone={openTaskCount > 0 ? "red" : "neutral"}
        icon={<ListTodo className="w-4 h-4" />}
        hint="On your list"
      />
    </div>
  );
}

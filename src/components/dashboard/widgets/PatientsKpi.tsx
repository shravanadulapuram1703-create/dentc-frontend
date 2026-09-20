import { useNavigate } from "react-router-dom";
import { Users, UserPlus, BellRing } from "lucide-react";
import { useListPatients } from "@/api/generated/endpoints/patients/patients";
import { homeOfficeFilter } from "@/features/office-scope";
import WidgetCard from "../components/WidgetCard";
import KpiStat from "../components/KpiStat";
import { toOfficeId } from "../lib/useDashboardData";
import { useRecallDue } from "../lib/useMetrics";
import { todayISO } from "../lib/dashboardUtils";

interface Props {
  currentOffice: string;
}

/** "Patients" KPI: new today, active total, recall due (next 7 days incl. overdue). */
export default function PatientsKpi({ currentOffice }: Props) {
  const navigate = useNavigate();
  const home_office_id = toOfficeId(currentOffice);

  const newToday = useListPatients({ created_at_from: todayISO(), ...homeOfficeFilter(home_office_id), size: 1 });
  const active = useListPatients({ is_active: true, ...homeOfficeFilter(home_office_id), size: 1 });
  const recall = useRecallDue(currentOffice);

  const recallDue =
    (recall.data?.overdue ?? 0) + (recall.data?.dueToday ?? 0) + (recall.data?.dueWeek ?? 0);
  // Recalls with no office are excluded from the in-office count but never hidden.
  const recallHint = recall.data
    ? recall.data.unassigned > 0
      ? `${recall.data.overdue} overdue · Unassigned ${recall.data.unassigned}`
      : `${recall.data.overdue} overdue`
    : undefined;

  return (
    <WidgetCard title="Patients" icon={<Users className="w-4 h-4" />}>
      <div className="grid grid-cols-3 gap-3">
        <KpiStat
          label="New Today"
          value={newToday.data?.meta.total ?? 0}
          tone="teal"
          icon={<UserPlus className="w-4 h-4" />}
          loading={newToday.isLoading}
          onClick={() => navigate("/patient/new")}
        />
        <KpiStat
          label="Active"
          value={active.data?.meta.total ?? 0}
          tone="slate"
          icon={<Users className="w-4 h-4" />}
          loading={active.isLoading}
          onClick={() => navigate("/patient?switch=1")}
        />
        <KpiStat
          label="Recall Due"
          value={recallDue}
          tone={recall.data && recall.data.overdue > 0 ? "red" : "amber"}
          icon={<BellRing className="w-4 h-4" />}
          loading={recall.isLoading}
          hint={recallHint}
        />
      </div>
    </WidgetCard>
  );
}

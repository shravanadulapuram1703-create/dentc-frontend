import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, LogIn, Activity, CheckCircle2, ChevronRight } from "lucide-react";
import { useListPatients } from "@/api/generated/endpoints/patients/patients";
import type { PatientRead } from "@/api/generated/model";
import WidgetCard from "../components/WidgetCard";
import KpiStat from "../components/KpiStat";
import { useTodayScheduler, toOfficeId } from "../lib/useDashboardData";
import { todayISO } from "../lib/dashboardUtils";

interface Props {
  currentOffice: string;
}

function patientName(p: PatientRead): string {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.preferred_name || `Patient #${p.id}`;
}

/** Patient Activity — registrations today + in-office flow derived from the feed. */
export default function PatientActivityWidget({ currentOffice }: Props) {
  const navigate = useNavigate();
  const home_office_id = toOfficeId(currentOffice);
  const { rows, isLoading: schedLoading, isError: schedError } = useTodayScheduler(currentOffice);

  const newTodayQuery = useListPatients({
    created_at_from: todayISO(),
    home_office_id: home_office_id ?? null,
    size: 1,
  });
  const recentQuery = useListPatients({
    sort: "created_at",
    order: "desc",
    home_office_id: home_office_id ?? null,
    size: 15,
  });

  const flow = useMemo(() => {
    let checkedIn = 0;
    let inOffice = 0;
    let checkedOut = 0;
    for (const a of rows) {
      if (a.is_blocked || a.is_cancelled) continue;
      if (a.checked_in_on) checkedIn += 1;
      if (a.checked_out_on) checkedOut += 1;
      else if (a.checked_in_on) inOffice += 1;
    }
    return { checkedIn, inOffice, checkedOut };
  }, [rows]);

  const recent = recentQuery.data?.items ?? [];
  const newToday = newTodayQuery.data?.meta.total ?? 0;

  return (
    <WidgetCard
      title="Patient Activity"
      icon={<Activity className="w-4 h-4" />}
      isLoading={schedLoading || recentQuery.isLoading || newTodayQuery.isLoading}
      isError={schedError || recentQuery.isError}
      bodyClassName="p-4 space-y-4"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiStat
          label="New Today"
          value={newToday}
          tone="teal"
          icon={<UserPlus className="w-4 h-4" />}
          loading={newTodayQuery.isLoading}
        />
        <KpiStat label="Checked In" value={flow.checkedIn} tone="blue" icon={<LogIn className="w-4 h-4" />} />
        <KpiStat label="In Office" value={flow.inOffice} tone="amber" icon={<Activity className="w-4 h-4" />} />
        <KpiStat
          label="Checked Out"
          value={flow.checkedOut}
          tone="slate"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      <div>
        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">
          Recent Registrations
        </p>
        {recent.length === 0 ? (
          <p className="text-sm text-[#94A3B8] py-2">No recent registrations.</p>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] max-h-60 overflow-y-auto pr-1">
            {recent.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/patient/${p.id}/overview`)}
                  className="w-full flex items-center justify-between gap-2 py-2 text-left hover:bg-[#F7F9FC] rounded px-1"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1E293B] truncate">{patientName(p)}</p>
                    <p className="text-xs text-[#64748B] truncate">
                      {p.chart_no ? `Chart ${p.chart_no}` : `ID ${p.id}`}
                      {p.cell_phone || p.phone ? ` · ${p.cell_phone || p.phone}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}

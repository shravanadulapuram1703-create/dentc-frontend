import { LineChart, CalendarDays, CalendarRange, Calendar } from "lucide-react";
import WidgetCard from "../components/WidgetCard";
import KpiStat from "../components/KpiStat";
import { useRevenue } from "../lib/useMetrics";
import { formatCurrency } from "../lib/aggregate";

interface Props {
  currentOffice: string;
}

/** "Revenue" KPI: collections summed for today / last 7 days / month-to-date. */
export default function RevenueKpi({ currentOffice }: Props) {
  const revenue = useRevenue(currentOffice);

  return (
    <WidgetCard
      title="Revenue (Collections)"
      icon={<LineChart className="w-4 h-4" />}
      isError={revenue.isError}
      footer={
        revenue.data?.truncated ? (
          <p className="text-[11px] text-[#94A3B8]">Capped sample — full month may exceed the fetch limit.</p>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <KpiStat
          label="Today"
          value={formatCurrency(revenue.data?.daily ?? 0)}
          tone="teal"
          icon={<CalendarDays className="w-4 h-4" />}
          loading={revenue.isLoading}
        />
        <KpiStat
          label="This Week"
          value={formatCurrency(revenue.data?.weekly ?? 0)}
          tone="blue"
          icon={<CalendarRange className="w-4 h-4" />}
          loading={revenue.isLoading}
        />
        <KpiStat
          label="This Month"
          value={formatCurrency(revenue.data?.monthly ?? 0)}
          tone="slate"
          icon={<Calendar className="w-4 h-4" />}
          loading={revenue.isLoading}
        />
      </div>
    </WidgetCard>
  );
}

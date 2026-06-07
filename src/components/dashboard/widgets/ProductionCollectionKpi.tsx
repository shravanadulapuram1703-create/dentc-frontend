import { DollarSign, TrendingUp, Wallet, CalendarRange } from "lucide-react";
import WidgetCard from "../components/WidgetCard";
import KpiStat from "../components/KpiStat";
import { useCollectionToday, useCompletedProductionToday } from "../lib/useMetrics";
import { formatCurrency } from "../lib/aggregate";

interface Props {
  currentOffice: string;
}

/**
 * "Today's Production & Collection". Completed production (posted procedures) and
 * collection are summed from real list endpoints. Scheduled production is left as
 * an explicit gap — /appointment-procedures has no date filter, so computing it
 * would require an N+1 over today's appointments (see the dashboard dev report).
 */
export default function ProductionCollectionKpi({ currentOffice }: Props) {
  const production = useCompletedProductionToday(currentOffice);
  const collection = useCollectionToday(currentOffice);

  return (
    <WidgetCard
      title="Production & Collection"
      icon={<DollarSign className="w-4 h-4" />}
      footer={
        (production.data?.truncated || collection.data?.truncated) ? (
          <p className="text-[11px] text-[#94A3B8]">Showing a capped sample of today's records.</p>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <KpiStat
          label="Scheduled"
          value="—"
          tone="neutral"
          icon={<CalendarRange className="w-4 h-4" />}
          hint="Awaiting backend"
        />
        <KpiStat
          label="Completed"
          value={formatCurrency(production.data?.amount ?? 0)}
          tone="teal"
          icon={<TrendingUp className="w-4 h-4" />}
          loading={production.isLoading}
          hint={production.data ? `${production.data.count} procedures` : undefined}
        />
        <KpiStat
          label="Collection"
          value={formatCurrency(collection.data?.amount ?? 0)}
          tone="blue"
          icon={<Wallet className="w-4 h-4" />}
          loading={collection.isLoading}
          hint={collection.data ? `${collection.data.count} payments` : undefined}
        />
      </div>
    </WidgetCard>
  );
}

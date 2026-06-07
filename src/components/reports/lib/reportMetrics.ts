// Aggregation hooks for the Reports executive dashboard. The backend exposes no
// roll-up endpoints (see docs/reports/reports_backend_devreport.md gap #1), so
// each hook pages CRUD list endpoints and reduces client-side, reusing the
// dashboard aggregation helpers and surfacing truncation honestly.
import { useQuery } from "@tanstack/react-query";
import { listPatientProcedures } from "@/api/generated/endpoints/clinical/clinical";
import { listPatients } from "@/api/generated/endpoints/patients/patients";
import {
  listPatientPayments,
  listInsuranceClaims,
} from "@/api/generated/endpoints/billing/billing";
import { listAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { fetchAllPages, parseDecimal } from "../../dashboard/lib/aggregate";
import { toOfficeId } from "../../dashboard/lib/useDashboardData";
import {
  type DateRange,
  type Granularity,
  granularityFor,
  bucketKey,
  bucketLabel,
} from "./reportRange";

const SUMMARY_STALE = 60_000;
const TREND_STALE = 5 * 60_000;

// Claim statuses that are NOT outstanding receivables. Status is a free-form
// string in the schema (devreport gap #5), so we match case-insensitively.
const TERMINAL_CLAIM_STATUS = new Set([
  "paid",
  "denied",
  "rejected",
  "void",
  "voided",
  "closed",
  "cancelled",
  "canceled",
]);

function isOutstandingClaim(status?: string | null): boolean {
  return !TERMINAL_CLAIM_STATUS.has((status ?? "").trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Executive summary (the 7 KPI tiles)
// ---------------------------------------------------------------------------

export interface ExecutiveSummary {
  production: number;
  collections: number;
  newPatients: number;
  activePatients: number;
  scheduledAppointments: number;
  insuranceReceivables: number;
  /** Some KPI was based on a capped page sample. */
  truncated: boolean;
}

/**
 * One query that fans out (bounded) to compute the executive KPIs for an office
 * + date range. Counts use `meta.total` (cheap); money KPIs page and sum.
 */
export function useExecutiveSummary(currentOffice: string | undefined, range: DateRange) {
  const office = toOfficeId(currentOffice);
  return useQuery<ExecutiveSummary>({
    queryKey: ["reports", "summary", range.from, range.to, office ?? null],
    staleTime: SUMMARY_STALE,
    queryFn: async () => {
      const [procs, pays, claims, appts, newPats, activePats] = await Promise.all([
        fetchAllPages((page, size) =>
          listPatientProcedures({
            date_of_service_from: range.from,
            date_of_service_to: range.to,
            is_void: false,
            page,
            size,
          }),
        ),
        fetchAllPages((page, size) =>
          listPatientPayments({
            payment_date_from: range.from,
            payment_date_to: range.to,
            is_void: false,
            page,
            size,
          }),
        ),
        fetchAllPages((page, size) => listInsuranceClaims({ is_active: true, page, size })),
        fetchAllPages((page, size) =>
          listAppointments({
            date_from: range.from,
            date_to: range.to,
            office_id: office ?? null,
            page,
            size,
          }),
        ),
        // Counts: a size:1 page is enough to read meta.total.
        listPatients({
          created_at_from: range.from,
          created_at_to: range.to,
          home_office_id: office ?? null,
          page: 1,
          size: 1,
        }),
        listPatients({ is_active: true, home_office_id: office ?? null, page: 1, size: 1 }),
      ]);

      const inOffice = <T extends { office_id?: number | null }>(rows: T[]): T[] =>
        office == null ? rows : rows.filter((r) => r.office_id === office);

      const production = inOffice(procs.items).reduce((s, p) => s + parseDecimal(p.fee), 0);
      const collections = inOffice(pays.items).reduce((s, p) => s + parseDecimal(p.amount), 0);
      const insuranceReceivables = inOffice(claims.items)
        .filter((c) => isOutstandingClaim(c.status))
        .reduce(
          (s, c) => s + Math.max(0, parseDecimal(c.total_billed) - parseDecimal(c.total_paid)),
          0,
        );
      const scheduledAppointments = appts.items.filter(
        (a) => !a.is_cancelled && !a.is_blocked,
      ).length;

      return {
        production,
        collections,
        newPatients: newPats.meta.total,
        activePatients: activePats.meta.total,
        scheduledAppointments,
        insuranceReceivables,
        truncated: procs.truncated || pays.truncated || claims.truncated || appts.truncated,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Trends + procedure distribution (opt-in — heavier fan-out)
// ---------------------------------------------------------------------------

export interface TrendPoint {
  key: string;
  label: string;
  production: number;
  collections: number;
  newPatients: number;
}

export interface ProcedureSlice {
  name: string;
  value: number;
  // recharts Pie data requires an index signature.
  [key: string]: string | number;
}

export interface ReportTrends {
  series: TrendPoint[];
  procedureDist: ProcedureSlice[];
  granularity: Granularity;
  truncated: boolean;
}

const TOP_PROCEDURES = 6;

/**
 * Opt-in time-series + procedure distribution for the analytics section. Pages
 * procedures/payments/patients over the range (bounded) and buckets by the
 * range-appropriate granularity.
 */
export function useReportTrends(
  currentOffice: string | undefined,
  range: DateRange,
  enabled: boolean,
) {
  const office = toOfficeId(currentOffice);
  const g = granularityFor(range);
  return useQuery<ReportTrends>({
    queryKey: ["reports", "trends", range.from, range.to, office ?? null],
    staleTime: TREND_STALE,
    enabled,
    queryFn: async () => {
      const [procs, pays, pats] = await Promise.all([
        fetchAllPages(
          (page, size) =>
            listPatientProcedures({
              date_of_service_from: range.from,
              date_of_service_to: range.to,
              is_void: false,
              page,
              size,
            }),
          { maxPages: 4 },
        ),
        fetchAllPages(
          (page, size) =>
            listPatientPayments({
              payment_date_from: range.from,
              payment_date_to: range.to,
              is_void: false,
              page,
              size,
            }),
          { maxPages: 4 },
        ),
        fetchAllPages(
          (page, size) =>
            listPatients({
              created_at_from: range.from,
              created_at_to: range.to,
              home_office_id: office ?? null,
              page,
              size,
            }),
          { maxPages: 4 },
        ),
      ]);

      const buckets = new Map<string, TrendPoint>();
      const ensure = (key: string): TrendPoint => {
        let b = buckets.get(key);
        if (!b) {
          b = { key, label: bucketLabel(key, g), production: 0, collections: 0, newPatients: 0 };
          buckets.set(key, b);
        }
        return b;
      };

      const procDist = new Map<string, number>();
      for (const p of procs.items) {
        if (office != null && p.office_id !== office) continue;
        const d = p.date_of_service?.slice(0, 10);
        const fee = parseDecimal(p.fee);
        if (d) ensure(bucketKey(d, g)).production += fee;
        const code = (p.procedure_code ?? "—").trim() || "—";
        procDist.set(code, (procDist.get(code) ?? 0) + fee);
      }
      for (const p of pays.items) {
        if (office != null && p.office_id !== office) continue;
        const d = p.payment_date?.slice(0, 10);
        if (d) ensure(bucketKey(d, g)).collections += parseDecimal(p.amount);
      }
      for (const p of pats.items) {
        const d = p.created_at?.slice(0, 10);
        if (d) ensure(bucketKey(d, g)).newPatients += 1;
      }

      const series = Array.from(buckets.values()).sort((a, b) => (a.key < b.key ? -1 : 1));

      // Top-N procedure codes by fee, remainder grouped into "Other".
      const sorted = Array.from(procDist.entries()).sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, TOP_PROCEDURES).map(([name, value]) => ({ name, value }));
      const rest = sorted.slice(TOP_PROCEDURES).reduce((s, [, v]) => s + v, 0);
      const procedureDist = rest > 0 ? [...top, { name: "Other", value: rest }] : top;

      return {
        series,
        procedureDist,
        granularity: g,
        truncated: procs.truncated || pays.truncated || pats.truncated,
      };
    },
  });
}

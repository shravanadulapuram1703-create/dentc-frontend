// Aggregation hooks for dashboard KPI/analytics widgets. Each runs as a single
// React Query entry whose queryFn pages the underlying list endpoint and reduces
// it client-side (the backend has no roll-up endpoints).
import { useQuery } from "@tanstack/react-query";
import { listPatientPayments } from "@/api/generated/endpoints/billing/billing";
import { listPatientProcedures } from "@/api/generated/endpoints/clinical/clinical";
import { listPatientRecalls } from "@/api/generated/endpoints/patients/patients";
import { listAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { listPatients } from "@/api/generated/endpoints/patients/patients";
import {
  parseDecimal,
  fetchAllPages,
  isoOf,
  addDays,
  startOfMonth,
} from "./aggregate";
import { toOfficeId } from "./useDashboardData";

const today = () => isoOf(new Date());
const DEFAULT_STALE = 60_000;

// ---------------------------------------------------------------------------
// Collections today (patient-payments, summed)
// ---------------------------------------------------------------------------

export function useCollectionToday(currentOffice?: string) {
  const office = toOfficeId(currentOffice);
  const date = today();
  return useQuery({
    queryKey: ["dashboard", "collection-today", date, office ?? null],
    staleTime: DEFAULT_STALE,
    queryFn: async () => {
      const { items, truncated } = await fetchAllPages((page, size) =>
        listPatientPayments({
          payment_date_from: date,
          payment_date_to: date,
          is_void: false,
          page,
          size,
        }),
      );
      const rows = office != null ? items.filter((p) => p.office_id === office) : items;
      const amount = rows.reduce((s, p) => s + parseDecimal(p.amount), 0);
      return { amount, count: rows.length, truncated };
    },
  });
}

// ---------------------------------------------------------------------------
// Completed (posted) production today (patient-procedures, non-void, summed)
// ---------------------------------------------------------------------------

export function useCompletedProductionToday(currentOffice?: string) {
  const office = toOfficeId(currentOffice);
  const date = today();
  return useQuery({
    queryKey: ["dashboard", "production-today", date, office ?? null],
    staleTime: DEFAULT_STALE,
    queryFn: async () => {
      const { items, truncated } = await fetchAllPages((page, size) =>
        listPatientProcedures({
          date_of_service_from: date,
          date_of_service_to: date,
          is_void: false,
          page,
          size,
        }),
      );
      const rows = office != null ? items.filter((p) => p.office_id === office) : items;
      const amount = rows.reduce((s, p) => s + parseDecimal(p.fee), 0);
      return { amount, count: rows.length, truncated };
    },
  });
}

// ---------------------------------------------------------------------------
// Revenue: daily / weekly / monthly (one MTD-or-7d fetch, bucketed)
// ---------------------------------------------------------------------------

export function useRevenue(currentOffice?: string) {
  const office = toOfficeId(currentOffice);
  const date = today();
  const monthStart = startOfMonth(date);
  const weekStart = addDays(date, -6);
  const rangeStart = weekStart < monthStart ? weekStart : monthStart;
  return useQuery({
    queryKey: ["dashboard", "revenue", date, office ?? null],
    staleTime: DEFAULT_STALE,
    queryFn: async () => {
      const { items, truncated } = await fetchAllPages(
        (page, size) =>
          listPatientPayments({
            payment_date_from: rangeStart,
            payment_date_to: date,
            is_void: false,
            page,
            size,
          }),
        { maxPages: 8 },
      );
      const rows = office != null ? items.filter((p) => p.office_id === office) : items;
      let daily = 0;
      let weekly = 0;
      let monthly = 0;
      for (const p of rows) {
        const amt = parseDecimal(p.amount);
        const d = p.payment_date?.slice(0, 10) ?? "";
        if (d === date) daily += amt;
        if (d >= weekStart) weekly += amt;
        if (d >= monthStart) monthly += amt;
      }
      return { daily, weekly, monthly, truncated };
    },
  });
}

// ---------------------------------------------------------------------------
// Recalls due (active recalls, bucketed by due_date client-side)
// ---------------------------------------------------------------------------

export function useRecallDue(currentOffice?: string) {
  const office = toOfficeId(currentOffice);
  const date = today();
  const weekEnd = addDays(date, 7);
  const monthEnd = addDays(date, 30);
  return useQuery({
    queryKey: ["dashboard", "recall-due", date, office ?? null],
    staleTime: DEFAULT_STALE,
    queryFn: async () => {
      const { items, truncated } = await fetchAllPages(
        (page, size) => listPatientRecalls({ is_active: true, sort: "due_date", order: "asc", page, size }),
        { maxPages: 8 },
      );
      const rows = office != null ? items.filter((r) => r.office_id == null || r.office_id === office) : items;
      let overdue = 0;
      let dueToday = 0;
      let dueWeek = 0;
      let dueMonth = 0;
      const dueList: typeof rows = [];
      for (const r of rows) {
        const d = r.due_date?.slice(0, 10);
        if (!d) continue;
        if (d < date) {
          overdue += 1;
          dueList.push(r);
        } else if (d === date) {
          dueToday += 1;
          dueList.push(r);
        } else if (d <= weekEnd) {
          dueWeek += 1;
          dueList.push(r);
        } else if (d <= monthEnd) {
          dueMonth += 1;
        }
      }
      return { overdue, dueToday, dueWeek, dueMonth, truncated, dueList: dueList.slice(0, 8) };
    },
  });
}

// ---------------------------------------------------------------------------
// Analytics time-series (appointments / collections / new patients per day)
// ---------------------------------------------------------------------------

export interface DayPoint {
  date: string;
  appointments: number;
  collections: number;
  newPatients: number;
}

export function useAnalyticsSeries(
  currentOffice: string | undefined,
  days: number,
  enabled: boolean,
) {
  const office = toOfficeId(currentOffice);
  const end = today();
  const start = addDays(end, -(days - 1));
  return useQuery({
    queryKey: ["dashboard", "analytics", start, end, office ?? null],
    staleTime: 5 * 60_000,
    // Opt-in: the backend has no trends endpoint and list queries are slow on
    // large datasets, so we only run this fan-out when the user asks for it.
    enabled,
    queryFn: async () => {
      // Bound the fan-out: list endpoints are slow, so cap pages and surface
      // truncation rather than paging an entire (possibly huge) result set.
      const [appts, pays, pats] = await Promise.all([
        fetchAllPages(
          (page, size) =>
            // Deleted appointments are only archived, and the list endpoint returns
            // them unless asked not to (gap SCHED-DEL-1).
            listAppointments({
              date_from: start,
              date_to: end,
              office_id: office ?? null,
              is_archived: false,
              page,
              size,
            }),
          { maxPages: 3 },
        ),
        fetchAllPages(
          (page, size) =>
            listPatientPayments({ payment_date_from: start, payment_date_to: end, is_void: false, page, size }),
          { maxPages: 3 },
        ),
        fetchAllPages(
          (page, size) =>
            listPatients({ created_at_from: start, created_at_to: end, home_office_id: office ?? null, page, size }),
          { maxPages: 3 },
        ),
      ]);

      const buckets = new Map<string, DayPoint>();
      let cur = start;
      while (cur <= end) {
        buckets.set(cur, { date: cur, appointments: 0, collections: 0, newPatients: 0 });
        cur = addDays(cur, 1);
      }

      for (const a of appts.items) {
        if (a.is_cancelled || a.is_blocked) continue;
        const b = buckets.get(a.date?.slice(0, 10) ?? "");
        if (b) b.appointments += 1;
      }
      for (const p of pays.items) {
        if (office != null && p.office_id !== office) continue;
        const b = buckets.get(p.payment_date?.slice(0, 10) ?? "");
        if (b) b.collections += parseDecimal(p.amount);
      }
      for (const p of pats.items) {
        const b = buckets.get(p.created_at?.slice(0, 10) ?? "");
        if (b) b.newPatients += 1;
      }

      return {
        series: Array.from(buckets.values()),
        truncated: appts.truncated || pays.truncated || pats.truncated,
      };
    },
  });
}

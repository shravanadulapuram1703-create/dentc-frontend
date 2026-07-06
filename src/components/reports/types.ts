// Declarative report-runner model. A `ReportDefinition` describes ONE report:
// which filters it exposes, its table columns, how to fetch/aggregate its rows,
// and its summary cards + optional chart. The generic ReportShell renders any
// definition, so adding a report is just adding a definition file — no new UI.
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { KpiTone } from "../dashboard/components/KpiStat";
import type { DateRange, RangePreset } from "./lib/reportRange";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/** Built-in filter controls a report can opt into (rendered by ReportFilterPanel). */
export type FilterKind = "dateRange" | "office" | "provider" | "status" | "search";

export interface SelectOption {
  value: string;
  label: string;
}

/** A report-specific extra <select> filter beyond the built-ins. */
export interface ExtraFilter {
  key: string;
  label: string;
  options: SelectOption[];
  /** Default selected value (""/omitted = "All"). */
  defaultValue?: string;
}

/** Resolved filter state handed to a report's `fetch`. */
export interface ReportFilters {
  preset: RangePreset;
  range: DateRange;
  /** Resolved numeric office id, or null for "all offices". */
  office: number | null;
  /** Provider id as a string ("" = all). */
  provider: string;
  /** Selected status value ("" = all). */
  status: string;
  /** Free-text server-side search ("" = none). */
  search: string;
  /** Values for the report's `extraFilters`, keyed by ExtraFilter.key. */
  extra: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export type CellAlign = "left" | "right" | "center";

export interface ColumnDef<Row> {
  key: string;
  header: string;
  align?: CellAlign;
  /** Raw scalar used for sorting + CSV/Excel/PDF export. */
  accessor: (row: Row) => string | number | null | undefined;
  /** Optional rich cell for the on-screen table (badges, links). Falls back to accessor. */
  render?: (row: Row) => ReactNode;
  /** Format the exported/plain value (e.g. currency). Defaults to String(accessor). */
  format?: (row: Row) => string;
  sortable?: boolean; // default true
  /** Sum this column into the table footer. */
  total?: boolean;
  /** Marks a money column (right-align + currency-formatted totals). */
  currency?: boolean;
  /** PDF column width hint (pt). */
  pdfWidth?: number;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface SummaryCard {
  label: string;
  value: string;
  tone?: KpiTone;
  hint?: string;
  icon?: ReactNode;
}

export interface ChartSeriesPoint {
  label: string;
  value: number;
  /** Optional second measure (e.g. collections alongside production). */
  value2?: number;
  // recharts Pie/Bar data requires an index signature.
  [key: string]: string | number | undefined;
}

export interface ChartSpec {
  kind: "bar" | "pie";
  title: string;
  data: ChartSeriesPoint[];
  currency?: boolean;
  /** Legend labels for bar charts with two measures. */
  seriesLabels?: [string, string];
}

export interface ReportData<Row> {
  rows: Row[];
  summary: SummaryCard[];
  chart?: ChartSpec;
  /** True when the underlying fan-out was capped (surfaced honestly to the user). */
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export type ReportCategory =
  | "Financial"
  | "Patient"
  | "Appointment"
  | "Clinical"
  | "Insurance";

export interface ReportDefinition<Row = Record<string, unknown>> {
  /** URL slug — /reports/run/:id */
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  icon: LucideIcon;
  /** Built-in filters to show. `dateRange` also drives the fetch window. */
  filters: FilterKind[];
  /** Options for the `status` filter (when `filters` includes "status"). */
  statusOptions?: SelectOption[];
  /** Extra report-specific <select> filters. */
  extraFilters?: ExtraFilter[];
  columns: ColumnDef<Row>[];
  /** Default date-range preset when the report opens. */
  defaultPreset?: RangePreset;
  /** Fetch + aggregate rows for the current filters. */
  fetch: (filters: ReportFilters) => Promise<ReportData<Row>>;
}

/**
 * Row-type-erased definition for the registry + generic runner, which hold
 * definitions of many different row shapes together. Concrete
 * `ReportDefinition<SpecificRow>` values are assignable to this.
 */
export type AnyReportDefinition = ReportDefinition<any>;

// Production Report — procedures rendered/charged over a date range, by office &
// provider. Backed by listPatientProcedures (no aggregation endpoint — see
// docs/reports/reports_backend_devreport.md gap #1), aggregated client-side.
import { TrendingUp } from "lucide-react";
import { listPatientProcedures } from "@/api/generated/endpoints/clinical/clinical";
import type { PatientProcedureRead } from "@/api/generated/model";
import { fetchAllPages, parseDecimal, formatCurrency } from "../../dashboard/lib/aggregate";
import { loadProviderMap } from "../lib/useReportRefData";
import { fmtDate, money, timeSeries } from "./helpers";
import type { ReportDefinition } from "../types";

type Row = PatientProcedureRead & { _provider?: string };

export const productionReport: ReportDefinition<Row> = {
  id: "production",
  title: "Production Report",
  description: "Procedures charged over a period, by office and provider.",
  category: "Financial",
  icon: TrendingUp,
  filters: ["dateRange", "office", "provider", "search"],
  defaultPreset: "this_month",
  columns: [
    { key: "date", header: "Date", accessor: (r) => r.date_of_service, format: (r) => fmtDate(r.date_of_service) },
    { key: "patient", header: "Patient ID", accessor: (r) => r.patient_id, align: "right" },
    { key: "provider", header: "Provider", accessor: (r) => r._provider ?? r.provider_id },
    { key: "code", header: "Code", accessor: (r) => r.procedure_code },
    { key: "tooth", header: "Tooth", accessor: (r) => r.tooth ?? "", align: "center" },
    { key: "surface", header: "Surface", accessor: (r) => r.surface ?? "", align: "center" },
    { key: "status", header: "Billing", accessor: (r) => r.billing_status },
    { key: "estIns", header: "Est Ins", accessor: (r) => parseDecimal(r.insurance_estimate), format: (r) => money(r.insurance_estimate), currency: true },
    { key: "fee", header: "Fee", accessor: (r) => parseDecimal(r.fee), format: (r) => money(r.fee), currency: true, total: true },
  ],
  fetch: async (f) => {
    const [page, providerMap] = await Promise.all([
      fetchAllPages((p, size) =>
        listPatientProcedures({
          date_of_service_from: f.range.from,
          date_of_service_to: f.range.to,
          office_id: f.office,
          provider_id: f.provider || null,
          search: f.search || null,
          is_void: false,
          page: p,
          size,
        }),
      ),
      loadProviderMap(f.office),
    ]);

    const rows: Row[] = page.items.map((r) => ({ ...r, _provider: providerMap.get(r.provider_id) }));
    const total = rows.reduce((s, r) => s + parseDecimal(r.fee), 0);
    const { data } = timeSeries(rows, f.range, (r) => r.date_of_service, (r) => parseDecimal(r.fee));

    return {
      rows,
      truncated: page.truncated,
      summary: [
        { label: "Total Production", value: formatCurrency(total), tone: "blue" },
        { label: "Procedures", value: rows.length.toLocaleString(), tone: "slate" },
        { label: "Avg Fee", value: formatCurrency(rows.length ? total / rows.length : 0), tone: "teal" },
      ],
      chart: { kind: "bar", title: "Production over time", data, currency: true },
    };
  },
};

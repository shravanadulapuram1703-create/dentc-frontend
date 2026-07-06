// Collections Report — payments received over a date range, by office & provider.
// Backed by listPatientPayments (client-side aggregation; devreport gap #1).
import { Banknote } from "lucide-react";
import { listPatientPayments } from "@/api/generated/endpoints/billing/billing";
import type { PatientPaymentRead } from "@/api/generated/model";
import { fetchAllPages, parseDecimal, formatCurrency } from "../../dashboard/lib/aggregate";
import { loadProviderMap } from "../lib/useReportRefData";
import { fmtDate, money, timeSeries } from "./helpers";
import type { ReportDefinition } from "../types";

type Row = PatientPaymentRead & { _provider?: string };

export const collectionsReport: ReportDefinition<Row> = {
  id: "collections",
  title: "Collections Report",
  description: "Payments received over a period, by office and provider.",
  category: "Financial",
  icon: Banknote,
  filters: ["dateRange", "office", "provider", "search"],
  defaultPreset: "this_month",
  columns: [
    { key: "date", header: "Date", accessor: (r) => r.payment_date, format: (r) => fmtDate(r.payment_date) },
    { key: "patient", header: "Patient ID", accessor: (r) => r.patient_id, align: "right" },
    { key: "provider", header: "Provider", accessor: (r) => r._provider ?? r.provider_id ?? "" },
    { key: "type", header: "Type", accessor: (r) => r.payment_type },
    { key: "method", header: "Method", accessor: (r) => r.payment_method ?? "" },
    { key: "check", header: "Check #", accessor: (r) => r.check_number ?? "" },
    { key: "amount", header: "Amount", accessor: (r) => parseDecimal(r.amount), format: (r) => money(r.amount), currency: true, total: true },
  ],
  fetch: async (f) => {
    const [page, providerMap] = await Promise.all([
      fetchAllPages((p, size) =>
        listPatientPayments({
          payment_date_from: f.range.from,
          payment_date_to: f.range.to,
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

    const rows: Row[] = page.items.map((r) => ({
      ...r,
      _provider: r.provider_id ? providerMap.get(r.provider_id) : undefined,
    }));
    const total = rows.reduce((s, r) => s + parseDecimal(r.amount), 0);
    const { data } = timeSeries(rows, f.range, (r) => r.payment_date, (r) => parseDecimal(r.amount));

    return {
      rows,
      truncated: page.truncated,
      summary: [
        { label: "Total Collections", value: formatCurrency(total), tone: "teal" },
        { label: "Payments", value: rows.length.toLocaleString(), tone: "slate" },
        { label: "Avg Payment", value: formatCurrency(rows.length ? total / rows.length : 0), tone: "blue" },
      ],
      chart: { kind: "bar", title: "Collections over time", data, currency: true },
    };
  },
};

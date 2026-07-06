// Insurance Claims Report — claims by office & status with billed/paid/
// outstanding. Backed by listInsuranceClaims. `status` is free-form in the schema
// (devreport gap #5), so the status options are best-effort.
import { ShieldCheck } from "lucide-react";
import { listInsuranceClaims } from "@/api/generated/endpoints/billing/billing";
import type { InsuranceClaimRead } from "@/api/generated/model";
import { fetchAllPages, parseDecimal, formatCurrency } from "../../dashboard/lib/aggregate";
import { fmtDate, money, distribution } from "./helpers";
import type { ReportDefinition } from "../types";

const outstanding = (r: InsuranceClaimRead) => parseDecimal(r.total_billed) - parseDecimal(r.total_paid);

export const insuranceClaimReport: ReportDefinition<InsuranceClaimRead> = {
  id: "insurance-claims",
  title: "Insurance Claims Report",
  description: "Claims by office and status, with billed / paid / outstanding.",
  category: "Insurance",
  icon: ShieldCheck,
  filters: ["office", "status", "search"],
  statusOptions: [
    { value: "submitted", label: "Submitted" },
    { value: "accepted", label: "Accepted" },
    { value: "paid", label: "Paid" },
    { value: "denied", label: "Denied" },
    { value: "rejected", label: "Rejected" },
    { value: "pending", label: "Pending" },
  ],
  extraFilters: [
    {
      key: "active",
      label: "Claim state",
      defaultValue: "active",
      options: [
        { value: "active", label: "Active only" },
        { value: "inactive", label: "Inactive only" },
        { value: "all", label: "All" },
      ],
    },
  ],
  columns: [
    { key: "claim", header: "Claim #", accessor: (r) => r.claim_number },
    { key: "patient", header: "Patient ID", accessor: (r) => r.patient_id, align: "right" },
    { key: "type", header: "Type", accessor: (r) => (r.claim_type || "").replace(/_/g, " ") },
    { key: "status", header: "Status", accessor: (r) => (r.status || "").replace(/_/g, " ") },
    { key: "submitted", header: "Submitted", accessor: (r) => r.submitted_date ?? "", format: (r) => fmtDate(r.submitted_date) },
    { key: "billed", header: "Billed", accessor: (r) => parseDecimal(r.total_billed), format: (r) => money(r.total_billed), currency: true, total: true },
    { key: "paid", header: "Paid", accessor: (r) => parseDecimal(r.total_paid), format: (r) => money(r.total_paid), currency: true, total: true },
    { key: "outstanding", header: "Outstanding", accessor: (r) => outstanding(r), format: (r) => formatCurrency(outstanding(r)), currency: true, total: true },
  ],
  fetch: async (f) => {
    const state = f.extra.active ?? "active";
    const is_active = state === "active" ? true : state === "inactive" ? false : null;
    const page = await fetchAllPages(
      (p, size) =>
        listInsuranceClaims({
          office_id: f.office,
          status: f.status || null,
          search: f.search || null,
          is_active,
          page: p,
          size,
        }),
      { maxPages: 8 },
    );
    const rows = page.items;
    const billed = rows.reduce((s, r) => s + parseDecimal(r.total_billed), 0);
    const paid = rows.reduce((s, r) => s + parseDecimal(r.total_paid), 0);

    return {
      rows,
      truncated: page.truncated,
      summary: [
        { label: "Claims", value: page.total.toLocaleString(), tone: "blue" },
        { label: "Total Billed", value: formatCurrency(billed), tone: "slate" },
        { label: "Total Paid", value: formatCurrency(paid), tone: "teal" },
        { label: "Outstanding", value: formatCurrency(billed - paid), tone: "amber" },
      ],
      chart: { kind: "pie", title: "By status", data: distribution(rows, (r) => (r.status || "—").replace(/_/g, " ")) },
    };
  },
};

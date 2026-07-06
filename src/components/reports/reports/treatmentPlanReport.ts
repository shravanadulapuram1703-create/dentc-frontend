// Treatment Plan Report — treatment plans by office and status. Backed by
// listTreatmentPlans. Plan-level totals live on the items resource (per-plan
// fetch = N+1), so this report stays at plan granularity; item roll-ups are a
// backend-aggregation gap (devreport gap #1).
import { Stethoscope } from "lucide-react";
import { listTreatmentPlans } from "@/api/generated/endpoints/treatment-plans/treatment-plans";
import type { TreatmentPlanRead } from "@/api/generated/model";
import { fetchAllPages } from "../../dashboard/lib/aggregate";
import { fmtDate, distribution } from "./helpers";
import type { ReportDefinition } from "../types";

export const treatmentPlanReport: ReportDefinition<TreatmentPlanRead> = {
  id: "treatment-plans",
  title: "Treatment Plan Report",
  description: "Treatment plans by office and status.",
  category: "Clinical",
  icon: Stethoscope,
  filters: ["office", "status", "search"],
  statusOptions: [
    { value: "proposed", label: "Proposed" },
    { value: "accepted", label: "Accepted" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" },
  ],
  columns: [
    { key: "id", header: "Plan ID", accessor: (r) => r.id },
    { key: "patient", header: "Patient ID", accessor: (r) => r.patient_id, align: "right" },
    { key: "name", header: "Plan Name", accessor: (r) => r.name },
    { key: "status", header: "Status", accessor: (r) => (r.status || "").replace(/_/g, " ") },
    { key: "created", header: "Created", accessor: (r) => r.created_at, format: (r) => fmtDate(r.created_at) },
  ],
  fetch: async (f) => {
    const page = await fetchAllPages(
      (p, size) =>
        listTreatmentPlans({
          office_id: f.office,
          status: f.status || null,
          search: f.search || null,
          page: p,
          size,
        }),
      { maxPages: 8 },
    );
    const rows = page.items;

    return {
      rows,
      truncated: page.truncated,
      summary: [
        { label: "Plans", value: page.total.toLocaleString(), tone: "blue" },
        { label: "Loaded", value: rows.length.toLocaleString(), tone: "slate" },
        { label: "Statuses", value: new Set(rows.map((r) => r.status)).size.toLocaleString(), tone: "teal" },
      ],
      chart: { kind: "pie", title: "By status", data: distribution(rows, (r) => (r.status || "—").replace(/_/g, " ")) },
    };
  },
};

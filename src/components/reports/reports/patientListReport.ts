// Patient List Report — roster for an office with active/inactive filtering and
// keyword search. Backed by listPatients.
import { Users } from "lucide-react";
import { listPatients } from "@/api/generated/endpoints/patients/patients";
import type { PatientRead } from "@/api/generated/model";
import { fetchAllPages } from "../../dashboard/lib/aggregate";
import { fmtDate } from "./helpers";
import type { ReportDefinition } from "../types";

function patientName(r: PatientRead): string {
  const name = [r.last_name, r.first_name].filter(Boolean).join(", ");
  return name || r.preferred_name || `Patient ${r.id}`;
}

export const patientListReport: ReportDefinition<PatientRead> = {
  id: "patient-list",
  title: "Patient List",
  description: "Patient roster by office, with active status and demographics.",
  category: "Patient",
  icon: Users,
  filters: ["office", "status", "search"],
  statusOptions: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],
  columns: [
    { key: "id", header: "Pat ID", accessor: (r) => r.id, align: "right" },
    { key: "chart", header: "Chart #", accessor: (r) => r.chart_no ?? "" },
    { key: "name", header: "Patient", accessor: (r) => patientName(r) },
    { key: "dob", header: "DOB", accessor: (r) => r.dob ?? "", format: (r) => fmtDate(r.dob) },
    { key: "phone", header: "Phone", accessor: (r) => r.cell_phone || r.phone || "" },
    { key: "email", header: "Email", accessor: (r) => r.email ?? "" },
    { key: "city", header: "City", accessor: (r) => [r.city, r.state].filter(Boolean).join(", ") },
    { key: "status", header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
    { key: "created", header: "Added", accessor: (r) => r.created_at, format: (r) => fmtDate(r.created_at) },
  ],
  fetch: async (f) => {
    const is_active = f.status === "active" ? true : f.status === "inactive" ? false : null;
    const page = await fetchAllPages(
      (p, size) =>
        listPatients({
          home_office_id: f.office,
          is_active,
          search: f.search || null,
          page: p,
          size,
        }),
      { maxPages: 8 },
    );
    const rows = page.items;
    const active = rows.filter((r) => r.is_active).length;

    return {
      rows,
      truncated: page.truncated,
      summary: [
        { label: "Patients", value: page.total.toLocaleString(), tone: "blue", hint: page.truncated ? "showing first pages" : undefined },
        { label: "Active", value: active.toLocaleString(), tone: "teal" },
        { label: "Inactive", value: (rows.length - active).toLocaleString(), tone: "slate" },
      ],
      chart: {
        kind: "pie",
        title: "Active vs inactive (loaded page)",
        data: [
          { label: "Active", value: active },
          { label: "Inactive", value: rows.length - active },
        ],
      },
    };
  },
};

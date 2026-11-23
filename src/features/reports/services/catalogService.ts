// Catalog read of the report engine (GET /reports/catalog, operation `list_report_catalog`).
//
// INTERIM (until contract point C1 of 11_frontend_plan.md §3.4): the engine operation is not in
// the generated client yet, so this calls the generated client's own mutator (`customInstance`,
// same axios instance, auth and 401 handling). After `npm run api:sync` against a backend with
// ENG-01/ENG-05, replace the body with the generated `listReportCatalog` and drop the local types.
import { customInstance } from "@/api/mutator/axiosInstance";

export interface ReportCatalogEntry {
  report_key: string;
  title: string;
  category: string;
  phase: string;
}

export interface ReportCatalog {
  reports: ReportCatalogEntry[];
}

export function fetchReportCatalog(signal?: AbortSignal): Promise<ReportCatalog> {
  return customInstance<ReportCatalog>({ url: "/api/v1/reports/catalog", method: "GET", signal, timeout: 15_000 });
}

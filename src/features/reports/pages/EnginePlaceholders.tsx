import { Link, useParams } from "react-router-dom";
import type { ReportCatalog } from "../services/catalogService";

// Engine `on` placeholders until the walking skeleton builds the real pages (S7: UX-05 hub,
// UX-07 runner, UX-06 classic frame). Visible only where REPORTS_ENGINE_ENABLED is on.

export function HubPlaceholder({ catalog }: { catalog: ReportCatalog | undefined }) {
  const reports = catalog?.reports ?? [];
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-800">Reports</h1>
      {reports.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No reports are available to you yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {reports.map((r) => (
            <li key={r.report_key} className="px-4 py-2 text-sm">
              <Link to={`/reports/r/${r.report_key}`} className="font-medium text-[#1F3A5F] hover:underline">
                {r.title}
              </Link>
              <span className="ml-2 text-xs text-slate-500">{r.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RunnerPlaceholder() {
  const { report_key, category } = useParams();
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-800">{report_key ?? category}</h1>
      <p className="mt-2 text-sm text-slate-600">The report runner arrives with the next build step.</p>
      <Link to="/reports" className="mt-4 inline-block text-sm text-[#1F3A5F] underline">
        Back to Reports
      </Link>
    </div>
  );
}

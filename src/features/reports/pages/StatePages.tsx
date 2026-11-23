import { Link } from "react-router-dom";

// Small full-page states of the Reports module (07 §2.3, §4.3).

function Panel({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      {children}
    </div>
  );
}

export function ReportsPageSkeleton() {
  return (
    <div className="mx-auto mt-10 max-w-5xl space-y-4 px-6" aria-busy="true" aria-label="Loading reports">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}

export function ReportsNotFoundPage() {
  return (
    <Panel title="Report page not found">
      <p className="mt-2 text-sm text-slate-600">This address does not match any report page.</p>
      <Link to="/reports" className="mt-4 inline-block text-sm font-medium text-[#1F3A5F] underline">
        Go to Reports Home
      </Link>
    </Panel>
  );
}

export function ReportsUnavailablePage({ missing, showDetails }: { missing: string[]; showDetails: boolean }) {
  return (
    <Panel title="Reports are not available">
      <p className="mt-2 text-sm text-slate-600">
        The reports service is not configured correctly for this environment. Please contact your administrator.
      </p>
      {showDetails && missing.length > 0 && (
        <ul className="mt-3 list-disc text-left text-xs text-slate-500">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ReportsLoadFailedPage({ onRetry }: { onRetry: () => void }) {
  return (
    <Panel title="Reports could not be loaded">
      <p className="mt-2 text-sm text-slate-600">The reports service did not answer. Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-[#1F3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#162b47]"
      >
        Retry
      </button>
    </Panel>
  );
}

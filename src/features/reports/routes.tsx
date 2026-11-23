// Lazy chunk root of the Reports module (07 §2.1-§2.3). The engine state decides the route set.
import { lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SUPER_ROLES } from "@/features/access-control/rights";
import { useEngineAvailable } from "./engine/useEngineAvailable";
import "./styles/reports.css";
import { RptTooltipProvider } from "./ui/RptPopover";
import {
  ENGINE_OFF_REDIRECTS,
  ENGINE_ON_REDIRECTS,
  engineReportPath,
} from "./legacyRedirects";
import { HubPlaceholder, RunnerPlaceholder } from "./pages/EnginePlaceholders";
import {
  ReportsLoadFailedPage,
  ReportsNotFoundPage,
  ReportsPageSkeleton,
  ReportsUnavailablePage,
} from "./pages/StatePages";

// Today's pages: used only while the engine is `off` (fallback, 07 §11).
const LegacyReportsHome = lazy(() => import("@/components/pages/Reports"));
const LegacyReportRunner = lazy(
  () => import("@/components/reports/pages/ReportRunnerPage"),
);

export interface ReportsRouteProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

function LegacyIdRedirect() {
  const { reportId } = useParams<{ reportId: string }>();
  return <Navigate to={engineReportPath(reportId)} replace />;
}

export default function ReportsRoutes(props: ReportsRouteProps) {
  const engine = useEngineAvailable();
  const { user } = useAuth();

  if (engine.state === "unknown") {
    return engine.isLoading ? (
      <ReportsPageSkeleton />
    ) : (
      <ReportsLoadFailedPage onRetry={engine.retry} />
    );
  }

  if (engine.state === "misconfigured") {
    const isAdmin = !!user && SUPER_ROLES.includes(user.role);
    return (
      <ReportsUnavailablePage missing={engine.missing} showDetails={isAdmin} />
    );
  }

  if (engine.state === "off") {
    return (
      <Routes>
        <Route index element={<LegacyReportsHome {...props} />} />
        <Route
          path="run/:reportId"
          element={<LegacyReportRunner {...props} />}
        />
        {ENGINE_OFF_REDIRECTS.map((r) => (
          <Route
            key={r.from}
            path={r.from}
            element={<Navigate to={r.to} replace />}
          />
        ))}
        <Route path="*" element={<Navigate to="/reports" replace />} />
      </Routes>
    );
  }

  return (
    // The module root: CSS container for @rpt-* layouts and the scope of the print sheet (07 §9.8, §9.9).
    <div className="rpt-root">
      <RptTooltipProvider>
        <Routes>
          <Route index element={<HubPlaceholder catalog={engine.catalog} />} />
          <Route path="r/:report_key" element={<RunnerPlaceholder />} />
          <Route path="c/:category" element={<RunnerPlaceholder />} />
          <Route path="run/:reportId" element={<LegacyIdRedirect />} />
          {ENGINE_ON_REDIRECTS.map((r) => (
            <Route
              key={r.from}
              path={r.from}
              element={<Navigate to={r.to} replace />}
            />
          ))}
          <Route path="*" element={<ReportsNotFoundPage />} />
        </Routes>
      </RptTooltipProvider>
    </div>
  );
}

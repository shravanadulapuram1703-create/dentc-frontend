// Route target for /reports/run/:reportId — resolves the report definition from
// the catalog and hands it to the generic ReportShell. Unknown ids bounce back to
// the Reports home.
import { useParams, Navigate } from "react-router-dom";
import { useOfficeScope } from "@/features/office-scope";
import { getReport } from "../reportCatalog";
import ReportShell from "../components/ReportShell";

interface Props {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

// onLogout/setCurrentOffice come from the route wrapper; page chrome (GlobalNav +
// offset) is rendered by AdminPageWrapper, so only currentOffice is consumed here.
export default function ReportRunnerPage({ currentOffice }: Props) {
  const { reportId } = useParams<{ reportId: string }>();
  // The shell seeds BOTH its draft and its applied filters in useState
  // initializers, so an office switch must remount it (key) to re-seed the
  // office filter — otherwise the report keeps running for the previous office.
  const { office_id } = useOfficeScope();
  const def = reportId ? getReport(reportId) : undefined;
  if (!def) return <Navigate to="/reports" replace />;
  return <ReportShell key={office_id ?? "none"} def={def} currentOffice={currentOffice} />;
}

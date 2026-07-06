import { useNavigate } from "react-router-dom";
import AppShell from "./layout/AppShell";
import type { UserRole } from "../contexts/AuthContext.js";
import DashboardHeader from "./dashboard/widgets/DashboardHeader";
import GlobalSearchWidget from "./dashboard/widgets/GlobalSearchWidget";
import TodaysAppointmentsKpi from "./dashboard/widgets/TodaysAppointmentsKpi";
import PatientsKpi from "./dashboard/widgets/PatientsKpi";
import ProductionCollectionKpi from "./dashboard/widgets/ProductionCollectionKpi";
import RevenueKpi from "./dashboard/widgets/RevenueKpi";
import TodaysScheduleWidget from "./dashboard/widgets/TodaysScheduleWidget";
import PatientActivityWidget from "./dashboard/widgets/PatientActivityWidget";
import QuickActionsPanel from "./dashboard/widgets/QuickActionsPanel";
import AnalyticsWidget from "./dashboard/widgets/AnalyticsWidget";
import { roleBucket } from "./dashboard/lib/dashboardUtils";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
  isActive?: boolean;
}

interface DashboardProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
  user: User | null;
}

type WidgetKey = "schedule" | "activity" | "search" | "quickActions";

/**
 * Role-aware widget ordering. Front-desk leads with schedule + search; the
 * clinical persona leads with patients + quick actions; managers lead with
 * activity. (Manager/admin-specific revenue & productivity widgets arrive in a
 * later phase — see docs/dashboard/dashboard_backend_devreport.md.)
 */
function layoutForRole(role?: UserRole): { main: WidgetKey[]; side: WidgetKey[] } {
  switch (roleBucket(role)) {
    case "dentist":
      return { main: ["schedule", "activity"], side: ["quickActions", "search"] };
    case "manager":
      return { main: ["activity", "schedule"], side: ["quickActions", "search"] };
    case "admin":
      return { main: ["schedule", "activity"], side: ["search", "quickActions"] };
    case "front_desk":
    default:
      return { main: ["schedule", "activity"], side: ["search", "quickActions"] };
  }
}

export default function Dashboard({
  onLogout,
  currentOffice,
  setCurrentOffice,
  user,
}: DashboardProps) {
  const navigate = useNavigate();
  const { main, side } = layoutForRole(user?.role);

  const handleLogout = async () => {
    await onLogout();
    navigate("/login");
  };

  const renderWidget = (key: WidgetKey) => {
    switch (key) {
      case "schedule":
        return <TodaysScheduleWidget key={key} currentOffice={currentOffice} />;
      case "activity":
        return <PatientActivityWidget key={key} currentOffice={currentOffice} />;
      case "search":
        return <GlobalSearchWidget key={key} />;
      case "quickActions":
        return <QuickActionsPanel key={key} currentOffice={currentOffice} />;
      default:
        return null;
    }
  };

  return (
    <AppShell
      onLogout={handleLogout}
      currentOffice={currentOffice}
      setCurrentOffice={setCurrentOffice}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          <DashboardHeader userName={user?.name} role={user?.role} currentOffice={currentOffice} />

          <TodaysAppointmentsKpi currentOffice={currentOffice} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">{main.map(renderWidget)}</div>
            <div className="space-y-6">{side.map(renderWidget)}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            <PatientsKpi currentOffice={currentOffice} />
            <ProductionCollectionKpi currentOffice={currentOffice} />
            <RevenueKpi currentOffice={currentOffice} />
          </div>

          <AnalyticsWidget currentOffice={currentOffice} />
      </div>
    </AppShell>
  );
}

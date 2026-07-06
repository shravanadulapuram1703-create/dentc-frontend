// Utilities landing page. The legacy static tile mock has been replaced by the
// modern, categorized, searchable Utilities hub (RBAC-filtered, with favourites,
// recents, execution history and status indicators). See
// src/components/utilities/** and docs/utilities/.
import AppShell from '../layout/AppShell';
import UtilitiesDashboard from '../utilities/pages/UtilitiesDashboard';

interface UtilitiesProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function Utilities({ onLogout, currentOffice, setCurrentOffice }: UtilitiesProps) {
  return (
    <AppShell onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} bgClassName="bg-slate-50">
      <UtilitiesDashboard />
    </AppShell>
  );
}

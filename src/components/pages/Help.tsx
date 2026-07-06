// Help route. Renders the modern Help Center inside the standard app shell.
// The former static article/video lists were replaced by the searchable,
// categorized Help Center in src/components/help/**.
import AppShell from "../layout/AppShell";
import { HelpCenter } from "../help";

interface HelpProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function Help({ onLogout, currentOffice, setCurrentOffice }: HelpProps) {
  return (
    <AppShell
      onLogout={onLogout}
      currentOffice={currentOffice}
      setCurrentOffice={setCurrentOffice}
      bgClassName="bg-[#F7F9FC]"
    >
      <HelpCenter />
    </AppShell>
  );
}

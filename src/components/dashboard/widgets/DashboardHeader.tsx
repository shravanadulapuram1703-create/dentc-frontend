import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Clock, UserCircle2 } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext.js";
import type { UserRole } from "../../../contexts/AuthContext.js";
import { roleLabel } from "../lib/dashboardUtils";

interface DashboardHeaderProps {
  userName?: string;
  role?: UserRole;
  currentOffice: string;
}

/**
 * Executive header: greeting + identity + current office + live date/time clock.
 */
export default function DashboardHeader({ userName, role, currentOffice }: DashboardHeaderProps) {
  const { organizations, currentOrganization } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const officeName = useMemo(() => {
    const org = organizations.find((o) => o.id === currentOrganization);
    const office = org?.offices.find((o) => o.id === currentOffice);
    return office?.displayName || office?.name || currentOffice || "No office selected";
  }, [organizations, currentOrganization, currentOffice]);

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
            <UserCircle2 className="w-8 h-8 text-white" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">
              {greeting}, {userName || "there"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white/85 text-sm font-medium">
              <span className="inline-flex items-center gap-1.5">
                <UserCircle2 className="w-4 h-4" /> {roleLabel(role)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> {officeName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:text-right">
          <div className="hidden sm:flex flex-col items-end">
            <span className="inline-flex items-center gap-1.5 text-white/85 text-sm font-medium">
              <CalendarDays className="w-4 h-4" /> {dateStr}
            </span>
            <span className="inline-flex items-center gap-1.5 text-white text-lg font-bold tabular-nums mt-0.5">
              <Clock className="w-4 h-4" /> {timeStr}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

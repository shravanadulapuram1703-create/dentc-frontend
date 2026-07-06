import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Clock, UserCircle2, LogIn } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext.js";
import type { UserRole } from "../../../contexts/AuthContext.js";
import { roleLabel } from "../../dashboard/lib/dashboardUtils";

interface MyPageHeroProps {
  name?: string;
  role?: UserRole;
  currentOffice: string;
  imageUrl?: string | null;
  lastLoginAt?: string | null;
}

function firstName(name?: string): string {
  return (name?.trim().split(/\s+/)[0]) || "there";
}

function formatLastLogin(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The personalized welcome banner for My Page: avatar, greeting, role, office,
 * a live clock, and the user's previous sign-in. Mirrors the Dashboard header
 * styling for visual consistency, but is identity-first (this is *your* page).
 */
export default function MyPageHero({
  name,
  role,
  currentOffice,
  imageUrl,
  lastLoginAt,
}: MyPageHeroProps) {
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

  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
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
  const lastLogin = formatLastLogin(lastLoginAt);

  return (
    <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white/20">
            {imageUrl ? (
              <img src={imageUrl} alt={name || "Profile"} className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-9 h-9 text-white" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">
              {greeting}, {firstName(name)}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white/85 text-sm font-medium">
              <span className="inline-flex items-center gap-1.5">
                <UserCircle2 className="w-4 h-4" /> {roleLabel(role)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> {officeName}
              </span>
              {lastLogin && (
                <span className="inline-flex items-center gap-1.5 text-white/70">
                  <LogIn className="w-4 h-4" /> Last sign-in {lastLogin}
                </span>
              )}
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

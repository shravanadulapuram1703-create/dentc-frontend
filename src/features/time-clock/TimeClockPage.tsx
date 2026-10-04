// /time-clock — "My Time Clock": punch in/out and the signed-in user's own time
// card. Every authenticated user can reach it (Denticon Utilities → User
// Functions → TimeClock).
import { useNavigate } from "react-router-dom";
import { BarChart3, Clock, Loader2, LogIn, LogOut } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useOfficeOptions, useOfficeScope } from "@/features/office-scope";
import { parseServerDateTime } from "@/utils/datetime";
import HoursReport from "./components/HoursReport";
import { canViewTeamTime } from "./timeClockAccess";
import { entryTimeZone, formatClockTime, formatDuration } from "./timeClockModel";
import { useNow, useTimeClock } from "./useTimeClock";

export default function TimeClockPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { office } = useOfficeScope();
  const { data: offices = [] } = useOfficeOptions();
  const clock = useTimeClock();
  const now = useNow(true, 1_000);

  const zoneFor = (id: number) => offices.find((o) => o.id === id)?.timezone;
  const since = clock.active
    ? formatClockTime(parseServerDateTime(clock.active.clock_in), entryTimeZone(clock.active, zoneFor))
    : null;
  const activeOffice = clock.active?.office_id != null ? offices.find((o) => o.id === clock.active?.office_id)?.name : null;

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Time Clock"
        subtitle="Clock in and out, and review your hours"
        icon={<Clock className="w-6 h-6 text-white" />}
        actions={
          canViewTeamTime(user?.role) ? (
            <button
              type="button"
              onClick={() => navigate("/time-clock/report")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              <BarChart3 className="w-4 h-4" /> Hours report (all staff)
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="flex flex-col gap-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{user?.name}</div>
            <div className="mt-1 text-4xl font-bold tabular-nums text-[#1F3A5F]">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-sm text-[#64748B]">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>

          <div className="flex-1">
            {clock.loading ? (
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking your status…
              </div>
            ) : clock.is_clocked_in ? (
              <div data-testid="time-clock-status">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-sm font-semibold text-[#166534]">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> On the clock
                </span>
                <div className="mt-2 text-3xl font-bold tabular-nums text-[#166534]">{formatDuration(clock.elapsed_ms)}</div>
                <div className="text-sm text-[#475569]">
                  since {since}
                  {activeOffice ? ` · ${activeOffice}` : ""}
                </div>
              </div>
            ) : (
              <div data-testid="time-clock-status">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-sm font-semibold text-[#475569]">
                  <span className="h-2 w-2 rounded-full bg-[#94A3B8]" /> Clocked out
                </span>
                <div className="mt-2 text-sm text-[#475569]">
                  Clocking in at <span className="font-semibold text-[#1F3A5F]">{office?.name ?? "no office selected"}</span>
                </div>
              </div>
            )}
          </div>

          <div className="md:w-56">
            {clock.is_clocked_in ? (
              <button
                type="button"
                onClick={() => void clock.clockOut()}
                disabled={clock.pending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-6 py-4 text-lg font-bold text-white shadow hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {clock.pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                Clock out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void clock.clockIn()}
                disabled={clock.pending || clock.loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-4 text-lg font-bold text-white shadow hover:bg-[#15803D] disabled:opacity-60"
              >
                {clock.pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Clock in
              </button>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-[#1F3A5F]">My time card</h2>
          <HoursReport mode="self" />
        </section>
      </div>
    </div>
  );
}

// Top-bar punch clock, available to every signed-in user. Shows whether the user
// is on the clock (with the running shift's elapsed time) and opens a small
// panel to clock in / out — the DentC take on Denticon's TimeClock utility.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Clock, LogIn, LogOut, CalendarRange, BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOfficeOptions, useOfficeScope } from "@/features/office-scope";
import { parseServerDateTime } from "@/utils/datetime";
import { entryTimeZone, formatClockTime, formatDuration } from "../timeClockModel";
import { timeClockKeys, useTimeClock } from "../useTimeClock";
import { fetchTimeClockConfig } from "../timeClockService";
import { canViewTeamTime } from "../timeClockAccess";

export default function TimeClockButton() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { office } = useOfficeScope();
  const { data: offices } = useOfficeOptions();
  const clock = useTimeClock();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Users Setup → Time Clock "clock-in required": open the panel once per
  // session until they punch in (Denticon prompted at login).
  const configQuery = useQuery({
    queryKey: timeClockKeys.config(clock.user_id),
    queryFn: () => fetchTimeClockConfig(clock.user_id as number),
    enabled: clock.user_id != null,
    staleTime: 10 * 60_000,
  });
  const required = configQuery.data?.clock_in_required === true;
  const needsPunch = required && !clock.loading && !clock.is_clocked_in;
  useEffect(() => {
    if (!needsPunch || clock.user_id == null) return;
    const key = `dentc:time_clock_prompted:${clock.user_id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked — prompt anyway */
    }
    setOpen(true);
  }, [needsPunch, clock.user_id]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (clock.user_id == null) return null;

  const zoneFor = (id: number) => offices?.find((o) => o.id === id)?.timezone;
  const officeName = (id: number | null | undefined) =>
    id == null ? "No office" : (offices?.find((o) => o.id === id)?.name ?? `Office #${id}`);
  const since = clock.active
    ? formatClockTime(parseServerDateTime(clock.active.clock_in), entryTimeZone(clock.active, zoneFor))
    : null;
  const elapsed = formatDuration(clock.elapsed_ms);
  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={clock.is_clocked_in ? `On the clock since ${since} (${elapsed})` : "Time clock — you are clocked out"}
        aria-label={clock.is_clocked_in ? `Time clock: on the clock, ${elapsed}` : "Time clock: clocked out"}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="time-clock-button"
        className="relative flex h-10 items-center gap-2 rounded-lg bg-white/10 px-3 hover:bg-white/20 border border-white/30 text-white transition-all backdrop-blur-sm"
      >
        <Clock className="w-5 h-5" strokeWidth={2} />
        <span className="hidden xl:inline text-xs font-semibold tabular-nums">
          {clock.loading ? "…" : clock.is_clocked_in ? elapsed : "Clock in"}
        </span>
        <span
          className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#1F3A5F] ${
            clock.is_clocked_in ? "bg-[#22C55E]" : needsPunch ? "bg-[#F59E0B] animate-pulse" : "bg-[#94A3B8]"
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Time clock"
          className="absolute right-0 top-full mt-2 w-80 rounded-lg border-2 border-[#E2E8F0] bg-white shadow-xl z-50 text-[#1E293B]"
        >
          <div className="px-4 pt-4 pb-3 border-b border-[#E2E8F0]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Time clock</div>
            <div className="mt-1 text-sm font-bold text-[#1F3A5F]">{user?.name}</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  clock.is_clocked_in ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-[#475569]"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${clock.is_clocked_in ? "bg-[#22C55E]" : "bg-[#94A3B8]"}`} />
                {clock.is_clocked_in ? "On the clock" : "Clocked out"}
              </span>
            </div>
            {clock.is_clocked_in && clock.active ? (
              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-[#64748B]">Since</dt>
                <dd className="font-semibold text-right">{since}</dd>
                <dt className="text-[#64748B]">Elapsed</dt>
                <dd className="font-semibold text-right tabular-nums">{elapsed}</dd>
                <dt className="text-[#64748B]">Office</dt>
                <dd className="font-semibold text-right truncate">{officeName(clock.active.office_id)}</dd>
              </dl>
            ) : (
              <>
                {required && (
                  <p className="mt-3 rounded-md bg-[#FFFBEB] px-2.5 py-1.5 text-xs font-semibold text-[#92400E]">
                    Your account requires you to clock in at the start of your shift.
                  </p>
                )}
              <p className="mt-3 text-sm text-[#64748B]">
                Clocking in at <span className="font-semibold text-[#1F3A5F]">{office?.name ?? "no office selected"}</span>.
              </p>
              </>
            )}
          </div>

          <div className="p-4">
            {clock.is_clocked_in ? (
              <button
                type="button"
                onClick={() => void clock.clockOut()}
                disabled={clock.pending}
                data-testid="time-clock-out"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {clock.pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Clock out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void clock.clockIn()}
                disabled={clock.pending || clock.loading}
                data-testid="time-clock-in"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#15803D] disabled:opacity-60"
              >
                {clock.pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Clock in
              </button>
            )}
          </div>

          <div className="border-t border-[#E2E8F0] py-1">
            <button
              type="button"
              onClick={() => go("/time-clock")}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9]"
            >
              <CalendarRange className="w-4 h-4 text-[#3A6EA5]" /> My time card
            </button>
            {canViewTeamTime(user?.role) && (
              <button
                type="button"
                onClick={() => go("/time-clock/report")}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9]"
              >
                <BarChart3 className="w-4 h-4 text-[#3A6EA5]" /> Hours report (all staff)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

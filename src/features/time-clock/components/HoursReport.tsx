// Hours report — the shared body of "My time card" (mode="self", locked to the
// signed-in user, all offices) and the all-staff Time Clock Report
// (mode="team", employee + office scope filters, manager editing).
import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OfficeBadge, ScopeToggle, useOfficeOptions, useOfficeScope, useReadScope } from "@/features/office-scope";
import { loadUserDirectory } from "@/services/userDirectory";
import { todayIsoDate } from "@/utils/datetime";
import {
  buildReport,
  detailCsv,
  formatClockTime,
  formatDayKey,
  formatHours,
  ISSUE_LABELS,
  OVERTIME_RULES,
  PERIOD_LABELS,
  periodRange,
  reportTotals,
  summaryCsv,
  type EntryRow,
  type OvertimeRuleKey,
  type PeriodKey,
  type TimeClockEntry,
  type UserSummary,
} from "../timeClockModel";
import { fetchEntriesInRange } from "../timeClockService";
import { printTimeClockReport } from "../timeClockPrint";
import { canEditTime } from "../timeClockAccess";
import { timeClockKeys } from "../useTimeClock";
import TimeEntryDialog from "./TimeEntryDialog";

interface Props {
  mode: "self" | "team";
}

const selectCls =
  "rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-sm text-[#1E293B] focus:border-[#3A6EA5] focus:outline-none";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HoursReport({ mode }: Props) {
  const { user, currentOrganization, organizations } = useAuth();
  const practice = organizations.find((o) => o.id === currentOrganization)?.name ?? "";
  const { office_id: working_office_id } = useOfficeScope();
  const queryClient = useQueryClient();
  const { data: offices = [] } = useOfficeOptions();
  const scope = useReadScope("time-clock-report", { allow: "privileged", defaultMode: "all" });
  const me = Number(user?.id);
  const editable = mode === "team" && canEditTime(user?.role);

  const [period, setPeriod] = useState<PeriodKey>(mode === "self" ? "this_week" : "last_2_weeks");
  const today = todayIsoDate();
  const [custom, setCustom] = useState(() => periodRange("this_week", today));
  const range = period === "custom" ? custom : periodRange(period, today);
  const [employee, setEmployee] = useState<number | "all">("all");
  const [ruleKey, setRuleKey] = useState<OvertimeRuleKey>("weekly_40");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<{ entry: TimeClockEntry | null } | null>(null);

  const staffQuery = useQuery({
    queryKey: ["time-clock", "staff"],
    queryFn: loadUserDirectory,
    staleTime: 10 * 60_000,
  });
  const directory = staffQuery.data;
  const staff = useMemo(() => {
    const rows = [...(directory?.entries() ?? [])].map(([id, name]) => ({ id, name }));
    const seen = new Map<string, number>();
    rows.forEach((r) => seen.set(r.name, (seen.get(r.name) ?? 0) + 1));
    // Several accounts share a display name ("P Z" ×6) — tag those with the id.
    return rows
      .map((r) => ((seen.get(r.name) ?? 0) > 1 ? { ...r, name: `${r.name} (#${r.id})` } : r))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [directory]);

  const query =
    mode === "self"
      ? { from: range.from, to: range.to, user_id: me, all_offices: true }
      : {
          from: range.from,
          to: range.to,
          user_id: employee === "all" ? null : employee,
          office_id: scope.office_id,
          office_ids: scope.office_ids,
          all_offices: scope.mode === "all",
        };
  const entriesQuery = useQuery({
    queryKey: timeClockKeys.range(query),
    queryFn: () => fetchEntriesInRange(query),
    enabled: range.from <= range.to && (mode === "team" || Number.isFinite(me)),
    staleTime: 30_000,
  });

  const zoneFor = (id: number) => offices.find((o) => o.id === id)?.timezone;
  const officeName = (id: number | null | undefined) =>
    id == null ? "—" : (offices.find((o) => o.id === id)?.name ?? `Office #${id}`);
  const nameOf = (id: number) => directory?.get(id) ?? (id === me ? (user?.name ?? `User #${id}`) : `User #${id}`);

  const report = useMemo<UserSummary[]>(() => {
    const users = buildReport(entriesQuery.data?.entries ?? [], {
      from: range.from,
      to: range.to,
      zoneForOffice: zoneFor,
      resolveUserName: nameOf,
      rule: OVERTIME_RULES[ruleKey].rule,
    });
    return issuesOnly ? users.filter((u) => u.issue_count > 0) : users;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zoneFor/nameOf derive from offices/directory
  }, [entriesQuery.data, range.from, range.to, ruleKey, issuesOnly, offices, directory]);
  const totals = reportTotals(report);

  const refresh = () => queryClient.invalidateQueries({ queryKey: timeClockKeys.all });
  const toggle = (id: number) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const fileStem = `time-clock_${range.from}_${range.to}`;
  const title = mode === "self" ? `Time Card — ${user?.name ?? ""}` : "Time Clock Report";
  const singleUser = mode === "self" || report.length === 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3">
        <label className="text-xs font-semibold text-[#475569]">
          Period
          <select className={`${selectCls} mt-1 block`} value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)}>
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
              <option key={k} value={k}>
                {PERIOD_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        {period === "custom" ? (
          <>
            <label className="text-xs font-semibold text-[#475569]">
              From
              <input type="date" className={`${selectCls} mt-1 block`} value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-[#475569]">
              To
              <input type="date" className={`${selectCls} mt-1 block`} value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </label>
          </>
        ) : (
          <div className="pb-1.5 text-sm text-[#475569]">
            {formatDayKey(range.from)} – {formatDayKey(range.to)}
          </div>
        )}
        {mode === "team" && (
          <label className="text-xs font-semibold text-[#475569]">
            Employee
            <select
              className={`${selectCls} mt-1 block max-w-[14rem]`}
              value={employee}
              onChange={(e) => setEmployee(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All employees</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs font-semibold text-[#475569]">
          Overtime
          <select className={`${selectCls} mt-1 block`} value={ruleKey} onChange={(e) => setRuleKey(e.target.value as OvertimeRuleKey)}>
            {(Object.keys(OVERTIME_RULES) as OvertimeRuleKey[]).map((k) => (
              <option key={k} value={k}>
                {OVERTIME_RULES[k].label}
              </option>
            ))}
          </select>
        </label>
        {mode === "team" && (
          <label className="inline-flex items-center gap-2 pb-1.5 text-sm text-[#475569]">
            <input type="checkbox" checked={issuesOnly} onChange={(e) => setIssuesOnly(e.target.checked)} />
            Issues only
          </label>
        )}
        {mode === "team" && <ScopeToggle scope={scope} className="mb-0.5" />}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD5E1] px-2.5 py-1.5 text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9]" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${entriesQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
          {editable && (
            <button type="button" onClick={() => setEditing({ entry: null })} className="inline-flex items-center gap-1.5 rounded-md bg-[#3A6EA5] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#2F5A88]">
              <Plus className="w-4 h-4" /> Add entry
            </button>
          )}
          <button
            type="button"
            disabled={report.length === 0}
            onClick={() => download(`${fileStem}_summary.csv`, summaryCsv(report))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD5E1] px-3 py-1.5 text-sm font-semibold text-[#1F3A5F] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Summary CSV
          </button>
          <button
            type="button"
            disabled={report.length === 0}
            onClick={() => download(`${fileStem}_detail.csv`, detailCsv(report, officeName))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD5E1] px-3 py-1.5 text-sm font-semibold text-[#1F3A5F] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Detail CSV
          </button>
          <button
            type="button"
            disabled={report.length === 0}
            onClick={() =>
              printTimeClockReport(
                report,
                {
                  title,
                  practice,
                  from: range.from,
                  to: range.to,
                  overtime_label: OVERTIME_RULES[ruleKey].label,
                },
                officeName,
              )
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD5E1] px-3 py-1.5 text-sm font-semibold text-[#1F3A5F] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: mode === "self" ? "Days worked" : "Employees", value: mode === "self" ? String(report[0]?.days.length ?? 0) : String(totals.users) },
          { label: "Shifts", value: String(totals.shifts) },
          { label: "Regular hours", value: formatHours(totals.regular_hours) },
          { label: "Overtime hours", value: formatHours(totals.overtime_hours), accent: totals.overtime_hours > 0 ? "text-[#B45309]" : "" },
          { label: "Total hours", value: formatHours(totals.total_hours), accent: "text-[#1F3A5F]" },
          { label: "Issues", value: String(totals.issues), accent: totals.issues > 0 ? "text-[#B91C1C]" : "" },
        ].map((t) => (
          <div key={t.label} className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{t.label}</div>
            <div className={`mt-1 text-2xl font-bold tabular-nums ${t.accent ?? "text-[#1E293B]"}`}>{t.value}</div>
          </div>
        ))}
      </div>

      {entriesQuery.data?.truncated && (
        <div className="flex items-center gap-2 rounded-md border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2 text-sm text-[#92400E]">
          <AlertTriangle className="w-4 h-4" /> The range is very large — only the most recent punches were loaded. Narrow the period or pick an employee.
        </div>
      )}

      {/* Body */}
      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
        {entriesQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#64748B]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading punches…
          </div>
        ) : entriesQuery.isError ? (
          <div className="py-16 text-center text-sm text-[#B91C1C]">Could not load time-clock entries. Try refreshing.</div>
        ) : report.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#64748B]">No punches in this period.</div>
        ) : singleUser && report[0] ? (
          <DetailTable user={report[0]} officeName={officeName} editable={editable} onEdit={(e) => setEditing({ entry: e })} showOffice />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F1F5F9] text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2 text-right">Days</th>
                <th className="px-3 py-2 text-right">Shifts</th>
                <th className="px-3 py-2 text-right">Regular</th>
                <th className="px-3 py-2 text-right">Overtime</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.map((u) => {
                const isOpen = expanded.has(u.user_id);
                return (
                  <Fragment key={u.user_id}>
                    <tr className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer" onClick={() => toggle(u.user_id)}>
                      <td className="px-3 py-2 text-[#64748B]">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                      <td className="px-3 py-2 font-semibold text-[#1F3A5F]">{u.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{u.days.length}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{u.shift_count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatHours(u.regular_hours)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${u.overtime_hours > 0 ? "font-semibold text-[#B45309]" : ""}`}>{formatHours(u.overtime_hours)}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{formatHours(u.total_hours)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {u.active_row && <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#166534]">On the clock</span>}
                          {u.issue_count > 0 && (
                            <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-xs font-semibold text-[#B91C1C]">
                              {u.issue_count} issue{u.issue_count === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
                        <td />
                        <td colSpan={7} className="px-3 py-3">
                          <div className="overflow-x-auto rounded-md border border-[#E2E8F0] bg-white">
                            <DetailTable user={u} officeName={officeName} editable={editable} onEdit={(e) => setEditing({ entry: e })} showOffice />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-[#CBD5E1] bg-[#F8FAFC] font-bold">
              <tr>
                <td />
                <td className="px-3 py-2">Total</td>
                <td />
                <td className="px-3 py-2 text-right tabular-nums">{totals.shifts}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatHours(totals.regular_hours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatHours(totals.overtime_hours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatHours(totals.total_hours)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {editable && editing && (
        <TimeEntryDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          entry={editing.entry}
          staff={staff}
          offices={offices}
          default_user_id={employee === "all" ? null : employee}
          default_office_id={working_office_id}
          default_day={range.to < today ? range.to : today}
          onSaved={() => void refresh()}
        />
      )}
    </div>
  );
}

function DetailTable({
  user,
  officeName,
  editable,
  onEdit,
  showOffice,
}: {
  user: UserSummary;
  officeName: (id: number | null | undefined) => string;
  editable: boolean;
  onEdit: (entry: TimeClockEntry) => void;
  showOffice: boolean;
}) {
  const cell = "px-3 py-1.5";
  const renderRow = (r: EntryRow, first: boolean, day: string) => (
    <tr key={r.entry.id} className="border-t border-[#F1F5F9]">
      <td className={`${cell} whitespace-nowrap font-medium text-[#1E293B]`}>{first ? formatDayKey(day) : ""}</td>
      {showOffice && (
        <td className={`${cell} whitespace-nowrap`}>
          {r.entry.office_id != null ? <OfficeBadge office_id={r.entry.office_id} /> : <span className="text-[#94A3B8]">{officeName(null)}</span>}
        </td>
      )}
      <td className={`${cell} tabular-nums`}>{formatClockTime(r.clock_in, r.time_zone)}</td>
      <td className={`${cell} tabular-nums`}>
        {r.clock_out ? (
          formatClockTime(r.clock_out, r.time_zone)
        ) : r.live_hours != null ? (
          <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#166534]">On the clock · {formatHours(r.live_hours)} h</span>
        ) : (
          "—"
        )}
      </td>
      <td className={`${cell} text-right tabular-nums`}>{formatHours(r.hours)}</td>
      <td className={cell}>
        <div className="flex flex-wrap gap-1">
          {r.issues.map((i) => (
            <span key={i} className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-xs font-semibold text-[#B91C1C]">
              {ISSUE_LABELS[i]}
            </span>
          ))}
        </div>
      </td>
      {editable && (
        <td className={`${cell} text-right`}>
          <button type="button" onClick={() => onEdit(r.entry)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#3A6EA5] hover:underline" aria-label={`Edit entry ${r.entry.id}`}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </td>
      )}
    </tr>
  );

  return (
    <table className="w-full text-sm">
      <thead className="bg-[#F1F5F9] text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
        <tr>
          <th className={cell}>Date</th>
          {showOffice && <th className={cell}>Office</th>}
          <th className={cell}>Clock in</th>
          <th className={cell}>Clock out</th>
          <th className={`${cell} text-right`}>Hours</th>
          <th className={cell}>Notes</th>
          {editable && <th className={cell} />}
        </tr>
      </thead>
      <tbody>
        {user.days.map((d) => (
          <Fragment key={d.day}>
            {d.rows.map((r, i) => renderRow(r, i === 0, d.day))}
            {(d.rows.length > 1 || d.overtime > 0) && (
              <tr className="border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs">
                <td colSpan={showOffice ? 4 : 3} className={`${cell} text-right font-semibold text-[#475569]`}>
                  Day total{d.overtime > 0 ? ` · regular ${formatHours(d.regular)} · OT ${formatHours(d.overtime)}` : ""}
                </td>
                <td className={`${cell} text-right font-bold tabular-nums`}>{formatHours(d.hours)}</td>
                <td colSpan={editable ? 2 : 1} />
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
      <tfoot className="border-t-2 border-[#CBD5E1] bg-[#F8FAFC] text-sm font-bold">
        <tr>
          <td colSpan={showOffice ? 4 : 3} className={`${cell} text-right`}>
            Regular {formatHours(user.regular_hours)} · Overtime {formatHours(user.overtime_hours)} · Total
          </td>
          <td className={`${cell} text-right tabular-nums`}>{formatHours(user.total_hours)}</td>
          <td colSpan={editable ? 2 : 1} />
        </tr>
      </tfoot>
    </table>
  );
}

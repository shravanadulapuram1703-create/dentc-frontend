// "My Tickets" — the tickets the signed-in user has filed. Reads the remote list
// when the transport supports it, otherwise the local audit log. Auto-refreshes
// when a new ticket is created (via the help:ticket-created event).
//
// This is the Help Center's primary section: a filterable, scrollable table.
// Each row lets the reporter move the ticket between Open / In Progress / Done
// (PATCHed to the backend, which transitions the Jira issue first), and the
// list can be narrowed by search text, category (issue type), module and status.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FilterX, RefreshCw, Search, Ticket } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import WidgetCard from "../../dashboard/components/WidgetCard";
import { utils } from "../../../styles/theme";
import { listTickets } from "../lib/ticketLog";
import { fetchMyTickets, updateTicketStatus } from "../services/jiraService";
import { ISSUE_TYPES, PRIORITIES, TICKET_STATUSES, isDemoMode } from "../config/jiraConfig";
import TicketStatusBadge from "./TicketStatusBadge";
import type { TicketRecord, TicketStatus } from "../types";

const ALL = "__all__";

/** `Failed` tickets are retried, not re-labelled; anything else can be moved. */
const isEditable = (status: TicketStatus) => status !== "Failed";

// `tx-select` overrides the global `select { padding: .75rem 1rem !important }`
// rule, which otherwise clips the selected value out of a compact control.
const SELECT =
  "tx-select h-8 min-w-0 rounded-md text-xs text-[#1E293B] focus:border-[#3A6EA5] " +
  "focus:ring-1 focus:ring-[#3A6EA5]/30 disabled:opacity-60";

const TH =
  "sticky top-0 z-10 bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-bold uppercase " +
  "tracking-wide text-[#64748B] border-b border-[#E2E8F0] whitespace-nowrap";

function typeLabel(value: string): string {
  return ISSUE_TYPES.find((t) => t.value === value)?.label ?? value;
}
function priorityLabel(value: string): string {
  return PRIORITIES.find((p) => p.value === value)?.label ?? value;
}

export default function MyTicketsPanel() {
  const { user } = useAuth();
  const reporterId = user?.id ?? "unknown";
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [source, setSource] = useState<"remote" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [moduleFilter, setModuleFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  const load = useCallback(async () => {
    setLoading(true);
    const local = listTickets(reporterId);
    const result = await fetchMyTickets(reporterId, local);
    setTickets(result.tickets);
    setSource(result.source);
    setLoading(false);
  }, [reporterId]);

  useEffect(() => {
    void load();
    const onCreated = () => void load();
    window.addEventListener("help:ticket-created", onCreated);
    return () => window.removeEventListener("help:ticket-created", onCreated);
  }, [load]);

  // Filter options come from the tickets the user actually has, so the
  // dropdowns never offer a category that would produce an empty list.
  const typeOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.issue_type).filter(Boolean))).sort(),
    [tickets],
  );
  const moduleOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.module).filter(Boolean))).sort(),
    [tickets],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.status).filter(Boolean))),
    [tickets],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (typeFilter === ALL || t.issue_type === typeFilter) &&
        (moduleFilter === ALL || t.module === moduleFilter) &&
        (statusFilter === ALL || t.status === statusFilter) &&
        (!q || t.title.toLowerCase().includes(q) || (t.issue_key ?? "").toLowerCase().includes(q)),
    );
  }, [tickets, search, typeFilter, moduleFilter, statusFilter]);

  const filtersActive =
    search.trim() !== "" || typeFilter !== ALL || moduleFilter !== ALL || statusFilter !== ALL;

  const clearFilters = () => {
    setSearch("");
    setTypeFilter(ALL);
    setModuleFilter(ALL);
    setStatusFilter(ALL);
  };

  const changeStatus = async (ticket: TicketRecord, status: TicketStatus) => {
    if (status === ticket.status) return;
    const key = String(ticket.id);
    setSavingId(key);
    setError(null);
    const result = await updateTicketStatus(ticket, status, source);
    if (result.ok && result.ticket) {
      const updated = result.ticket;
      setTickets((prev) => prev.map((t) => (String(t.id) === key ? { ...t, ...updated } : t)));
    } else {
      setError(result.error ?? "Could not update the ticket status.");
    }
    setSavingId(null);
  };

  return (
    <WidgetCard
      title="My Tickets"
      icon={<Ticket className="h-4 w-4" />}
      actions={
        <>
          {tickets.length > 0 && (
            <span className="text-xs font-semibold text-[#64748B]">
              {filtersActive ? `${visible.length} of ${tickets.length}` : `${tickets.length} total`}
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded p-1.5 text-[#64748B] hover:bg-white hover:text-[#3A6EA5]"
            aria-label="Refresh tickets"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </>
      }
      isLoading={loading && tickets.length === 0}
      isEmpty={!loading && tickets.length === 0}
      emptyMessage="You haven't filed any tickets yet."
      bodyClassName="p-0 flex flex-col min-h-0"
      footer={
        isDemoMode ? (
          <p className="text-[11px] text-[#94A3B8]">
            Demo mode — showing locally stored tickets.
          </p>
        ) : undefined
      }
    >
      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5"
        role="group"
        aria-label="Filter tickets"
      >
        <label className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or key…"
            aria-label="Search tickets"
            className="h-8 w-full rounded-md border border-[#E2E8F0] bg-white pl-8 pr-2 text-xs text-[#1E293B] outline-none focus:border-[#3A6EA5] focus:ring-1 focus:ring-[#3A6EA5]/30"
          />
        </label>
        <select
          aria-label="Filter by category"
          className={SELECT}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value={ALL}>All categories</option>
          {typeOptions.map((v) => (
            <option key={v} value={v}>
              {typeLabel(v)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by module"
          className={SELECT}
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
        >
          <option value={ALL}>All modules</option>
          {moduleOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className={SELECT}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value={ALL}>All statuses</option>
          {statusOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#3A6EA5] hover:bg-white"
            aria-label="Clear filters"
          >
            <FilterX className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-xs text-[#B91C1C]">
          {error}
        </p>
      )}

      {/* Scrollable table — bounded height so the page never grows with the list */}
      <div className="max-h-[min(62vh,640px)] overflow-auto">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">
            No tickets match the current filters.
          </p>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[96px]" />
              <col />
              <col className="w-[200px]" />
              <col className="w-[84px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={TH}>Ticket</th>
                <th className={TH}>Title</th>
                <th className={TH}>Status</th>
                <th className={utils.cn(TH, "text-right")}>Filed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {visible.map((t) => {
                const key = String(t.id);
                const editable = isEditable(t.status);
                const known = TICKET_STATUSES.some((s) => s.value === t.status);
                return (
                  <tr key={key} className="align-middle hover:bg-[#F8FAFC]">
                    <td className="whitespace-nowrap px-3 py-2">
                      {t.issue_url ? (
                        <a
                          href={t.issue_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#3A6EA5] hover:underline"
                          aria-label={`Open ${t.issue_key}`}
                        >
                          {t.issue_key}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-xs font-bold text-[#64748B]">
                          {t.issue_key ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="min-w-0 px-3 py-2">
                      <p className="truncate font-semibold text-[#1E293B]" title={t.title}>
                        {t.title}
                      </p>
                      <p className="truncate text-xs text-[#64748B]">
                        {typeLabel(t.issue_type)} · {t.module} · {priorityLabel(t.priority)}
                      </p>
                      {t.error && (
                        <p className="truncate text-xs text-[#B91C1C]" title={t.error}>
                          {t.error}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {!editable && <TicketStatusBadge status={t.status} />}
                        {editable && (
                          <select
                            aria-label={`Change status of ${t.issue_key ?? t.title}`}
                            className={utils.cn(SELECT, "w-full")}
                            value={known ? t.status : ""}
                            disabled={savingId === key}
                            onChange={(e) => void changeStatus(t, e.target.value as TicketStatus)}
                          >
                            {!known && (
                              <option value="" disabled>
                                {t.status} — move to…
                              </option>
                            )}
                            {TICKET_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-[#64748B]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </WidgetCard>
  );
}

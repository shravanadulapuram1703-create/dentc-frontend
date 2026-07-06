// "My Tickets" — the tickets the signed-in user has filed. Reads the remote list
// when the transport supports it, otherwise the local audit log. Auto-refreshes
// when a new ticket is created (via the help:ticket-created event).
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Ticket } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import WidgetCard from "../../dashboard/components/WidgetCard";
import { listTickets } from "../lib/ticketLog";
import { fetchMyTickets } from "../services/jiraService";
import { isDemoMode } from "../config/jiraConfig";
import TicketStatusBadge from "./TicketStatusBadge";
import type { TicketRecord } from "../types";

export default function MyTicketsPanel() {
  const { user } = useAuth();
  const reporterId = user?.id ?? "unknown";
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const local = listTickets(reporterId);
    const { tickets } = await fetchMyTickets(reporterId, local);
    setTickets(tickets);
    setLoading(false);
  }, [reporterId]);

  useEffect(() => {
    void load();
    const onCreated = () => void load();
    window.addEventListener("help:ticket-created", onCreated);
    return () => window.removeEventListener("help:ticket-created", onCreated);
  }, [load]);

  return (
    <WidgetCard
      title="My Tickets"
      icon={<Ticket className="h-4 w-4" />}
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className="rounded p-1.5 text-[#64748B] hover:bg-white hover:text-[#3A6EA5]"
          aria-label="Refresh tickets"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
      isLoading={loading && tickets.length === 0}
      isEmpty={!loading && tickets.length === 0}
      emptyMessage="You haven't filed any tickets yet."
      bodyClassName="p-0"
      footer={
        isDemoMode ? (
          <p className="text-[11px] text-[#94A3B8]">
            Demo mode — showing locally stored tickets.
          </p>
        ) : undefined
      }
    >
      <ul className="divide-y divide-[#E2E8F0]">
        {tickets.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {t.issue_key && (
                  <span className="font-mono text-xs font-bold text-[#3A6EA5]">{t.issue_key}</span>
                )}
                <TicketStatusBadge status={t.status} />
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-[#1E293B]" title={t.title}>
                {t.title}
              </p>
              <p className="mt-0.5 text-xs text-[#94A3B8]">
                {t.issue_type} · {t.priority} · {t.module} ·{" "}
                {new Date(t.created_at).toLocaleDateString()}
              </p>
            </div>
            {t.issue_url && (
              <a
                href={t.issue_url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 shrink-0 text-[#3A6EA5] hover:text-[#2f5a8c]"
                aria-label={`Open ${t.issue_key}`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

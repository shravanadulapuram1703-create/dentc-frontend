// The Utilities hub — a modern, categorized, searchable dashboard that replaces
// the legacy Utilities dropdown. Shows only utilities the signed-in user is
// authorized to run (RBAC), with favourites, recently-executed shortcuts, a live
// execution/audit history, and status indicators throughout.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Star,
  History,
  Wrench,
  Trash2,
  Filter,
  Play,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import WidgetCard from "../../dashboard/components/WidgetCard";
import KpiStat from "../../dashboard/components/KpiStat";
import { UTILITIES, CATEGORIES, CATEGORY_MAP, getUtility } from "../utilityCatalog";
import { authorizedUtilities } from "../lib/rbac";
import { useRunningUtilities } from "../lib/useUtilityRun";
import {
  loadFavorites,
  toggleFavorite as toggleFav,
  loadRecents,
  loadHistory,
  clearHistory,
} from "../lib/utilitiesStorage";
import UtilityCard from "../components/UtilityCard";
import { RunStatusBadge } from "../components/StatusBadge";
import type { UtilityCategoryKey } from "../types";

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function UtilitiesDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const running = useRunningUtilities();

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<UtilityCategoryKey | "all">("all");
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites(user?.id));
  const [recents] = useState<string[]>(() => loadRecents(user?.id));
  const [history, setHistory] = useState(() => loadHistory(user?.id));

  const allowed = useMemo(() => authorizedUtilities(UTILITIES, user?.role), [user?.role]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      allowed.filter((u) => {
        if (activeCat !== "all" && u.category !== activeCat) return false;
        if (!q) return true;
        return (
          u.title.toLowerCase().includes(q) ||
          u.description.toLowerCase().includes(q) ||
          CATEGORY_MAP[u.category].label.toLowerCase().includes(q) ||
          (u.keywords ?? []).some((k) => k.toLowerCase().includes(q))
        );
      }),
    [allowed, activeCat, q],
  );

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const favoriteUtils = useMemo(
    () => allowed.filter((u) => favSet.has(u.id)),
    [allowed, favSet],
  );
  const recentUtils = useMemo(
    () => recents.map((id) => getUtility(id)).filter((u) => u && authorizedUtilities([u], user?.role).length > 0),
    [recents, user?.role],
  );

  const onToggleFavorite = (id: string) => setFavorites(toggleFav(user?.id, id));

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const u of allowed) m[u.category] = (m[u.category] ?? 0) + 1;
    return m;
  }, [allowed]);

  const onClearHistory = () => {
    clearHistory(user?.id);
    setHistory([]);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-[#3A6EA5]" />
          <div>
            <h1 className="text-xl font-bold text-[#1F3A5F]">Utilities</h1>
            <p className="text-sm text-[#64748B]">
              Administrative, maintenance & integration tools — organized and searchable.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search utilities…"
            className="w-full pl-9 pr-3 py-2.5 border border-[#CBD5E1] rounded-lg text-sm text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
            aria-label="Search utilities"
          />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiStat label="Available to you" value={allowed.length} icon={<Wrench className="w-4 h-4" />} tone="blue" />
        <KpiStat label="Favourites" value={favoriteUtils.length} icon={<Star className="w-4 h-4" />} tone="amber" />
        <KpiStat label="Runs logged" value={history.length} icon={<History className="w-4 h-4" />} tone="teal" />
        <KpiStat
          label="Running now"
          value={running.length}
          icon={<Play className="w-4 h-4" />}
          tone={running.length > 0 ? "blue" : "neutral"}
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
          <Filter className="w-3.5 h-3.5" /> Filter
        </span>
        <button
          type="button"
          onClick={() => setActiveCat("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            activeCat === "all"
              ? "bg-[#1F3A5F] text-white border-[#1F3A5F]"
              : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]"
          }`}
        >
          All ({allowed.length})
        </button>
        {CATEGORIES.filter((c) => catCounts[c.key]).map((c) => {
          const CIcon = c.icon;
          const active = activeCat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCat(c.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                active
                  ? "bg-[#1F3A5F] text-white border-[#1F3A5F]"
                  : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]"
              }`}
            >
              <CIcon className={`w-3.5 h-3.5 ${active ? "text-white" : c.accent}`} />
              {c.label} ({catCounts[c.key]})
            </button>
          );
        })}
      </div>

      {/* Favourites + Recents (hidden while searching/filtering to keep focus) */}
      {activeCat === "all" && !q && (favoriteUtils.length > 0 || recentUtils.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <WidgetCard title="Favourites" icon={<Star className="w-4 h-4" />}>
            {favoriteUtils.length === 0 ? (
              <p className="text-sm text-[#64748B]">
                Star any utility to pin it here for quick access.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {favoriteUtils.map((u) => (
                  <UtilityCard
                    key={u.id}
                    def={u}
                    favorite
                    running={running.includes(u.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            )}
          </WidgetCard>

          <WidgetCard title="Recently executed" icon={<History className="w-4 h-4" />}>
            {recentUtils.length === 0 ? (
              <p className="text-sm text-[#64748B]">Utilities you run will appear here for one-click re-runs.</p>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {recentUtils.map((u) => {
                  if (!u) return null;
                  const RIcon = u.icon;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => navigate(`/utilities/run/${u.id}`)}
                      className="w-full flex items-center gap-3 py-2.5 text-left group"
                    >
                      <span className="p-1.5 rounded-lg bg-[#F1F5F9]">
                        <RIcon className="w-4 h-4 text-[#3A6EA5]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-[#1F3A5F] truncate">{u.title}</span>
                        <span className="block text-xs text-[#94A3B8]">{CATEGORY_MAP[u.category].label}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#3A6EA5]" />
                    </button>
                  );
                })}
              </div>
            )}
          </WidgetCard>
        </div>
      )}

      {/* Catalog */}
      {matches.length === 0 ? (
        <p className="text-sm text-[#64748B] py-10 text-center border border-dashed border-[#E2E8F0] rounded-lg">
          No utilities match your search.
        </p>
      ) : (
        CATEGORIES.map((cat) => {
          const items = matches.filter((u) => u.category === cat.key);
          if (items.length === 0) return null;
          const CatIcon = cat.icon;
          return (
            <section key={cat.key}>
              <div className="flex items-center gap-2 mb-3">
                <CatIcon className={`w-5 h-5 ${cat.accent}`} />
                <h2 className="text-base font-bold text-[#1F3A5F]">{cat.label}</h2>
                <span className="text-xs text-[#94A3B8]">— {cat.description}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((u) => (
                  <UtilityCard
                    key={u.id}
                    def={u}
                    favorite={favSet.has(u.id)}
                    running={running.includes(u.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Execution history / audit log */}
      <WidgetCard
        title="Execution history"
        icon={<ClipboardList className="w-4 h-4" />}
        actions={
          history.length > 0 ? (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9]"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          ) : undefined
        }
        isEmpty={history.length === 0}
        emptyMessage="No utilities have been run yet. Every execution is logged here with user, office, time, parameters and result."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3A5F] text-white text-left">
                <th className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs">Utility</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs">User</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs">Office</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs">When</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs">Result</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs text-right">Processed</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id} className={i % 2 ? "bg-[#F7F9FC]" : "bg-white"}>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/utilities/run/${h.utility_id}`)}
                      className="font-semibold text-[#1F3A5F] hover:text-[#3A6EA5] hover:underline text-left"
                    >
                      {h.utility_title}
                    </button>
                    <div className="text-[11px] text-[#94A3B8]">{CATEGORY_MAP[h.category]?.label}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[#475569]">{h.user_name}</td>
                  <td className="px-4 py-2.5 text-[#475569]">{h.office}</td>
                  <td className="px-4 py-2.5 text-[#475569] whitespace-nowrap">{fmtDateTime(h.executed_at)}</td>
                  <td className="px-4 py-2.5">
                    <RunStatusBadge status={h.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[#475569]">
                    {h.processed > 0 ? `${h.succeeded}/${h.processed}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WidgetCard>
    </div>
  );
}

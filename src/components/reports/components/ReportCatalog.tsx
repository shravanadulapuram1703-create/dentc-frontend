// Searchable, categorized catalog of runnable reports for the Reports home page.
// Each card deep-links into the generic runner (/reports/run/:id).
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { CATEGORIES, REPORTS } from "../reportCatalog";

export default function ReportCatalog() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      REPORTS.filter(
        (r) =>
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      ),
    [q],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Report Library</h2>
          <p className="text-xs text-[#64748B]">Pick a report to filter, preview and export.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports…"
            className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-lg text-sm text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
            aria-label="Search reports"
          />
        </div>
      </div>

      {matches.length === 0 && (
        <p className="text-sm text-[#64748B] py-6 text-center border border-dashed border-[#E2E8F0] rounded-lg">
          No reports match “{query}”.
        </p>
      )}

      {CATEGORIES.map((cat) => {
        const items = matches.filter((r) => r.category === cat.key);
        if (items.length === 0) return null;
        const CatIcon = cat.icon;
        return (
          <div key={cat.key}>
            <div className="flex items-center gap-2 mb-2">
              <CatIcon className={`w-4 h-4 ${cat.accent}`} />
              <h3 className="text-sm font-bold text-[#1F3A5F]">{cat.label}</h3>
              <span className="text-xs text-[#94A3B8]">— {cat.description}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(`/reports/run/${r.id}`)}
                    className="group flex items-start gap-3 p-4 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:shadow-sm transition-all text-left"
                  >
                    <span className="shrink-0 mt-0.5 p-2 rounded-lg bg-[#F1F5F9] group-hover:bg-[#EFF6FF]">
                      <Icon className="w-5 h-5 text-[#3A6EA5]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#1F3A5F]">{r.title}</div>
                      <div className="text-xs text-[#64748B] leading-snug">{r.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#3A6EA5] shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

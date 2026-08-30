// "COPY FROM EXISTING PLAN" picker — opened from the insurance-plan form on
// BOTH hosts (Setup -> Insurance -> Plans and the patient Add New Insurance Plan
// modal), which is why it lives in the shared setup layer rather than the
// patient feature. Legacy Denticon parity: staff search the tenant's plans,
// pick one from the result grid, and its configuration is copied into the new
// plan's form for editing before save.
//
// Backend mapping for the three legacy "Search For" modes (see the devreport):
//   • Carrier Name / Payer ID → `search`, the free-text param, which the backend
//     joins across carrier name, payer id and group number. There is no
//     per-field search param, so both modes issue the same query — a numeric
//     "Carrier Name" search can therefore also match group/payer values.
//   • Group #                 → `group_number`, an EXACT server-side filter
//     (there is no "begins with" variant).

import { useMemo, useRef, useState } from "react";
import { Search, X, Loader2, Copy, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { listInsurancePlans } from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead } from "@/api/generated/model";
import {
  ensureCarrierRecords,
  carrierRecord,
  ensureEmployerNames,
  employerName,
} from "./lookupService";

const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

type SearchField = "carrier" | "group" | "payer";

const FIELD_LABEL: Record<SearchField, string> = {
  carrier: "Carrier Name",
  group: "Group #",
  payer: "Payer ID",
};

const PAGE_SIZE = 20;

interface Props {
  onClose: () => void;
  onCopy: (plan: InsurancePlanRead) => void;
}

/** `created_at` is an ISO timestamp — format from its parts so no timezone shift. */
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "—";
}

export default function CopyFromExistingDialog({ onClose, onCopy }: Props) {
  const [text, setText] = useState("");
  const [field, setField] = useState<SearchField>("carrier");
  const [rows, setRows] = useState<InsurancePlanRead[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  // The query the visible grid actually answers (not the live input).
  const [echo, setEcho] = useState<{ text: string; field: SearchField } | null>(null);
  // Bumped when a name lookup lands, so the two resolved columns re-render.
  const [namesTick, setNamesTick] = useState(0);
  // Guards against an older page's response overwriting a newer one.
  const seq = useRef(0);

  const runSearch = async (nextPage: number, q = text, f = field) => {
    const query = q.trim();
    if (!query) return;
    const mine = ++seq.current;
    setSearching(true);

    let items: InsurancePlanRead[] = [];
    try {
      const res = await listInsurancePlans({
        ...(f === "group" ? { group_number: query } : { search: query }),
        page: nextPage,
        size: PAGE_SIZE,
        sort: "id",
        order: "asc",
        is_active: true,
      });
      if (mine !== seq.current) return;
      items = res.items ?? [];
      setRows(items);
      setPage(nextPage);
      setPages(res.meta?.pages ?? 1);
      setTotal(res.meta?.total ?? items.length);
    } catch {
      if (mine !== seq.current) return;
      setRows([]);
      setPages(1);
      setTotal(0);
    } finally {
      if (mine === seq.current) {
        setSelectedId(null);
        setEcho({ text: query, field: f });
        setSearching(false);
      }
    }

    // Carrier and employer names are per-id lookups (the list response carries
    // only the ids, and there is no batch-by-id endpoint), so one page costs up
    // to 40 round-trips. Paint the grid first and fill those two columns in as
    // they land, rather than making the whole search wait on them.
    if (mine !== seq.current) return;
    if (items.length === 0) {
      setResolving(false);
      return;
    }
    setResolving(true);
    try {
      await Promise.all([
        ensureCarrierRecords(items.map((p) => p.carrier_id)),
        ensureEmployerNames(items.map((p) => p.employer_id).filter((x): x is number => x != null)),
      ]);
    } finally {
      if (mine === seq.current) {
        setNamesTick((t) => t + 1);
        setResolving(false);
      }
    }
  };

  // Re-derived when a name lookup lands (namesTick) so the cached names appear.
  const display = useMemo(
    () =>
      (rows ?? []).map((p) => ({
        plan: p,
        carrier: carrierRecord(p.carrier_id),
        employer: p.employer_id == null ? "No Employer" : employerName(p.employer_id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, namesTick],
  );

  const selected = rows?.find((r) => r.id === selectedId) ?? null;

  const apply = (plan: InsurancePlanRead | null) => {
    if (plan) onCopy(plan);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[940px] max-w-full rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wide">Copy From Existing Plan</span>
          </div>
          <button onClick={onClose} className="rounded px-1.5 py-0.5 hover:bg-white/15">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_200px_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">Search Text</span>
              <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void runSearch(1)}
                className={INPUT_CLS}
                placeholder="e.g. delta"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">Search For</span>
              <select
                value={field}
                onChange={(e) => setField(e.target.value as SearchField)}
                className={INPUT_CLS}
              >
                <option value="carrier">Carrier Name</option>
                <option value="group">Group #</option>
                <option value="payer">Payer ID</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">Search In</span>
              <select className={INPUT_CLS} defaultValue="all">
                <option value="all">All Insurance Plans</option>
              </select>
            </label>
            <button
              onClick={() => void runSearch(1)}
              disabled={searching || !text.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#3A6EA5] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F3A5F] disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
          {field === "group" && (
            <p className="mt-2 text-[11px] text-[#64748B]">Group # matches the whole value exactly.</p>
          )}
        </div>

        {/* Results */}
        <div className="px-4 py-3">
          {rows === null ? (
            <p className="py-10 text-center text-sm text-[#94A3B8]">
              Search for a plan to copy its configuration.
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#94A3B8]">
              No plans found for &lsquo;{echo?.text}&rsquo; on &lsquo;{FIELD_LABEL[echo?.field ?? "carrier"]}&rsquo;.
            </p>
          ) : (
            <>
              <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-[#1F6FB2]">
                We have found {total} plan{total === 1 ? "" : "s"} for your search &lsquo;{echo?.text}&rsquo; on
                &lsquo;{FIELD_LABEL[echo?.field ?? "carrier"]}&rsquo;.
                {resolving && (
                  <span className="ml-2 inline-flex items-center gap-1 font-semibold normal-case text-[#64748B]">
                    <Loader2 className="h-3 w-3 animate-spin" /> loading carrier &amp; employer names…
                  </span>
                )}
              </p>
              <div className="max-h-[46vh] overflow-auto rounded-md border-2 border-[#E2E8F0]">
                <table className="w-full min-w-[820px] text-left text-xs">
                  <thead className="sticky top-0 bg-[#3A6EA5] text-white">
                    <tr>
                      {["Ins Plan ID", "Group #", "Carrier ID", "Carrier Name", "Employer Name", "Created", "Modified"].map(
                        (h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2 font-bold uppercase tracking-wide">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {display.map(({ plan: p, carrier, employer }) => {
                      const isSel = p.id === selectedId;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          onDoubleClick={() => apply(p)}
                          className={`cursor-pointer ${isSel ? "bg-[#E8EFF7]" : "hover:bg-[#F7F9FC]"}`}
                        >
                          <td className="px-3 py-1.5 font-bold text-[#1F6FB2]">{p.id}</td>
                          <td className="px-3 py-1.5 text-[#1E293B]">{p.group_number || "—"}</td>
                          <td className="px-3 py-1.5 text-[#475569]">{carrier?.legacy_id || p.carrier_id}</td>
                          <td className="px-3 py-1.5 text-[#1E293B]">{carrier?.name ?? `#${p.carrier_id}`}</td>
                          <td className="px-3 py-1.5 text-[#475569]">{employer}</td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-[#475569]">{fmtDate(p.created_at)}</td>
                          {/* Plans expose no modified timestamp — see devreport INS-PT-8. */}
                          <td className="px-3 py-1.5 text-[#94A3B8]">—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-2 flex items-center gap-1">
                <PageBtn disabled={page <= 1 || searching} onClick={() => void runSearch(1)} label="First">
                  <ChevronsLeft className="h-4 w-4" />
                </PageBtn>
                <PageBtn disabled={page <= 1 || searching} onClick={() => void runSearch(page - 1)} label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </PageBtn>
                <span className="px-2 text-xs font-bold text-[#475569]">
                  Page {page} of {pages}
                </span>
                <PageBtn disabled={page >= pages || searching} onClick={() => void runSearch(page + 1)} label="Next">
                  <ChevronRight className="h-4 w-4" />
                </PageBtn>
                <PageBtn disabled={page >= pages || searching} onClick={() => void runSearch(pages)} label="Last">
                  <ChevronsRight className="h-4 w-4" />
                </PageBtn>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-lg border-t-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border-2 border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7]"
          >
            Close
          </button>
          <button
            onClick={() => apply(selected)}
            disabled={!selected}
            className="flex items-center gap-2 rounded-lg bg-[#3A6EA5] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F3A5F] disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Select
          </button>
        </div>
      </div>
    </div>
  );
}

function PageBtn({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-md border-2 border-[#E2E8F0] p-1 text-[#475569] hover:bg-[#E8EFF7] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

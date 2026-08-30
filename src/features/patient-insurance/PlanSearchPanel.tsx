// INSURANCE PLAN panel (left rail of the Add/Edit Plan screen).
//
// Lets staff search the tenant's insurance plans (by group #, carrier or payer
// id), add a brand-new plan (popup), and shows the selected plan's id, group #,
// carrier block and employer block — mirroring the legacy Denticon layout.

import { useState } from "react";
import { Search, Plus, Loader2, Eye } from "lucide-react";
import { listInsurancePlans } from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead } from "@/api/generated/model";
import { ensureCarrierNames, carrierName } from "@/components/setup/insurance/lookupService";
import { INPUT_CLS } from "./ui";
import type { PlanDisplay } from "./insuranceModel";

interface Props {
  planDisplay: PlanDisplay;
  groupNumber: string;
  onGroupNumberChange: (v: string) => void;
  onSelectPlan: (planId: number) => void;
  onAddNew: () => void;
  /** Open the read-only plan viewer for the currently selected plan. */
  onViewPlan: () => void;
}

export default function PlanSearchPanel({
  planDisplay,
  groupNumber,
  onGroupNumberChange,
  onSelectPlan,
  onAddNew,
  onViewPlan,
}: Props) {
  const [beginsWith, setBeginsWith] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchFor, setSearchFor] = useState("group");
  const [results, setResults] = useState<InsurancePlanRead[] | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    setSearching(true);
    try {
      const res = await listInsurancePlans({
        search: searchText.trim() || null,
        size: 25,
        sort: "id",
        order: "asc",
        is_active: true,
      });
      const items = res.items ?? [];
      await ensureCarrierNames(items.map((p) => p.carrier_id));
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="border-2 border-[#E2E8F0] rounded-lg bg-white p-3 space-y-3">
      <h3 className="text-[13px] font-bold text-[#1F6FB2] uppercase tracking-wide">Insurance Plan</h3>

      {/* Search controls */}
      <label className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
        <input type="checkbox" checked={beginsWith} onChange={(e) => setBeginsWith(e.target.checked)} className="w-3.5 h-3.5 accent-[#3A6EA5]" />
        Search By Beginning With
      </label>

      <div className="grid grid-cols-[64px_1fr] items-center gap-2">
        <span className="text-[11px] font-bold text-[#475569] uppercase">Search</span>
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          className={INPUT_CLS}
          placeholder="Search text…"
        />
        <span className="text-[11px] font-bold text-[#475569] uppercase">For</span>
        <select value={searchFor} onChange={(e) => setSearchFor(e.target.value)} className={INPUT_CLS}>
          <option value="group">Group #</option>
          <option value="carrier">Carrier</option>
          <option value="payer">Payer ID</option>
        </select>
        <span className="text-[11px] font-bold text-[#475569] uppercase">In</span>
        <select className={INPUT_CLS} defaultValue="all">
          <option value="all">All Insurance Plans</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAddNew}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#3A6EA5] text-white rounded-md hover:bg-[#1F3A5F] font-bold text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add New Ins Plan
        </button>
        <button
          onClick={() => void runSearch()}
          disabled={searching}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-md hover:bg-[#E8EFF7] font-bold text-xs disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Search
        </button>
      </div>

      {/* Search results */}
      {results !== null && (
        <div className="border-2 border-[#E2E8F0] rounded-md max-h-44 overflow-y-auto divide-y divide-[#F1F5F9]">
          {results.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[#94A3B8] text-center">No plans match.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPlan(p.id);
                  setResults(null);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[#F7F9FC]"
              >
                <div className="text-xs font-bold text-[#1E293B]">
                  {carrierName(p.carrier_id)} <span className="text-[#94A3B8]">· #{p.id}</span>
                </div>
                <div className="text-[11px] text-[#64748B]">
                  {[p.group_number ? `Grp ${p.group_number}` : null, p.plan_type].filter(Boolean).join(" · ") || "—"}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Plan id + view */}
      <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
        <div className="grid grid-cols-[64px_1fr] items-center gap-2">
          <span className="text-[11px] font-bold text-[#475569] uppercase">Plan ID</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1F3A5F]">{planDisplay.plan_id ?? "—"}</span>
            <button
              onClick={onViewPlan}
              disabled={planDisplay.plan_id == null}
              className="ml-auto flex items-center gap-1 px-2 py-1 border-2 border-[#E2E8F0] rounded-md text-[10px] font-bold text-[#475569] hover:bg-[#E8EFF7] disabled:opacity-40"
              title={planDisplay.plan_id == null ? "Select a plan first" : "View current insurance plan"}
            >
              <Eye className="w-3 h-3" /> View Plan
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-center gap-2">
          <span className="text-[11px] font-bold text-[#475569] uppercase">Group #</span>
          <input value={groupNumber} onChange={(e) => onGroupNumberChange(e.target.value)} className={INPUT_CLS} />
        </div>
      </div>

      {/* Carrier block */}
      <div className="pt-2 border-t border-[#E2E8F0]">
        <h4 className="text-[12px] font-bold text-[#1F6FB2] uppercase tracking-wide mb-1.5">Carrier</h4>
        <dl className="text-xs space-y-1">
          <Row label="Name" value={planDisplay.carrier_name} />
          <Row label="Payer ID" value={planDisplay.payer_id} />
          <Row label="Carrier ID" value={planDisplay.carrier_legacy_id} />
          <Row label="Type" value={planDisplay.carrier_type} />
          <Row label="Phone" value={planDisplay.carrier_phone} />
        </dl>
      </div>

      {/* Employer block */}
      <div className="pt-2 border-t border-[#E2E8F0]">
        <h4 className="text-[12px] font-bold text-[#1F6FB2] uppercase tracking-wide mb-1.5">Employer</h4>
        <dl className="text-xs space-y-1">
          <Row label="Name" value={planDisplay.employer_name} />
          <Row label="Location" value={planDisplay.employer_city} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#94A3B8] font-semibold">{label}</dt>
      <dd className="text-[#1E293B] font-medium text-right truncate">{value || "—"}</dd>
    </div>
  );
}

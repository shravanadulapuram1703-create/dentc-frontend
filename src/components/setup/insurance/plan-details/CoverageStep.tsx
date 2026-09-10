// INSURANCE DETAILS — Step 3 of 4: COVERAGE & LIMITATIONS.
//
// The plan's coverage table: one CATEGORY header row per legacy coverage
// category (Diagnostic, Diagnostic: X-Rays, …) with Ded. Waived / Coverage % /
// Frequency Limitation / Age Min / Age Max / Waiting Period, plus per-procedure
// EXCEPTION rows (ADA code) nested under their category. Editing a category
// header cascades to the exception rows under it that still inherit the value
// (legacy: "Editing category header values will affect the corresponding
// inherited field of procedure codes under that category").
//
// Every row here is an `insurance_coverage_rules` record (see planDetailsModel
// for the column mapping). The bottom "Change coverage table" select resets the
// rows to a template: the legacy default table (DEFCOVERAGE) or the tenant's
// Custom Coverage list.

import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2, ListOrdered, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { coverageCategoriesFor } from "@/services/coverageResolver";
import EntityPicker from "../EntityPicker";
import { loadProcedureCodes, codeDescription } from "../procedureCodeService";
import type { PickerOption } from "../lookupService";
import {
  type CoverageRow,
  type CoverageTableKind,
  COVERAGE_TABLE_OPTIONS,
  sortCoverageRows,
  isAdaCode,
} from "./planDetailsModel";
import type { PlanLookups } from "./planLookups";
import { WZ_INPUT, WZ_INPUT_SM, WZ_BTN_PRIMARY } from "./wizardUi";

type EditableKey = "ded_waived" | "coverage_pct" | "freq_limit" | "age_min" | "age_max" | "wait_period";

interface ExceptionDraft {
  code: string;
  label: string;
  parent_code: string;
  ded_waived: boolean;
  coverage_pct: string;
  freq_limit: string;
  age_min: string;
  age_max: string;
  wait_period: string;
}

const emptyDraft = (): ExceptionDraft => ({
  code: "",
  label: "",
  parent_code: "",
  ded_waived: false,
  coverage_pct: "100",
  freq_limit: "0",
  age_min: "0",
  age_max: "0",
  wait_period: "0",
});

export default function CoverageStep({
  rows,
  onRowsChange,
  lookups,
  tableKind,
  onResetTable,
  resetting,
  disabled = false,
}: {
  rows: CoverageRow[];
  onRowsChange: (rows: CoverageRow[]) => void;
  lookups: PlanLookups;
  tableKind: CoverageTableKind;
  onResetTable: (kind: CoverageTableKind) => void;
  resetting?: boolean;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<ExceptionDraft>(emptyDraft);
  const [addingCategory, setAddingCategory] = useState(false);
  const [codeScope, setCodeScope] = useState<string>("");

  const categoryLabel = useCallback(
    (code: string) => lookups.categories.find((c) => c.code === code)?.label ?? rows.find((r) => r.kind === "category" && r.code === code)?.description ?? code,
    [lookups.categories, rows],
  );

  const categoryRows = useMemo(() => rows.filter((r) => r.kind === "category"), [rows]);
  const missingCategories = useMemo(
    () => lookups.categories.filter((c) => !categoryRows.some((r) => r.code === c.code)),
    [lookups.categories, categoryRows],
  );

  const allWaived = categoryRows.length > 0 && categoryRows.every((r) => r.ded_waived);

  /** Resolve the category a procedure code sits under, preferring ones on this table. */
  const parentFor = useCallback(
    (code: string): string => {
      const cats = coverageCategoriesFor(code);
      const present = cats.find((c) => categoryRows.some((r) => r.code === c.cat));
      if (present) return present.cat;
      return cats.length ? cats[cats.length - 1]!.cat : "";
    },
    [categoryRows],
  );

  // ---- Row mutations -------------------------------------------------------

  const patchRow = (target: CoverageRow, patch: Partial<Pick<CoverageRow, EditableKey>>) => {
    const next = rows.map((r) => {
      if (r === target) return { ...r, ...patch };
      // Cascade to inherited exception values under an edited category header.
      if (target.kind === "category" && r.kind === "code" && r.parent_code === target.code) {
        const cascaded: Partial<CoverageRow> = {};
        for (const k of Object.keys(patch) as EditableKey[]) {
          if (r[k] === target[k]) (cascaded as Record<string, unknown>)[k] = patch[k];
        }
        return Object.keys(cascaded).length ? { ...r, ...cascaded } : r;
      }
      return r;
    });
    onRowsChange(next);
  };

  const removeRow = (target: CoverageRow) => {
    if (target.kind === "category") {
      const children = rows.filter((r) => r.kind === "code" && r.parent_code === target.code);
      const msg = children.length
        ? `Remove category "${target.description}" and its ${children.length} exception code${children.length === 1 ? "" : "s"}?`
        : `Remove category "${target.description}"?`;
      if (!confirm(msg)) return;
      onRowsChange(rows.filter((r) => r !== target && !(r.kind === "code" && r.parent_code === target.code)));
    } else {
      onRowsChange(rows.filter((r) => r !== target));
    }
  };

  const toggleAllWaived = (checked: boolean) => {
    onRowsChange(rows.map((r) => ({ ...r, ded_waived: checked })));
  };

  const addCategory = (code: string) => {
    const def = lookups.categories.find((c) => c.code === code);
    if (!def) return;
    onRowsChange(
      sortCoverageRows([
        ...rows,
        {
          id: null,
          kind: "category",
          code: def.code,
          parent_code: "",
          description: def.label,
          ded_waived: false,
          coverage_pct: def.default_pct,
          freq_limit: def.default_freq,
          age_min: "0",
          age_max: "0",
          wait_period: "0",
        },
      ]),
    );
    setAddingCategory(false);
  };

  // ---- Exception editor ----------------------------------------------------

  const searchCodes = useCallback(
    async (query: string): Promise<PickerOption[]> => {
      const map = await loadProcedureCodes();
      const q = query.trim().toLowerCase();
      const all = [...map.values()].filter((c) => isAdaCode(c.code) && c.is_active !== false);
      const scoped = codeScope ? all.filter((c) => coverageCategoriesFor(c.code).some((x) => x.cat === codeScope)) : all;
      const hits = (q ? scoped.filter((c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) : scoped).slice(0, 40);
      return hits.map((c) => ({ id: c.code, label: `${c.code} ${c.description}`, sub: categoryLabel(parentFor(c.code)) }));
    },
    [codeScope, parentFor, categoryLabel],
  );

  const pickCode = (id: number | string | null, label: string) => {
    if (id == null) {
      setDraft(emptyDraft());
      return;
    }
    const code = String(id).toUpperCase();
    const parent_code = parentFor(code);
    const parent = categoryRows.find((r) => r.code === parent_code);
    setDraft({
      code,
      label: label || `${code} ${codeDescription(code)}`,
      parent_code,
      ded_waived: parent?.ded_waived ?? false,
      coverage_pct: parent?.coverage_pct ?? "100",
      freq_limit: parent?.freq_limit ?? "0",
      age_min: parent?.age_min ?? "0",
      age_max: parent?.age_max ?? "0",
      wait_period: parent?.wait_period ?? "0",
    });
  };

  const addException = () => {
    if (!draft.code) {
      toast.error("Select a procedure code first");
      return;
    }
    if (rows.some((r) => r.kind === "code" && r.code === draft.code)) {
      toast.error(`${draft.code} already has an exception on this plan`);
      return;
    }
    const description = draft.label.replace(new RegExp(`^${draft.code}\\s*`, "i"), "").trim() || codeDescription(draft.code);
    onRowsChange(
      sortCoverageRows([
        ...rows,
        {
          id: null,
          kind: "code",
          code: draft.code,
          parent_code: draft.parent_code,
          description,
          ded_waived: draft.ded_waived,
          coverage_pct: draft.coverage_pct,
          freq_limit: draft.freq_limit,
          age_min: draft.age_min,
          age_max: draft.age_max,
          wait_period: draft.wait_period,
        },
      ]),
    );
    setDraft(emptyDraft());
  };

  const freqSelect = (value: string, onChange: (v: string) => void, small = true) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={small ? `${WZ_INPUT_SM} text-left` : WZ_INPUT}>
      {!lookups.frequencies.some((f) => f.code === value) && <option value={value}>Code {value}</option>}
      {lookups.frequencies.map((f) => (
        <option key={f.code} value={f.code}>
          {f.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-[#EA580C]">
        Editing category header values will affect the corresponding inherited field of procedure codes under that category.
      </p>

      <div className="rounded border border-[#CBD5E1]">
        <div className="max-h-[330px] overflow-auto">
          <table className="w-full min-w-[900px] text-[12px]">
            <thead className="sticky top-0 z-10 bg-[#1F6FB2] text-white">
              <tr>
                <th className="px-2 py-2 text-left font-bold">
                  <div className="relative inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAddingCategory((v) => !v)}
                      disabled={disabled || missingCategories.length === 0}
                      title="Add a category"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#1F6FB2] disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    Category
                    {addingCategory && (
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={(e) => e.target.value && addCategory(e.target.value)}
                        onBlur={() => setAddingCategory(false)}
                        className="absolute left-0 top-6 z-20 w-[320px] rounded border border-[#CBD5E1] bg-white px-2 py-1 text-[12px] text-[#1E293B]"
                      >
                        <option value="">Add category…</option>
                        {missingCategories.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </th>
                <th className="px-2 py-2 text-center font-bold">
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={allWaived} onChange={(e) => toggleAllWaived(e.target.checked)} disabled={disabled || categoryRows.length === 0} className="h-3.5 w-3.5 accent-white" />
                    Ded. Waived
                  </label>
                </th>
                <th className="px-2 py-2 text-right font-bold">Coverage (%)</th>
                <th className="px-2 py-2 text-left font-bold">Frequency Limitation</th>
                <th className="px-2 py-2 text-right font-bold">
                  Age Limitation
                  <br />
                  (Min)
                </th>
                <th className="px-2 py-2 text-right font-bold">
                  Age Limitation
                  <br />
                  (Max)
                </th>
                <th className="px-2 py-2 text-right font-bold">
                  Waiting Period
                  <br />
                  (Months)
                </th>
                <th className="px-2 py-2 text-center font-bold">
                  <Trash2 className="inline h-3.5 w-3.5" />
                </th>
              </tr>
            </thead>
            <tbody>
              {resetting ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[#64748B]">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading coverage table…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[#64748B]">
                    No coverage categories. Use ⊕ Category or choose a coverage table below.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.kind}-${r.code}-${r.id ?? i}`} className={`border-b border-[#E2E8F0] ${r.kind === "code" ? "bg-[#F8FAFC]" : ""}`}>
                    <td className={`px-2 py-1 ${r.kind === "code" ? "pl-7" : ""}`}>
                      <div className="flex items-center gap-1.5">
                        {r.kind === "category" ? (
                          <>
                            <span className="text-[#1E293B]">{r.description || categoryLabel(r.code)}</span>
                            <button
                              type="button"
                              onClick={() => setCodeScope((s) => (s === r.code ? "" : r.code))}
                              title={codeScope === r.code ? "Showing all codes in the exception picker" : "Scope the exception code picker to this category"}
                              className={`rounded p-0.5 ${codeScope === r.code ? "bg-[#1F6FB2] text-white" : "text-[#1F6FB2] hover:bg-[#E8EFF7]"}`}
                            >
                              <ListOrdered className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[10px] text-[#94A3B8]">{r.code}</span>
                          </>
                        ) : (
                          <span className="text-[#334155]">
                            <span className="font-semibold">{r.code}</span> {r.description}
                            {r.parent_code && <span className="ml-1 text-[10px] text-[#94A3B8]">({categoryLabel(r.parent_code)})</span>}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input type="checkbox" checked={r.ded_waived} onChange={(e) => patchRow(r, { ded_waived: e.target.checked })} disabled={disabled} className="h-3.5 w-3.5 accent-[#1F6FB2]" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" inputMode="decimal" value={r.coverage_pct} onChange={(e) => patchRow(r, { coverage_pct: e.target.value })} disabled={disabled} className={`${WZ_INPUT_SM} w-[80px]`} />
                    </td>
                    <td className="px-2 py-1">{freqSelect(r.freq_limit, (v) => patchRow(r, { freq_limit: v }))}</td>
                    <td className="px-2 py-1">
                      <input type="text" inputMode="numeric" value={r.age_min} onChange={(e) => patchRow(r, { age_min: e.target.value })} disabled={disabled} className={`${WZ_INPUT_SM} w-[80px]`} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" inputMode="numeric" value={r.age_max} onChange={(e) => patchRow(r, { age_max: e.target.value })} disabled={disabled} className={`${WZ_INPUT_SM} w-[80px]`} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" inputMode="numeric" value={r.wait_period} onChange={(e) => patchRow(r, { wait_period: e.target.value })} disabled={disabled} className={`${WZ_INPUT_SM} w-[80px]`} />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button type="button" onClick={() => removeRow(r)} disabled={disabled} title="Remove" className="rounded p-1 text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception editor */}
      <div className="rounded border border-[#CBD5E1] bg-[#F7F9FC] p-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[1.6fr_0.6fr_0.8fr_1.6fr_0.8fr_0.8fr_0.8fr_auto] md:items-end">
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Code</div>
            <EntityPicker valueId={draft.code || null} valueLabel={draft.label} onChange={pickCode} search={searchCodes} placeholder={codeScope ? `Codes in ${categoryLabel(codeScope)}…` : "Search procedure code…"} allowClear disabled={disabled} />
            <div className="mt-0.5 text-[10px] italic text-[#475569]">Category: {draft.code ? categoryLabel(draft.parent_code) || "Uncategorised" : "—"}</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Ded. Waived</div>
            <input type="checkbox" checked={draft.ded_waived} onChange={(e) => setDraft({ ...draft, ded_waived: e.target.checked })} disabled={disabled} className="mb-2 h-4 w-4 accent-[#1F6FB2]" />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Coverage (%)</div>
            <input type="text" inputMode="decimal" value={draft.coverage_pct} onChange={(e) => setDraft({ ...draft, coverage_pct: e.target.value })} disabled={disabled} className={`${WZ_INPUT} text-right`} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Frequency Limitation</div>
            {freqSelect(draft.freq_limit, (v) => setDraft({ ...draft, freq_limit: v }), false)}
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Age Limitation (Min)</div>
            <input type="text" inputMode="numeric" value={draft.age_min} onChange={(e) => setDraft({ ...draft, age_min: e.target.value })} disabled={disabled} className={`${WZ_INPUT} text-right`} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Age Limitation (Max)</div>
            <input type="text" inputMode="numeric" value={draft.age_max} onChange={(e) => setDraft({ ...draft, age_max: e.target.value })} disabled={disabled} className={`${WZ_INPUT} text-right`} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#1F3A5F]">Waiting Period</div>
            <input type="text" inputMode="numeric" value={draft.wait_period} onChange={(e) => setDraft({ ...draft, wait_period: e.target.value })} disabled={disabled} className={`${WZ_INPUT} text-right`} />
          </div>
          <div className="mb-[18px]">
            <button type="button" onClick={addException} disabled={disabled || !draft.code} className={WZ_BTN_PRIMARY}>
              <Plus className="h-3.5 w-3.5" /> Add New Exception
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[#E2E8F0] pt-2 text-[12px] text-[#1F3A5F]">
        <span>Change coverage table (will reset records above):</span>
        <select
          value={tableKind}
          onChange={(e) => {
            const kind = e.target.value as CoverageTableKind;
            if (rows.length > 0 && !confirm("Replace every row above with the selected coverage table? Unsaved edits to the rows will be lost.")) return;
            onResetTable(kind);
          }}
          disabled={disabled || resetting}
          className={`${WZ_INPUT} w-[360px]`}
        >
          {COVERAGE_TABLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Search, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  listCodeBundleItems,
  createCodeBundleItem,
  updateCodeBundleItem,
  deleteCodeBundleItem,
} from "@/api/generated/endpoints/procedures/procedures";
import type { CodeBundleItemRead } from "@/api/generated/model";
import {
  loadProcedureCodes,
  codeDescription,
  searchProcedureCodes,
} from "@/components/setup/insurance/procedureCodeService";
import type { PickerOption } from "@/components/setup/insurance/lookupService";

interface IncludedCodesProps {
  /** The parent code-bundle (explosion code) id. */
  bundleId: number;
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

/**
 * Included-codes editor for an explosion code (code bundle). CRUD against
 * /api/v1/code-bundle-items filtered by bundle_id. Procedure descriptions are
 * joined from the cached procedure-code map; the "add" picker debounces against
 * the same source.
 */
export default function IncludedCodes({ bundleId }: IncludedCodesProps) {
  const [items, setItems] = useState<CodeBundleItemRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setCodesLoaded] = useState(0); // bump to re-render once descriptions resolve

  // Add-picker state.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [savingTooth, setSavingTooth] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res] = await Promise.all([
        listCodeBundleItems({ bundle_id: bundleId, size: 200, sort: "sort_order", order: "asc" }),
        loadProcedureCodes()
          .then(() => setCodesLoaded((n) => n + 1))
          .catch(() => undefined),
      ]);
      setItems(res.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load included codes");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounced procedure-code search for the add picker.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const r = await searchProcedureCodes(query);
        setResults(r);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const addCode = async (procedureCode: string) => {
    if (items.some((i) => i.procedure_code === procedureCode)) {
      toast.info("Code already included");
      setQuery("");
      setOpen(false);
      return;
    }
    setAdding(true);
    try {
      const nextOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0) + 1;
      await createCodeBundleItem({
        bundle_id: bundleId,
        procedure_code: procedureCode,
        sort_order: nextOrder,
      });
      toast.success(`Added ${procedureCode}`);
      setQuery("");
      setResults([]);
      setOpen(false);
      await load();
    } catch (e: unknown) {
      toast.error("Add failed", {
        description: e instanceof Error ? e.message : "Could not add code",
      });
    } finally {
      setAdding(false);
    }
  };

  const saveTooth = async (item: CodeBundleItemRead, tooth: string) => {
    const next = tooth.trim() === "" ? null : tooth.trim();
    if ((item.tooth ?? null) === next) return;
    setSavingTooth(item.id);
    try {
      await updateCodeBundleItem(item.id, { tooth: next });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, tooth: next } : i)));
    } catch (e: unknown) {
      toast.error("Update failed", {
        description: e instanceof Error ? e.message : "Could not update tooth/quadrant",
      });
      await load();
    } finally {
      setSavingTooth(null);
    }
  };

  const removeItem = async (item: CodeBundleItemRead) => {
    setDeletingId(item.id);
    try {
      await deleteCodeBundleItem(item.id);
      toast.success(`Removed ${item.procedure_code}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e: unknown) {
      toast.error("Remove failed", {
        description: e instanceof Error ? e.message : "Could not remove code",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Included Codes</h3>
        <span className="text-xs text-[#94A3B8] font-bold">{items.length} code(s)</span>
      </div>

      {/* Add picker */}
      <div className="relative mb-4 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a procedure code to add…"
          className={`${inputCls} pl-10`}
          disabled={adding}
        />
        {adding && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#3A6EA5]" />
        )}
        {open && query.trim() && (
          <div className="absolute z-20 mt-1 w-full bg-white border-2 border-[#E2E8F0] rounded-lg shadow-lg max-h-72 overflow-auto">
            {searching ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-[#64748B]">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[#94A3B8]">No matching codes</div>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => void addCode(String(r.id))}
                  className="w-full text-left px-3 py-2 hover:bg-[#F1F5F9] border-b border-[#F1F5F9] last:border-0"
                >
                  <span className="text-sm font-bold text-[#1E293B]">{r.label}</span>
                  {r.sub ? <span className="text-xs text-[#64748B]"> — {r.sub}</span> : null}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Items table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-[#64748B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#3A6EA5]" />
          <span className="text-sm font-bold">Loading included codes…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <p className="text-sm font-bold text-[#DC2626]">Unable to load included codes</p>
          <p className="text-xs text-[#64748B] max-w-md">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-1 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <Layers className="w-9 h-9 text-[#CBD5E1]" />
          <p className="text-sm font-bold text-[#64748B]">No codes in this explosion yet</p>
          <p className="text-xs text-[#94A3B8] max-w-md">
            Use the search above to add the procedure codes this explosion posts.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border-2 border-[#E2E8F0]">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Code", "Description", "Tooth / Quadrant", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[#F7F9FC] transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">{item.procedure_code}</td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">
                    {codeDescription(item.procedure_code) || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="relative max-w-[12rem]">
                      <input
                        type="text"
                        defaultValue={item.tooth ?? ""}
                        onBlur={(e) => void saveTooth(item, e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                      />
                      {savingTooth === item.id && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[#3A6EA5]" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void removeItem(item)}
                      disabled={deletingId === item.id}
                      className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                      title="Remove"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-[#DC2626]" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] text-[#94A3B8] flex items-center gap-1">
        <Plus className="w-3 h-3" /> Tooth / Quadrant is optional — leave blank to apply the code
        without a tooth.
      </p>
    </section>
  );
}

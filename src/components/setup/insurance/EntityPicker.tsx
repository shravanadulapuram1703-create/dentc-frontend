import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, ChevronDown } from "lucide-react";
import type { PickerOption } from "./lookupService";

// Reusable debounced async combobox for picking a carrier / employer by id.
// Backed by the list endpoints' server-side `search`, so it scales to the
// ~1.3k carriers / ~4.3k employers without preloading.

export default function EntityPicker({
  valueId,
  valueLabel,
  onChange,
  search,
  placeholder,
  allowClear,
  disabled,
}: {
  valueId: number | string | null;
  valueLabel: string;
  onChange: (id: number | string | null, label: string) => void;
  search: (query: string) => Promise<PickerOption[]>;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced search when open.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await search(query);
        if (alive) setOptions(res);
      } catch {
        if (alive) setOptions([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open, query, search]);

  const INPUT_CLS =
    "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

  return (
    <div className="relative" ref={boxRef}>
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setQuery("");
            setOpen(true);
          }}
          className={`${INPUT_CLS} flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={valueId == null ? "text-[#94A3B8]" : "text-[#1E293B]"}>
            {valueId == null ? placeholder ?? "Select…" : valueLabel || `#${valueId}`}
          </span>
          <span className="flex items-center gap-1">
            {allowClear && valueId != null && (
              <X
                className="w-4 h-4 text-[#94A3B8] hover:text-[#DC2626]"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null, "");
                }}
              />
            )}
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          </span>
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder ?? "Search…"}
            className={`${INPUT_CLS} pl-10`}
          />
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border-2 border-[#E2E8F0] rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-[#64748B]">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-[#64748B]">No matches</div>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id, o.label);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#F7F9FC] border-b border-[#F1F5F9] last:border-b-0"
              >
                <div className="text-sm font-semibold text-[#1E293B]">{o.label}</div>
                {o.sub && <div className="text-xs text-[#64748B]">{o.sub}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

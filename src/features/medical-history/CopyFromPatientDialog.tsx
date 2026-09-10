import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { PatientRead } from "@/api/generated/model";
import {
  COPY_SCOPE_LABELS,
  COPY_SCOPE_NOUNS,
  searchPatients,
  type CopyScope,
} from "./medicalHistoryService";

interface Props {
  scope: CopyScope;
  /** Excluded from results — copying a chart onto itself is never intended. */
  currentPatientId: number;
  onCancel: () => void;
  onConfirm: (sourcePatientId: number, sourceLabel: string) => void;
  busy?: boolean;
}

/** "1992-10-21" → "10/21/1992". The app is MM/DD/YYYY throughout; never
 *  `new Date` on a bare date string, which parses as UTC and shifts the day. */
const fmtDob = (iso?: string | null) => {
  const [y, m, d] = (iso ?? "").slice(0, 10).split("-");
  return y && m && d ? `${m}/${d}/${y}` : "";
};

/**
 * Source picker for the legacy "***Copy Medical History***" dropdown.
 *
 * The copy lands in the form **unsaved**: bringing one patient's medical answers
 * onto another chart is exactly the kind of thing that must be reviewed before
 * it is committed, so the user still has to press Save.
 */
export default function CopyFromPatientDialog({
  scope,
  currentPatientId,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PatientRead[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PatientRead | null>(null);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const rows = await searchPatients(query);
        if (!cancelled) setResults(rows.filter((r) => r.id !== currentPatientId));
      } catch {
        if (!cancelled) setError("Patient search failed.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, currentPatientId]);

  const label = (p: PatientRead) =>
    `${p.last_name ?? ""}, ${p.first_name ?? ""}`.replace(/^, |, $/g, "").trim() || `#${p.id}`;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-3 rounded-t-lg">
          <div>
            <h2 className="font-bold text-sm uppercase tracking-wide">
              {COPY_SCOPE_LABELS[scope]}
            </h2>
            <p className="text-xs text-white/80">Choose the patient to copy from</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by name, chart no, phone or email…"
              className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
            />
            {searching && (
              <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5] absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="border border-[#E2E8F0] rounded max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-sm text-[#64748B] px-3 py-6 text-center">
                {term.trim().length < 2
                  ? "Type at least 2 characters to search."
                  : searching
                    ? "Searching…"
                    : "No matching patients."}
              </p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-3 py-2 border-b border-[#F1F5F9] text-sm flex items-center justify-between gap-3 ${
                    selected?.id === p.id ? "bg-[#EEF4FB]" : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span className="font-medium text-[#1E293B]">{label(p)}</span>
                  <span className="text-xs text-[#64748B] shrink-0">
                    DOB {fmtDob(p.dob)} · Chart {p.chart_no || "—"} · ID {p.id}
                  </span>
                </button>
              ))
            )}
          </div>

          {selected && (
            <p className="text-sm text-[#1E293B] bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Brings <strong>{COPY_SCOPE_NOUNS[scope]}</strong> from{" "}
              <strong>{label(selected)}</strong> into this chart, replacing what is there.
              Nothing is written until you press Save, so you can review it first.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border-2 border-[#1F3A5F] text-[#1F3A5F] text-sm font-semibold hover:bg-[#F7F9FC]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || busy}
            onClick={() => selected && onConfirm(selected.id, label(selected))}
            className={`px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 ${
              selected && !busy
                ? "bg-[#2FB9A7] text-white hover:bg-[#26a396]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Copying…" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

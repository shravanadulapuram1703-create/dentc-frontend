import { X } from 'lucide-react';
import type { DicomImagingFilters } from '../types';
import { MODALITY_LABELS } from '../utils/dicomAssets';

interface DicomFiltersProps {
  value: DicomImagingFilters;
  onChange: (next: DicomImagingFilters) => void;
  /** Modality codes actually present in the (unfiltered) data, for the dropdown. */
  availableModalities: string[];
  disabled?: boolean;
}

const fieldClass =
  'h-9 rounded-md border border-[#CBD5E1] bg-white px-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]/40 disabled:opacity-50';

/** Modality / tooth / date-range filters wired to the tree endpoint query params (§3.1). */
export default function DicomFilters({
  value,
  onChange,
  availableModalities,
  disabled,
}: DicomFiltersProps) {
  const hasFilters =
    Boolean(value.modality) ||
    value.tooth != null ||
    Boolean(value.date_from) ||
    Boolean(value.date_to);

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[#64748B]">Modality</span>
        <select
          className={fieldClass}
          value={value.modality ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, modality: e.target.value || null })}
        >
          <option value="">All</option>
          {availableModalities.map((code) => (
            <option key={code} value={code}>
              {MODALITY_LABELS[code] ?? code}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[#64748B]">Tooth</span>
        <input
          type="number"
          min={1}
          max={32}
          inputMode="numeric"
          placeholder="Any"
          className={`${fieldClass} w-20`}
          value={value.tooth ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value);
            onChange({ ...value, tooth: n != null && Number.isFinite(n) ? n : null });
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[#64748B]">From</span>
        <input
          type="date"
          className={fieldClass}
          value={value.date_from ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, date_from: e.target.value || null })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[#64748B]">To</span>
        <input
          type="date"
          className={fieldClass}
          value={value.date_to ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, date_to: e.target.value || null })}
        />
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({})}
          disabled={disabled}
          className="h-9 inline-flex items-center gap-1 px-2.5 rounded-md text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}

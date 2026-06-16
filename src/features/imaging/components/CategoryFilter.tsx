import { IMAGING_CATEGORIES } from '../constants';

interface CategoryFilterProps {
  /** Selected category, or null for "All". */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Per-category counts to show alongside labels. */
  counts: Record<string, number>;
  total: number;
}

/** Segmented control: "All" + one chip per imaging category. */
export default function CategoryFilter({ value, onChange, counts, total }: CategoryFilterProps) {
  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
      active
        ? 'bg-[#3A6EA5] text-white border-[#3A6EA5]'
        : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#3A6EA5] hover:text-[#3A6EA5]'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onChange(null)} className={chip(value === null)}>
        All <span className="opacity-70">({total})</span>
      </button>
      {IMAGING_CATEGORIES.map((cat) => {
        const count = counts[cat] ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={chip(value === cat)}
          >
            {cat} <span className="opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

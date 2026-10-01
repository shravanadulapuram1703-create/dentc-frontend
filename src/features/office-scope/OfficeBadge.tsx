import { useOfficeOptions } from "./useOfficeOptions";
import { useOfficeScope } from "./OfficeScopeContext";

interface Props {
  office_id: number | null | undefined;
  /** "chip" (default) shows the short id; "name" shows the full office name. */
  variant?: "chip" | "name";
  className?: string;
}

/**
 * Names a row's office. Neutral when it is the working office, amber
 * "Other office: MOON" when it is not, grey "Unassigned" when null — so a record
 * that belongs elsewhere is always visible without ever hiding it.
 */
export function OfficeBadge({ office_id, variant = "chip", className = "" }: Props) {
  const { office_id: working } = useOfficeScope();
  const { data: options } = useOfficeOptions();

  const base =
    "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap";

  if (office_id == null) {
    return (
      <span className={`${base} bg-slate-100 text-slate-500 ${className}`} title="No office on this record">
        Unassigned
      </span>
    );
  }

  const office = options?.find((o) => o.id === office_id);
  const short = office?.short_id || office?.name || `Office ${office_id}`;
  const label = variant === "name" ? office?.name || short : short;
  const other = working != null && office_id !== working;

  return (
    <span
      className={`${base} ${other ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"} ${className}`}
      title={office?.name ?? `Office ${office_id}`}
    >
      {other ? `Other office: ${label}` : label}
    </span>
  );
}

// Display formatters shared by the Patient Overview panels.
//
// Every value the Overview renders comes from the backend in snake_case and is
// formatted here at the edge — no camelCase view models, per CLAUDE.md.

/** MM/DD/YYYY, or `dash` when there is nothing to show. */
export const fmt_date = (value?: string | null, dash = "-"): string => {
  if (!value) return dash;
  // A plain YYYY-MM-DD must be formatted from its parts — `new Date("YYYY-MM-DD")`
  // parses as UTC midnight and shifts back a day in negative-offset timezones.
  const date_only = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (date_only) {
    const [, y, m, d] = date_only;
    return `${m}/${d}/${y}`;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? dash
    : d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
};

/** "14:45:00" -> "2:45 PM". */
export const fmt_time = (value?: string | null, dash = "-"): string => {
  if (!value) return dash;
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return value;
  const hour = Number(m[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m[2]} ${suffix}`;
};

/** Always a dollar amount — the money grids show $0.00, never a dash. */
export const money = (value?: number | string | null): string => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return "$0.00";
  return n < 0 ? `($${Math.abs(n).toFixed(2)})` : `$${n.toFixed(2)}`;
};

/** Dollar amount, or a dash when the backend has no value at all. */
export const money_or_dash = (value?: number | string | null, dash = "-"): string => {
  if (value == null || value === "") return dash;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isNaN(n) ? dash : money(n);
};

/** Whole years between `dob` and today; null when dob is missing/unparseable. */
export const age_from_dob = (dob?: string | null): number | null => {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  const birth = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month_diff = today.getMonth() - birth.getMonth();
  if (month_diff < 0 || (month_diff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

/** Legacy sex column is a single letter. */
export const sex_letter = (gender?: string | null): string => {
  if (!gender) return "-";
  const g = gender.trim().toUpperCase();
  if (g.startsWith("M")) return "M";
  if (g.startsWith("F")) return "F";
  return g.slice(0, 1);
};

/** "M" / "Male" -> "Male" (used in the identity block). */
export const sex_word = (gender?: string | null): string => {
  if (!gender) return "-";
  const g = gender.trim().toUpperCase();
  if (g === "M" || g === "MALE") return "Male";
  if (g === "F" || g === "FEMALE") return "Female";
  return gender;
};

/** "cell_phone" -> "Cell Phone"; passes through already-readable labels. */
export const contact_pref_label = (code?: string | null): string => {
  if (!code) return "-";
  const map: Record<string, string> = {
    home_phone: "Home Phone",
    cell_phone: "Cell Phone",
    work_phone: "Work Phone",
    email: "Email",
    text: "Text",
    mail: "Mail",
  };
  return map[code] ?? code;
};

/** "Last, First (Preferred)" exactly as the legacy header renders it. */
export const patient_display_name = (p?: {
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
} | null): string => {
  if (!p) return "-";
  const base = [p.last_name, p.first_name].filter(Boolean).join(", ");
  if (!base) return "-";
  return p.preferred_name ? `${base} (${p.preferred_name})` : base;
};

/**
 * Legacy recall interval column, e.g. "6 M + 1D" / "3 Y + 1D".
 * `interval_unit` is the legacy unit ("month"/"year"); `interval_months` is the count.
 */
export const recall_interval_label = (
  interval_months?: number | null,
  interval_unit?: string | null,
): string => {
  if (interval_months == null) return "-";
  const unit = (interval_unit ?? "month").trim().toLowerCase();
  const suffix = unit.startsWith("y") ? "Y" : unit.startsWith("w") ? "W" : unit.startsWith("d") ? "D" : "M";
  return `${interval_months} ${suffix}`;
};

/** Today as YYYY-MM-DD in local time (backend dates are plain local dates). */
export const today_iso = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

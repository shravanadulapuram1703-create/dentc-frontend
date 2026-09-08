// Timestamp formatting for the SMS thread and log.

const DAY_MS = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** `2:04 PM` */
export function fmtClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** `Today` / `Yesterday` / `Tuesday, Sep 2` / `Jan 8, 2017` */
export function fmtDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(
    [],
    sameYear ? { weekday: "long", month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
  );
}

/** `Sep 2, 2026 2:04 PM` — the log-table stamp. */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} ${fmtClock(iso)}`;
}

/** `5m ago` / `3h ago` / `2d ago` / date */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function sameDay(aIso: string, bIso: string): boolean {
  return startOfDay(new Date(aIso)) === startOfDay(new Date(bIso));
}

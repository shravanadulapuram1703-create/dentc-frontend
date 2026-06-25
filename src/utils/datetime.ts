/**
 * Date/time formatting helpers.
 *
 * Backend timestamps come back as ISO UTC strings. Audit/login displays must be
 * shown in US time with an explicit zone label (KAN-19) rather than the viewer's
 * local timezone, so the practice always reads a consistent US clock.
 */

/** US timezone used for all audit/login displays. */
export const US_DISPLAY_TIME_ZONE = "America/New_York";

/**
 * Format an ISO (UTC) timestamp in US Eastern time with a zone label,
 * e.g. "Jun 21, 2026, 06:55 PM EDT". Returns `fallback` for empty input and
 * echoes the original string if it can't be parsed.
 */
export function formatUsDateTime(
  iso?: string | null,
  fallback = "—"
): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: US_DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

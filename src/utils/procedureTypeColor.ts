/**
 * Shared procedure-type color mapping for the Scheduler.
 *
 * Procedure types come from the backend `definitions` table and may carry a
 * `color` that is either a full Tailwind class set ("bg-red-100 border-red-400
 * text-red-900"), a single Tailwind background ("bg-red-100"), or an arbitrary
 * custom class. This normalizes any of those to a complete border/bg/text class
 * set so appointment blocks and swatches render consistently across the
 * Scheduler page and its modals.
 */

const DEFAULT_CLASSES = "bg-gray-100 border-gray-400 text-gray-900";

/** Map a procedure-type `color` value to a complete Tailwind class set. */
export const procedureTypeColorClasses = (
  color?: string | null,
): string => {
  if (!color) return DEFAULT_CLASSES;
  const c = color.trim();

  // Already a full class set (has both border- and text-).
  if (c.includes("border-") && c.includes("text-")) return c;

  // Single Tailwind background like "bg-red-100" → expand to a full set.
  const bgMatch = c.match(/bg-(\w+)-(\d+)/);
  if (bgMatch) {
    const name = bgMatch[1];
    return `bg-${name}-100 border-${name}-400 text-${name}-900`;
  }

  // Unrecognized (e.g. a custom class) — use as-is.
  return c;
};

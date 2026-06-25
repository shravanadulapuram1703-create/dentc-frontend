// Non-hook concerns for the Treatment Plan tab. Data fetching/mutation use the
// generated React Query hooks directly in the component (idiomatic); this module
// wraps the shared procedure-code cache for the entry panel (code search, exact
// match, category list) so the page stays focused on state + mutations.

import { loadProcedureCodes, codeDescription } from '@/components/setup/insurance/procedureCodeService';
import type { ProcedureCodeRead } from '@/api/generated/model';
import { PROC_CATEGORIES, codeInCategory, type ProcCategory } from './txModel';

export { loadProcedureCodes, codeDescription };

/** All active codes belonging to a legacy category button, sorted by code. */
export async function codesInCategory(cat: ProcCategory): Promise<ProcedureCodeRead[]> {
  const map = await loadProcedureCodes();
  return [...map.values()]
    .filter((c) => c.is_active !== false && codeInCategory(c.code, cat))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Resolve a typed entry into matching codes. Matches on exact code, code prefix,
 * user/legacy code, and description substring. Returns the full match list; the
 * caller decides whether the first is an "exact match" (auto-add) or a pick list.
 */
export async function matchCodes(query: string): Promise<ProcedureCodeRead[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const map = await loadProcedureCodes();
  const all = [...map.values()].filter((c) => c.is_active !== false);
  const exact = all.filter((c) => c.code.toLowerCase() === q || (c.legacy_code ?? '').toLowerCase() === q);
  if (exact.length) return exact;
  return all
    .filter(
      (c) =>
        c.code.toLowerCase().startsWith(q) ||
        (c.legacy_code ?? '').toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    )
    .sort((a, b) => a.code.localeCompare(b.code))
    .slice(0, 50);
}

/** A query is an exact, unambiguous hit when exactly one code equals it. */
export function isExactMatch(query: string, matches: ProcedureCodeRead[]): boolean {
  const q = query.trim().toLowerCase();
  const first = matches[0];
  return matches.length === 1 && !!first && (first.code.toLowerCase() === q || (first.legacy_code ?? '').toLowerCase() === q);
}

export { PROC_CATEGORIES };

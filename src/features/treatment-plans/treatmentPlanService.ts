// Non-hook concerns for the Treatment Plan tab. Data fetching/mutation use the
// generated React Query hooks directly in the component (idiomatic); this module
// wraps the shared procedure-code cache for the entry panel (code search, exact
// match, category list) so the page stays focused on state + mutations.

import { loadProcedureCodes, codeDescription, cachedProcedureCode } from '@/components/setup/insurance/procedureCodeService';
import { getProcedureCodeEligibility, listIcdCodes } from '@/api/generated/endpoints/procedures/procedures';
import { listUsers } from '@/api/generated/endpoints/users/users';
import { listAllReferrals } from '@/components/setup/referrals/referralService';
import type { IcdCodeRead, ProcedureCodeRead, UserRead } from '@/api/generated/model';
import { PROC_CATEGORIES, codeInCategory, type ProcCategory } from './txModel';

export { loadProcedureCodes, codeDescription, cachedProcedureCode };

// ---- Provider eligibility (legacy "Change Provider" restriction) ----------
//
// Legacy Denticon only lets you assign a provider who is *eligible* to perform
// the selected procedures (M08 Change Provider, step 3). The backend answers it
// in one call: `GET /procedure-codes/eligibility?codes=` returns, per code, the
// providers holding an assignment, plus `eligible_for_all` — the intersection
// for a multi-row selection. `null` there means nothing is restricted, i.e.
// every provider is eligible (an EMPTY assignment set = unrestricted; confirmed
// by the backend team — there is no legacy file to seed from, assignments are
// a Setup task via PUT /providers/{id}/procedure-codes).

/** Provider ids eligible for ALL of `codes`, or `null` when unrestricted. */
export async function loadEligibleProviderIds(codes: string[]): Promise<Set<string> | null> {
  if (codes.length === 0) return null;
  const res = await getProcedureCodeEligibility({ codes: codes.join(',') });
  return res.eligible_for_all ? new Set(res.eligible_for_all) : null;
}

// ---- Edit Treatment lookups --------------------------------------------------

/** Every active user (Treatment Counselor dropdown), paging past the 200 cap. */
export async function loadAllUsers(): Promise<UserRead[]> {
  const first = await listUsers({ page: 1, size: 200, sort: 'username', order: 'asc' });
  const rows = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  for (let page = 2; page <= pages; page++) {
    const res = await listUsers({ page, size: 200, sort: 'username', order: 'asc' });
    rows.push(...(res.items ?? []));
  }
  return rows.filter((u) => u.is_active !== false);
}

/** ICD-10 library search for the Dental Cross Coding list box. */
export async function searchIcdCodes(query: string): Promise<IcdCodeRead[]> {
  // No is_active filter: the seeded ICD library rows are not flagged active.
  const res = await listIcdCodes({ search: query, size: 25, page: 1 });
  return res.items ?? [];
}

export { listAllReferrals };

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

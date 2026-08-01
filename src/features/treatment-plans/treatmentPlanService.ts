// Non-hook concerns for the Treatment Plan tab. Data fetching/mutation use the
// generated React Query hooks directly in the component (idiomatic); this module
// wraps the shared procedure-code cache for the entry panel (code search, exact
// match, category list) so the page stays focused on state + mutations.

import { loadProcedureCodes, codeDescription } from '@/components/setup/insurance/procedureCodeService';
import { listProviderProcedureCodes } from '@/api/generated/endpoints/provider-setup/provider-setup';
import type { ProcedureCodeRead } from '@/api/generated/model';
import { PROC_CATEGORIES, codeInCategory, type ProcCategory } from './txModel';

export { loadProcedureCodes, codeDescription };

// ---- Provider eligibility (legacy "Change Provider" restriction) ----------
//
// Legacy Denticon only lets you assign a provider who is *eligible* to perform
// the selected procedures ("Denticon will only allow you to assign providers
// eligible to perform those specific procedures" — M08 Change Provider, step 3).
// Eligibility is the provider's assigned procedure-code allow-list
// (`GET /providers/{id}/procedure-codes`).
//
// Convention: an **empty** allow-list means the provider is *unrestricted*
// (eligible for every code) — the standard allow-list semantics and the safe
// default while the backend is unseeded (all providers currently return `[]`,
// see backend gap PLAN-16). A provider is filtered out only when they have an
// explicit allow-list that does *not* cover every selected code.

/** providerId → set of eligible codes, or `null` when unrestricted (empty list / unknown). */
export type ProviderEligibility = Map<string, Set<string> | null>;

/** Fetch each provider's assigned procedure-code allow-list (parallel, best-effort). */
export async function loadProviderEligibility(providerIds: string[]): Promise<ProviderEligibility> {
  const entries = await Promise.all(
    providerIds.map(async (id) => {
      try {
        const codes = await listProviderProcedureCodes(id);
        const arr = Array.isArray(codes) ? codes : [];
        // Empty allow-list = unrestricted (eligible for all).
        return [id, arr.length ? new Set(arr.map((c) => c.code)) : null] as const;
      } catch {
        // On error, don't block the provider — treat as unrestricted.
        return [id, null] as const;
      }
    }),
  );
  return new Map(entries);
}

/** True when the provider may perform every one of `codes` (unrestricted ⇒ true). */
export function providerEligibleFor(
  eligibility: ProviderEligibility | undefined,
  providerId: string,
  codes: string[],
): boolean {
  if (!eligibility) return true;
  const set = eligibility.get(providerId);
  if (!set) return true; // unrestricted / unknown
  return codes.every((c) => set.has(c));
}

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

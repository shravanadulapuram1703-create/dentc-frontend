// Lookup lists for the INSURANCE DETAILS wizard, read from the backend's
// `definitions` table (group_code DEFCOVERAGE / FREQUENCYLIMITATIONS /
// INSLIMITATIONS / PLANTYPE / PLANSUBTYPE) with the canonical legacy lists as
// fallback when a group is unseeded or unreachable.
//
// The seeded groups are DUPLICATED several times over in this tenant (each
// row appears ~5×, devreport PLAN-DTL-6), so every list is de-duplicated on its
// natural key before use.

import { listDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import type { DefinitionRead } from "@/api/generated/model";
import {
  type FrequencyOption,
  type CoverageCategoryDef,
  type CodeGroupDef,
  FREQUENCY_FALLBACK,
  COVERAGE_CATEGORY_FALLBACK,
  CODE_GROUP_FALLBACK,
  PLAN_TYPE_FALLBACK,
} from "./planDetailsModel";

export interface PlanLookups {
  frequencies: FrequencyOption[];
  categories: CoverageCategoryDef[];
  code_groups: CodeGroupDef[];
  plan_types: string[];
  /** Reporting subtypes: label + the plan type they belong to. */
  plan_subtypes: { label: string; plan_type: string }[];
  /** Which groups came from the backend (for the devreport banner). */
  sources: Record<string, "backend" | "fallback">;
}

const TTL_MS = 5 * 60_000;
let cache: { at: number; value: PlanLookups } | null = null;
let inflight: Promise<PlanLookups> | null = null;

async function group(group_code: string): Promise<DefinitionRead[]> {
  try {
    const res = await listDefinitions({ group_code, size: 200, is_active: true });
    return res.items ?? [];
  } catch {
    return [];
  }
}

function legacyOrder(a: DefinitionRead, b: DefinitionRead): number {
  const la = Number(a.legacy_id ?? NaN);
  const lb = Number(b.legacy_id ?? NaN);
  if (Number.isFinite(la) && Number.isFinite(lb) && la !== lb) return la - lb;
  return a.id - b.id;
}

function dedupe<T>(items: T[], keyOf: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyOf(it);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

async function build(): Promise<PlanLookups> {
  const [freq, cov, lim, ptype, psub] = await Promise.all([
    group("FREQUENCYLIMITATIONS"),
    group("DEFCOVERAGE"),
    group("INSLIMITATIONS"),
    group("PLANTYPE"),
    group("PLANSUBTYPE"),
  ]);
  const sources: PlanLookups["sources"] = {};

  // Frequencies: ordinal = position in legacy order. Keep the canonical
  // fallback as the source of truth for the first 13 (migrated data depends on
  // it) and only append genuinely new backend entries after them.
  let frequencies = FREQUENCY_FALLBACK;
  const freqDefs = dedupe([...freq].sort(legacyOrder), (d) => clean(d.description).toLowerCase());
  if (freqDefs.length > 0) {
    sources.FREQUENCYLIMITATIONS = "backend";
    const known = new Set(FREQUENCY_FALLBACK.map((f) => f.label.toLowerCase()));
    const extra = freqDefs.filter((d) => !known.has(clean(d.description).toLowerCase()));
    frequencies = [
      ...FREQUENCY_FALLBACK,
      ...extra.map((d, i) => ({ code: String(FREQUENCY_FALLBACK.length + i), label: clean(d.description) })),
    ];
  } else {
    sources.FREQUENCYLIMITATIONS = "fallback";
  }

  // Coverage categories: key1 = code, key2 = default %, description = label.
  let categories = COVERAGE_CATEGORY_FALLBACK;
  const covDefs = dedupe(cov, (d) => clean(d.key1).toUpperCase());
  if (covDefs.length > 0) {
    sources.DEFCOVERAGE = "backend";
    const fallbackFreq = new Map(COVERAGE_CATEGORY_FALLBACK.map((c) => [c.code, c.default_freq]));
    categories = covDefs
      .map((d) => {
        const code = clean(d.key1).toUpperCase();
        return {
          code,
          label: clean(d.description) || code,
          default_pct: /^\d+(\.\d+)?$/.test(clean(d.key2)) ? clean(d.key2) : "0",
          default_freq: fallbackFreq.get(code) ?? "0",
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  } else {
    sources.DEFCOVERAGE = "fallback";
  }

  // Code groups (INSLIMITATIONS): key1 = code, description = label.
  let code_groups = CODE_GROUP_FALLBACK;
  const limDefs = dedupe(lim, (d) => clean(d.key1).toUpperCase());
  if (limDefs.length > 0) {
    sources.INSLIMITATIONS = "backend";
    code_groups = limDefs
      .map((d) => ({ code: clean(d.key1).toUpperCase(), label: clean(d.description) || clean(d.key1) }))
      .sort((a, b) => a.code.localeCompare(b.code));
  } else {
    sources.INSLIMITATIONS = "fallback";
  }

  // Plan types: the backend list has an empty key1 — the description IS the value.
  const typeDefs = dedupe(ptype, (d) => clean(d.description).toUpperCase());
  const plan_types = dedupe(
    [...PLAN_TYPE_FALLBACK, ...typeDefs.map((d) => clean(d.description))],
    (s) => s.toUpperCase(),
  );
  sources.PLANTYPE = typeDefs.length > 0 ? "backend" : "fallback";

  // Reporting subtypes: key1 = parent plan type, description = subtype label.
  const subDefs = dedupe(psub, (d) => `${clean(d.key1)}|${clean(d.description)}`.toUpperCase());
  const plan_subtypes = subDefs.map((d) => ({ label: clean(d.description), plan_type: clean(d.key1) }));
  sources.PLANSUBTYPE = subDefs.length > 0 ? "backend" : "fallback";

  return { frequencies, categories, code_groups, plan_types, plan_subtypes, sources };
}

export async function loadPlanLookups(): Promise<PlanLookups> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  if (inflight) return inflight;
  inflight = build()
    .then((value) => {
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Synchronous fallback lookups (used before the async load resolves). */
export function fallbackLookups(): PlanLookups {
  return {
    frequencies: FREQUENCY_FALLBACK,
    categories: COVERAGE_CATEGORY_FALLBACK,
    code_groups: CODE_GROUP_FALLBACK,
    plan_types: PLAN_TYPE_FALLBACK,
    plan_subtypes: [],
    sources: {},
  };
}

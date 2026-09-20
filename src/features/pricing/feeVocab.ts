// Fee-schedule vocabulary — the server-published pricing metadata
// (GET /fee-schedules/metadata, docs/pricing §3.1). This is the single source of
// truth for the pricing enums the Setup screens render: fee types, pricing
// models, unpriced policies, the assignment rank/scope keys, the fee-source
// list, and the precedence card itself. Screens must read these from here rather
// than hard-coding option lists, so a backend change to the vocabulary flows to
// the UI without a code edit.
//
// The endpoint has no typed response schema (returns `unknown`), so the shape is
// declared here and cast once at the fetch boundary.

import {
  getFeeScheduleMetadata,
  useGetFeeScheduleMetadata,
} from '@/api/generated/endpoints/procedures/procedures';

export interface FeeVocabOption {
  code: string;
  label: string;
}

export interface PrecedenceRow {
  tier: string;
  fee_source: string;
  source: string;
  owned_by: string;
}

export interface FeeVocab {
  fee_types: FeeVocabOption[];
  pricing_models: FeeVocabOption[];
  fee_sources: string[];
  unpriced_policies: FeeVocabOption[];
  coverage_tiers: string[];
  assignment_rank_keys: string[];
  assignment_scope_keys: string[];
  /** Fee types for which a `copay` pricing model (and a Plan-Pays column) is allowed. */
  copay_capable_fee_types: string[];
  precedence: PrecedenceRow[];
}

const EMPTY_VOCAB: FeeVocab = {
  fee_types: [],
  pricing_models: [],
  fee_sources: [],
  unpriced_policies: [],
  coverage_tiers: [],
  assignment_rank_keys: [],
  assignment_scope_keys: [],
  copay_capable_fee_types: [],
  precedence: [],
};

/** Session-cached fetch for non-React callers. */
let cached: Promise<FeeVocab> | null = null;

export function loadFeeVocab(): Promise<FeeVocab> {
  if (!cached) {
    cached = getFeeScheduleMetadata()
      .then((raw) => ({ ...EMPTY_VOCAB, ...(raw as Partial<FeeVocab>) }))
      .catch((err) => {
        cached = null; // allow retry
        throw err;
      });
  }
  return cached;
}

/** Forget the cached vocabulary (after a metadata-affecting change, or on logout). */
export function clearFeeVocabCache(): void {
  cached = null;
}

/**
 * React hook over the metadata query. Returns a fully-populated (possibly empty)
 * `FeeVocab` so callers never null-check every list, plus the query's loading /
 * error flags.
 */
export function useFeeVocab(): { vocab: FeeVocab; isLoading: boolean; isError: boolean } {
  const { data, isLoading, isError } = useGetFeeScheduleMetadata({
    query: { staleTime: 5 * 60 * 1000 },
  });
  return { vocab: { ...EMPTY_VOCAB, ...((data as Partial<FeeVocab>) ?? {}) }, isLoading, isError };
}

/** True when `feeType` permits a `copay` pricing model (and thus a Plan-Pays column). */
export function isCopayCapableFeeType(feeType: string | null | undefined, vocab: FeeVocab): boolean {
  if (!feeType) return false;
  return vocab.copay_capable_fee_types.includes(feeType);
}

/** Human label for a fee-type code, from the vocabulary (falls back to the code). */
export function feeTypeLabel(code: string | null | undefined, vocab: FeeVocab): string {
  if (!code) return '';
  return vocab.fee_types.find((t) => t.code === code)?.label ?? code;
}

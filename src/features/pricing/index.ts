// Server-authoritative pricing feature (docs/pricing/pricing_hierarchy_architecture.md).
// The server prices every charge (Phase F3): these are the shapes, context
// packagers and preview helpers the charge screens use. The legacy client
// resolvers have been removed.
export {
  formatProvenance,
  feeSourceLabel,
  provenanceFromEstimateLine,
  FEE_SOURCE_LABELS,
  type PricingProvenance,
} from './provenance';
export { ProcedureProvenance } from './ProcedureProvenance';
export { default as PricingHealthPanel } from './PricingHealthPanel';
export { priceProcedureFor, resolveProcedureFeeFor } from './serverPricing';
export {
  loadFeeScheduleContext,
  loadCoverageContext,
  EMPTY_FEE_CONTEXT,
  EMPTY_COVERAGE_CONTEXT,
  money2,
  type FeeScheduleContext,
  type CoverageContext,
  type FeeScheduleCandidate,
  type PricedProcedure,
  type ResolvedProcedureFee,
} from './pricingContext';
export { coverageCategoriesFor } from './coverageCategories';
export {
  loadFeeVocab,
  useFeeVocab,
  clearFeeVocabCache,
  isCopayCapableFeeType,
  feeTypeLabel,
  type FeeVocab,
  type FeeVocabOption,
  type PrecedenceRow,
} from './feeVocab';
export {
  useFeeScheduleUsage,
  usePlanFeeBinding,
  usePricingHealth,
  healthFindingLabel,
  HEALTH_FINDING_LABELS,
  type FeeScheduleUsage,
  type PlanFeeBinding,
  type PricingHealth,
  type PricingHealthFinding,
} from './pricingSetup';

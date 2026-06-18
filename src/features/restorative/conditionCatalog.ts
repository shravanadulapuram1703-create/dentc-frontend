// Back-compat shim: the condition catalog now lives in conditionTaxonomy.ts
// (full per-tooth parity). Re-exported so existing imports keep resolving.
export type { ConditionDef } from './conditionTaxonomy';
export {
  conditionsForArea,
  lookupCondition,
  isMaterialAware,
  isGradeAware,
} from './conditionTaxonomy';

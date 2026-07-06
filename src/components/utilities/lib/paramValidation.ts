// Pure parameter-completeness check shared by the params form and the runner
// shell. Kept out of the component file so fast-refresh stays component-only.
import type { ParamValues, UtilityDefinition } from "../types";

/** True when every required field in `def` (incl. the office picker) has a value. */
export function paramsComplete(def: UtilityDefinition, values: ParamValues): boolean {
  if (def.officeScoped && !values.__office) return false;
  for (const f of def.params ?? []) {
    if (f.required && (values[f.key] == null || values[f.key] === "")) return false;
  }
  return true;
}

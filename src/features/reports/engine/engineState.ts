// Engine state of the Reports module (07 §2.3), derived from the ONE catalog query.
//
//   on            catalog answers 200
//   off           any 404 on GET /reports/catalog: 404 `reports_engine_disabled` is the
//                 switched-off engine (REPORTS_ENGINE_ENABLED = false); a plain 404 is a backend
//                 build without the engine package. Both fall back to today's report pages.
//   misconfigured 503 `reports_engine_misconfigured` (details.missing[] for administrators)
//   unknown       network error, other 5xx, timeout, or still loading - the old pages are NOT used
//
// No VITE_* build flag decides this: one build serves clients with and without the engine.
import { isAxiosError } from "axios";

export type EngineState = "on" | "off" | "misconfigured" | "unknown";

export interface EngineProbe {
  state: EngineState;
  /** `details.missing[]` of a misconfigured engine (shown to administrators). */
  missing: string[];
}

interface ErrorEnvelope {
  error?: { code?: string; details?: { missing?: unknown } | null };
}

export function classifyCatalogError(error: unknown): EngineProbe {
  if (isAxiosError<ErrorEnvelope>(error) && error.response) {
    const { status, data } = error.response;
    if (status === 404) return { state: "off", missing: [] };
    if (status === 503 && data?.error?.code === "reports_engine_misconfigured") {
      const raw = data.error.details?.missing;
      const missing = Array.isArray(raw) ? raw.filter((m): m is string => typeof m === "string") : [];
      return { state: "misconfigured", missing };
    }
  }
  return { state: "unknown", missing: [] };
}

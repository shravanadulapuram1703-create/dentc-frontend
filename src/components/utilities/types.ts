// Declarative Utilities model.
//
// A `UtilityDefinition` describes ONE administrative/maintenance utility: which
// category it belongs to, who may run it (RBAC), whether it mutates data (needs
// a confirm step), what parameters it collects, and how it executes. The generic
// `UtilityShell` renders + runs any definition, so adding a new utility is just
// adding a definition to `utilityCatalog.ts` — no new screen required.
//
// Data-field identifiers follow the repo snake_case convention (audit records,
// run results). React/TS symbols stay camelCase per the documented exception.
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "../../contexts/AuthContext";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type UtilityCategoryKey =
  | "batch-claims"
  | "billing"
  | "insurance-procedure"
  | "data-migration"
  | "office-specific"
  | "user-functions"
  | "fee-schedules"
  | "integrations"
  | "launch";

export interface CategoryMeta {
  key: UtilityCategoryKey;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind text-color class for the category accent. */
  accent: string;
}

// ---------------------------------------------------------------------------
// Parameters (the per-utility input form)
// ---------------------------------------------------------------------------

export type ParamKind =
  | "office"
  | "provider"
  | "date"
  | "dateRange"
  | "text"
  | "number"
  | "select"
  | "checkbox"
  | "file";

export interface ParamOption {
  value: string;
  label: string;
}

export interface UtilityParamField {
  key: string;
  label: string;
  kind: ParamKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: ParamOption[]; // for kind "select"
  defaultValue?: string | number | boolean;
  /** Accept attribute for kind "file" (e.g. ".xls,.xlsx,.csv"). */
  accept?: string;
}

/** Resolved parameter values handed to the run engine. */
export type ParamValues = Record<string, string | number | boolean | File | null | undefined>;

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * How a utility runs:
 *  - "batch"        long-running server-side style job (simulated — see backend gap)
 *  - "wizard"       guided multi-step migration with a preview/confirm step
 *  - "import-export" download a template / upload + validate a file
 *  - "integration"  third-party sync with connection status + sync history
 *  - "launch"       open an external application/URL
 */
export type UtilityKind = "batch" | "wizard" | "import-export" | "integration" | "launch";

/**
 * Backend availability, surfaced honestly in the UI. Most legacy batch utilities
 * have no DentC endpoint yet, so they run as clearly-labelled simulations that
 * still exercise the full confirm → progress → summary → audit UX.
 */
export type BackendStatus = "live" | "pending" | "external";

export type RunStatus = "success" | "warning" | "error";

export type LogLevel = "info" | "success" | "warning" | "error";

export interface RunLogLine {
  level: LogLevel;
  message: string;
  /** ISO timestamp. */
  at: string;
}

/** Outcome of one utility execution — also the shape stored in the audit history. */
export interface UtilityRunResult {
  status: RunStatus;
  /** Total records considered. */
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  logs: RunLogLine[];
  started_at: string;
  finished_at: string;
  /** Optional human note (e.g. "Simulated — backend endpoint pending"). */
  note?: string;
}

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export interface UtilityDefinition {
  /** URL slug — /utilities/run/:id */
  id: string;
  title: string;
  description: string;
  category: UtilityCategoryKey;
  icon: LucideIcon;
  kind: UtilityKind;
  /** Legacy nav path this modern utility replaces (drives redirect wiring). */
  legacyPath?: string;
  /** Roles allowed to run it. Empty/undefined = any authenticated user. */
  roles?: UserRole[];
  /** Mutating operation — requires a confirmation dialog before execution. */
  destructive?: boolean;
  /** Requires an office to be selected before running. */
  officeScoped?: boolean;
  /** Parameter form fields. */
  params?: UtilityParamField[];
  /** Named steps streamed as progress during a (simulated) batch/wizard run. */
  steps?: string[];
  backend: BackendStatus;
  /** External URL for kind "launch". */
  launchUrl?: string;
  /** Extra guidance shown on the run screen (e.g. backend-gap reference). */
  runNote?: string;
  /** Override the confirm button label. */
  confirmLabel?: string;
  /** Keywords to widen search matching beyond title/description. */
  keywords?: string[];
}

// ---------------------------------------------------------------------------
// Audit history (client-side; see backend devreport UTIL-1)
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  utility_id: string;
  utility_title: string;
  category: UtilityCategoryKey;
  user_id: string;
  user_name: string;
  office: string;
  executed_at: string;
  params: Record<string, string>;
  status: RunStatus;
  processed: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
}

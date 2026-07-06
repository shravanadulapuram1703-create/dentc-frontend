// Central, data-driven configuration for the Help → Jira integration.
//
// Everything a deployment needs to point the Help module at a different Jira
// project / transport lives in environment variables (see src/shared/config/env.ts
// and .env.example). The issue-type and priority CATALOGS below are plain data:
// edit this one file to change the options the form offers — no component churn.
//
// This module is transport-agnostic on purpose: `jiraService` is the only thing
// that talks to a wire, so a future Zendesk/Freshdesk adapter can reuse the same
// config shape (project → "queue", issue types → "categories").
import { env } from "@/shared/config/env";

export interface OptionDef {
  /** Value stored/sent (Jira issue-type name / priority name). */
  value: string;
  /** Label shown in the form. */
  label: string;
  /** One-line helper describing when to pick it. */
  hint?: string;
}

/** Jira issue types the "Report an Issue" form can create. */
export const ISSUE_TYPES: OptionDef[] = [
  { value: "Bug", label: "Bug", hint: "Something is broken or behaving incorrectly" },
  { value: "Support", label: "Support / Question", hint: "You need help using a feature" },
  { value: "Improvement", label: "Improvement", hint: "An existing feature could work better" },
  { value: "New Feature", label: "Feature Request", hint: "Something new you'd like added" },
  { value: "Task", label: "Data / Account Request", hint: "A change to your data or account" },
];

/** Jira priorities, mapped 1:1 to standard Jira Cloud priority names. */
export const PRIORITIES: OptionDef[] = [
  { value: "Highest", label: "Critical", hint: "System down / cannot work at all" },
  { value: "High", label: "High", hint: "Major feature blocked, no workaround" },
  { value: "Medium", label: "Medium", hint: "Impaired, but a workaround exists" },
  { value: "Low", label: "Low", hint: "Minor issue or cosmetic" },
];

/**
 * Selectable "Module or Screen" values. Kept aligned with the app's top-level
 * areas so tickets are routable. `Auto-detected` is resolved at open time from
 * the current route (see environmentContext).
 */
export const MODULES: string[] = [
  "Dashboard",
  "Scheduler",
  "Patient",
  "Transactions",
  "Charting",
  "Treatment Plans",
  "Prescriptions",
  "Lab Tracking",
  "Insurance",
  "Reports",
  "Utilities",
  "Setup",
  "Imaging",
  "My Page",
  "Login / Authentication",
  "Help",
  "Other",
];

export const DEFAULT_ISSUE_TYPE = "Bug";
export const DEFAULT_PRIORITY = "Medium";

/** Resolved Jira config for the active deployment. */
export const jiraConfig = env.jira;

/** True when tickets are only stored locally (no real Jira behind the form). */
export const isDemoMode = jiraConfig.mode === "demo";

/** Build a browser deep-link to an issue, when the site base is known. */
export function issueUrl(issueKey: string): string | null {
  if (!jiraConfig.baseUrl) return null;
  return `${jiraConfig.baseUrl}/browse/${issueKey}`;
}

// Shared types for the Help Center + support-ticket (Jira) integration.

/** Auto-captured application/environment context attached to every ticket. */
export interface TicketContext {
  user_name: string;
  user_id: string;
  user_email: string;
  user_role: string;
  office: string;
  app_version: string;
  browser: string;
  operating_system: string;
  /** ISO-8601 timestamp of when the report was started. */
  timestamp: string;
  /** Friendly name of the screen the user was on (e.g. "Scheduler"). */
  module: string;
  /** Full in-app URL at report time. */
  url: string;
}

/** A file the user attached to their report (kept in memory until submit). */
export interface TicketAttachment {
  name: string;
  size: number;
  type: string;
  /** base64 (no data-URI prefix) — used by proxy/demo transports. */
  data_base64: string;
}

/** The user-entered portion of a support request. */
export interface TicketFormValues {
  title: string;
  description: string;
  issue_type: string;
  priority: string;
  module: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
}

/** A full ticket payload = user input + auto context + files. */
export interface TicketPayload extends TicketFormValues {
  context: TicketContext;
  attachments: TicketAttachment[];
}

/** Result of a submission attempt, surfaced to the UI. */
export interface TicketSubmitResult {
  ok: boolean;
  /** Jira issue key (e.g. "SUP-142") when created. */
  issue_key?: string;
  /** Deep link to the created issue, when resolvable. */
  issue_url?: string;
  /** Which transport handled it. */
  mode: "proxy" | "direct" | "demo";
  /** Human-readable error when `ok` is false. */
  error?: string;
}

/** Lifecycle status of a previously filed ticket. */
export type TicketStatus =
  | "Open"
  | "In Progress"
  | "Done"
  | "Submitted"
  | "Failed";

/** A ticket record persisted to the local audit log / "My Tickets" list. */
export interface TicketRecord {
  id: string;
  issue_key: string | null;
  issue_url: string | null;
  title: string;
  issue_type: string;
  priority: string;
  module: string;
  status: TicketStatus;
  mode: "proxy" | "direct" | "demo";
  created_at: string;
  reporter_id: string;
  /** Present when the submission failed — enables one-click retry. */
  error?: string;
}

// --- Help content model -----------------------------------------------------

export type HelpCategoryId =
  | "guides"
  | "faqs"
  | "troubleshooting"
  | "contact"
  | "release-notes";

/** A single help article rendered as an expandable panel. */
export interface HelpArticle {
  id: string;
  category: HelpCategoryId;
  title: string;
  /** Short teaser shown collapsed / in search results. */
  summary: string;
  /** Body paragraphs (plain text; rendered as stacked <p>). */
  body: string[];
  /** Optional ordered steps rendered as a numbered list. */
  steps?: string[];
  /** Free-text keywords to widen search matching. */
  keywords?: string[];
}

export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

import { z } from "zod";

/**
 * Typed, validated access to client environment variables.
 * Only VITE_*-prefixed vars are exposed to the browser by Vite.
 * Parsed once at module load so misconfiguration fails fast.
 */
/** Loopback default for the local DentC Imaging Agent (Python/FastAPI). */
const DEFAULT_IMAGING_BRIDGE_URL = "http://127.0.0.1:8765";

const schema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default("http://127.0.0.1:8000"),
  VITE_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  // Local imaging-device bridge (intra-oral sensor acquisition). A browser
  // cannot talk to a USB X-ray sensor directly, so the local DentC Imaging
  // Agent exposes a loopback HTTP API. We default to that loopback URL and
  // decide availability at RUNTIME (the workspace probes `/status`). Set this
  // to override the host, or to "off"/"disabled" to hard-disable the feature.
  VITE_IMAGING_BRIDGE_URL: z.string().optional(),
  // Where the first-time setup card sends users to download the agent installer.
  VITE_IMAGING_AGENT_DOWNLOAD_URL: z.string().url().optional(),

  // Human-readable application version surfaced in the Help Center and attached
  // to every support ticket. Bump per release (or wire to your CI build number).
  VITE_APP_VERSION: z.string().default("4.3.0"),

  // --- Help Center → Jira issue tracking ------------------------------------
  // The Help module can file support tickets into Jira. Three transports are
  // supported; `env.jira.mode` resolves which one is active (see below):
  //   proxy  — POST the ticket to YOUR backend, which holds the Jira secret and
  //            forwards to Jira. The only browser-safe option for production.
  //   direct — call the Jira Cloud REST API straight from the browser with a
  //            Basic-auth token. Dev/testing ONLY: it exposes the token to the
  //            client and needs Jira CORS allow-listing. Never ship this.
  //   demo   — no Jira configured: tickets are stored locally so the whole flow
  //            is demonstrable end-to-end. This is the zero-config default.
  VITE_JIRA_MODE: z
    .enum(["auto", "proxy", "direct", "demo"])
    .default("auto"),
  // Your backend proxy endpoint (proxy mode), e.g. "/api/v1/support/tickets".
  VITE_JIRA_PROXY_URL: z.string().optional(),
  // Atlassian site base (direct mode), e.g. "https://acme.atlassian.net".
  VITE_JIRA_BASE_URL: z.string().optional(),
  VITE_JIRA_EMAIL: z.string().optional(),
  VITE_JIRA_API_TOKEN: z.string().optional(),
  // Target Jira project key that tickets are created under.
  VITE_JIRA_PROJECT_KEY: z.string().default("SUP"),
});

const parsed = schema.parse(import.meta.env);

const rawBridge = parsed.VITE_IMAGING_BRIDGE_URL?.trim();
const bridgeDisabled =
  rawBridge === "off" || rawBridge === "disabled" || rawBridge === "false";
const imagingBridgeUrl = bridgeDisabled
  ? null
  : (rawBridge || DEFAULT_IMAGING_BRIDGE_URL).replace(/\/+$/, "");

/**
 * Resolve the effective Jira transport. `auto` picks the most capable option
 * that is actually configured, falling back to `demo` so the Help module always
 * works out of the box.
 */
const jiraProxyUrl = parsed.VITE_JIRA_PROXY_URL?.trim() || null;
const jiraBaseUrl = parsed.VITE_JIRA_BASE_URL?.trim().replace(/\/+$/, "") || null;
const jiraEmail = parsed.VITE_JIRA_EMAIL?.trim() || null;
const jiraApiToken = parsed.VITE_JIRA_API_TOKEN?.trim() || null;

const canDirect = Boolean(jiraBaseUrl && jiraEmail && jiraApiToken);
const jiraMode: "proxy" | "direct" | "demo" =
  parsed.VITE_JIRA_MODE === "auto"
    ? jiraProxyUrl
      ? "proxy"
      : canDirect
        ? "direct"
        : "demo"
    : parsed.VITE_JIRA_MODE;

export const env = {
  /** Backend base URL, normalized without a trailing slash. */
  apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/+$/, ""),
  appEnv: parsed.VITE_APP_ENV,
  isProd: parsed.VITE_APP_ENV === "production",
  /** Imaging-agent base URL (loopback by default), or null when hard-disabled. */
  imagingBridgeUrl,
  /**
   * True unless the feature is explicitly disabled. Note this only means the
   * device feature is *allowed* — actual availability is detected at runtime by
   * probing the agent's `/status`, since the agent may not be installed/running.
   */
  imagingDeviceEnabled: !bridgeDisabled,
  /** Installer download URL for the first-time setup card (null → instructions only). */
  imagingAgentDownloadUrl: parsed.VITE_IMAGING_AGENT_DOWNLOAD_URL ?? null,
  /** Human-readable app version shown in Help + attached to support tickets. */
  appVersion: parsed.VITE_APP_VERSION,
  /**
   * Help Center → Jira issue-tracking config. `mode` is the resolved transport
   * ("proxy" | "direct" | "demo"); the rest are the connection details each mode
   * needs. The Help UI reads these to decide how to file and fetch tickets.
   */
  jira: {
    mode: jiraMode,
    proxyUrl: jiraProxyUrl,
    baseUrl: jiraBaseUrl,
    email: jiraEmail,
    apiToken: jiraApiToken,
    projectKey: parsed.VITE_JIRA_PROJECT_KEY,
  },
} as const;

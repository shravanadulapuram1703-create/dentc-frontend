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
});

const parsed = schema.parse(import.meta.env);

const rawBridge = parsed.VITE_IMAGING_BRIDGE_URL?.trim();
const bridgeDisabled =
  rawBridge === "off" || rawBridge === "disabled" || rawBridge === "false";
const imagingBridgeUrl = bridgeDisabled
  ? null
  : (rawBridge || DEFAULT_IMAGING_BRIDGE_URL).replace(/\/+$/, "");

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
} as const;

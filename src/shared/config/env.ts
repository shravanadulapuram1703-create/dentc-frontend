import { z } from "zod";

/**
 * Typed, validated access to client environment variables.
 * Only VITE_*-prefixed vars are exposed to the browser by Vite.
 * Parsed once at module load so misconfiguration fails fast.
 */
const schema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default("http://127.0.0.1:8000"),
  VITE_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  // Local imaging-device bridge (intra-oral sensor acquisition). Optional and
  // OFF by default: a browser cannot talk to a USB X-ray sensor directly, so a
  // local desktop bridge exposes an HTTP API. Unset → device features disabled.
  VITE_IMAGING_BRIDGE_URL: z.string().url().optional(),
});

const parsed = schema.parse(import.meta.env);

export const env = {
  /** Backend base URL, normalized without a trailing slash. */
  apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/+$/, ""),
  appEnv: parsed.VITE_APP_ENV,
  isProd: parsed.VITE_APP_ENV === "production",
  /** Imaging-device bridge base URL, normalized without a trailing slash, or null when unconfigured. */
  imagingBridgeUrl: parsed.VITE_IMAGING_BRIDGE_URL?.replace(/\/+$/, "") ?? null,
  /** True only when an imaging bridge URL is configured. Gates all device-scan calls. */
  imagingDeviceEnabled: Boolean(parsed.VITE_IMAGING_BRIDGE_URL),
} as const;

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
});

const parsed = schema.parse(import.meta.env);

export const env = {
  /** Backend base URL, normalized without a trailing slash. */
  apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/+$/, ""),
  appEnv: parsed.VITE_APP_ENV,
  isProd: parsed.VITE_APP_ENV === "production",
} as const;

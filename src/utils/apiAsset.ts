import { env } from "@/shared/config/env";

/**
 * Resolve an asset URL returned by the backend (e.g. logo / image / watermark)
 * to one the browser can load directly.
 *
 * The backend stores paths like "/uploads/logos/tenant_1.jpg". A bare `<img
 * src="/uploads/...">` resolves against the page origin (the Vite dev server
 * on :5173, or the SPA host in prod) instead of the API host, so the file
 * 404s or returns index.html and the image breaks. This helper prefixes such
 * relative paths with `env.apiBaseUrl`, but leaves already-absolute URLs
 * (http(s)://, data:, blob:) and falsy values untouched.
 */
export function apiAssetUrl(url?: string | null): string {
  if (!url) return "";
  if (/^(?:https?:|data:|blob:)/i.test(url)) return url;
  const base = env.apiBaseUrl;
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

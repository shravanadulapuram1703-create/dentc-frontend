import { useEffect, useState } from "react";
import api from "@/services/api";
import { apiAssetUrl } from "@/utils/apiAsset";

/**
 * Authenticated access to backend-served files (patient documents, note
 * attachments, claim attachments, imaging tiles).
 *
 * The backend used to expose every upload under a public `/uploads/**` static
 * mount, so a bare `<a href={file_url}>` or `<img src={file_url}>` just worked.
 * That mount served PHI with no token and no tenant check and has been removed
 * (NOTE-DOC-3). `file_url` is now one of two things, resolved per read:
 *
 *   1. a short-lived **signed GCS URL** — absolute https, renders with no
 *      header at all (the production mode), or
 *   2. an **API proxy path** such as `/api/v1/patient-documents/31/content` —
 *      which requires the `Authorization` header, i.e. it must go through the
 *      shared axios instance and be handed to the browser as a blob URL.
 *
 * Everything here takes `file_url` verbatim and does the right thing for both.
 */

/** Path portion of a `file_url`, whether it arrives relative or absolute. */
function pathAndQueryOf(url: string): string {
  if (!/^https?:/i.test(url)) return url.startsWith("/") ? url : `/${url}`;
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * True when the URL is one of our API's authenticated routes.
 *
 * Keyed off the **path**, not the origin. A proxy `file_url` is absolutised
 * with the backend's own `PUBLIC_API_BASE_URL`, which is not necessarily the
 * host this client is configured against (a local API answering with its Cloud
 * Run public base, say). The bearer token is only valid at `env.apiBaseUrl`, so
 * an `/api/...` path is re-homed there and everything else — signed bucket URLs,
 * public branding assets — is left exactly as the backend returned it.
 */
export function needsAuthorizedFetch(url: string): boolean {
  if (!url) return false;
  if (/^(?:data:|blob:)/i.test(url)) return false;
  return pathAndQueryOf(url).startsWith("/api/");
}

/** Fetch a backend asset as a Blob, sending auth only when the API serves it. */
export async function fetchAssetBlob(url: string): Promise<Blob> {
  if (!needsAuthorizedFetch(url)) {
    const res = await fetch(apiAssetUrl(url));
    if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
    return res.blob();
  }
  // The shared instance carries the Authorization header and the 401 handling.
  const res = await api.get<Blob>(pathAndQueryOf(url), { responseType: "blob" });
  return res.data;
}

/** Fetch a backend asset and wrap it in an object URL the browser can render. */
export async function fetchAssetObjectUrl(url: string): Promise<string> {
  const blob = await fetchAssetBlob(url);
  return URL.createObjectURL(blob);
}

/**
 * Open a file in a new tab. Signed URLs open directly; proxy URLs are fetched
 * with auth and opened as a blob.
 *
 * The tab is opened *synchronously* and navigated once the blob arrives — a
 * `window.open` issued after an `await` is treated as un-gestured and blocked.
 */
export async function openAsset(url: string): Promise<void> {
  if (!url) return;
  if (!needsAuthorizedFetch(url)) {
    window.open(apiAssetUrl(url), "_blank", "noopener,noreferrer");
    return;
  }
  const tab = window.open("", "_blank");
  try {
    const objectUrl = await fetchAssetObjectUrl(url);
    if (tab) {
      tab.location.href = objectUrl;
    } else {
      // Popup blocked — fall back to navigating the current tab's download.
      window.location.href = objectUrl;
    }
    // Revoking immediately would race the tab's own load.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** Download a file under a chosen name, with auth when the API serves it. */
export async function downloadAsset(url: string, fileName: string): Promise<void> {
  if (!url) return;
  const objectUrl = await fetchAssetObjectUrl(url);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/**
 * Object URL for rendering a backend asset inline (`<img src>`, `<iframe src>`).
 * Signed URLs are passed straight through; proxy URLs are fetched with auth.
 * The object URL is revoked on unmount / URL change.
 */
export function useAssetObjectUrl(url?: string | null): {
  src: string;
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<{ src: string; loading: boolean; error: string | null }>({
    src: "",
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!url) {
      setState({ src: "", loading: false, error: null });
      return;
    }
    if (!needsAuthorizedFetch(url)) {
      setState({ src: apiAssetUrl(url), loading: false, error: null });
      return;
    }

    let cancelled = false;
    let objectUrl = "";
    setState({ src: "", loading: true, error: null });

    fetchAssetObjectUrl(url)
      .then((next) => {
        objectUrl = next;
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        setState({ src: next, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ src: "", loading: false, error: "Failed to load file" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return state;
}

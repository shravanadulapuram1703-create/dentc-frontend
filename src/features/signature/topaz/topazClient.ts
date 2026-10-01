// Topaz SigPlusExtLite V3 client — the ONLY file that talks to `window.Topaz`.
//
// Responsibilities:
//   1. Load the wrapper script the extension advertises (`SigPlusExtLiteWrapperURL`
//      attribute on <html>) so `window.Topaz` exists. Nothing is bundled from
//      Topaz; the extension ships and auto-updates its own wrapper.
//   2. Detect availability in a way the UI can explain (no extension, no
//      drivers, no pad plugged in, …) instead of a bare "not working".
//   3. Run one live capture session into an HTML <canvas> and hand back BOTH
//      the rendered image and the SigString (vector stroke data).
//
// Every Topaz call round-trips through the Native Messaging Host, so each one is
// wrapped in a timeout — a half-installed host can otherwise leave a promise
// pending forever and freeze the Sign button.

import {
  TOPAZ_DEVICE_STATUS,
  topazModelLabel,
  type TopazApi,
  type TopazCanvasSignApi,
} from "./topazTypes";

export type TopazState =
  | "ready" // pad (or GemView) detected — capture will work
  | "no_device" // software present, nothing plugged in
  | "no_extension" // browser extension not installed / not on this browser
  | "not_installed" // extension present, SigPlusExtLite host missing
  | "no_drivers" // SigPlus drivers missing
  | "old_sigplus" // outdated SigPlus install
  | "unsupported" // non-Windows / mobile — SigPlusExtLite is Windows-only
  | "error";

export interface TopazAvailability {
  state: TopazState;
  /** Raw `GetDeviceStatus()` code, when the call was made. */
  status_code: number | null;
  message: string;
  extension_version: string | null;
  nmh_version: string | null;
  device_model: number | null;
  device_serial: number | null;
  device_model_label: string | null;
  checked_at: string;
}

export interface TopazCaptureResult {
  /** `data:image/jpeg;base64,…` rendered by the Topaz host. */
  image_data_url: string;
  /** Topaz SigString (clear text, lossless-compressed) — the biometric record. */
  sig_string: string;
  point_count: number;
  stroke_count: number;
  device_model: number | null;
  device_serial: number | null;
  device_model_label: string | null;
}

const CALL_TIMEOUT_MS = 8000;
const WRAPPER_ATTR = "SigPlusExtLiteWrapperURL";
const WRAPPER_WAIT_MS = 1500;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function withTimeout<T>(p: Promise<T>, label: string, ms = CALL_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(
      () => reject(new Error(`Topaz ${label} timed out — is the SigPlusExtLite host running?`)),
      ms,
    );
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Best-effort call: an optional tuning method missing on an older wrapper must not abort capture. */
async function tryCall(label: string, fn: () => Promise<unknown> | undefined): Promise<void> {
  try {
    const r = fn();
    if (r) await withTimeout(r, label, 3000);
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[topaz] ${label} skipped:`, e);
  }
}

export function isTopazSupportedPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // SigPlusExtLite is a Windows desktop-browser product (Win10+, Chrome/Edge/Firefox/Opera).
  return /Windows NT/i.test(ua) && !/Mobile|Android|iPhone|iPad/i.test(ua);
}

// ---------------------------------------------------------------------------
// wrapper loading
// ---------------------------------------------------------------------------

let load_promise: Promise<TopazApi | null> | null = null;

function sleep(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}

async function waitForWrapperUrl(): Promise<string | null> {
  const deadline = Date.now() + WRAPPER_WAIT_MS;
  for (;;) {
    const url = document.documentElement.getAttribute(WRAPPER_ATTR);
    if (url) return url;
    if (Date.now() >= deadline) return null;
    await sleep(150);
  }
}

function injectScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-topaz-wrapper]`);
    if (existing) {
      if (window.Topaz) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("wrapper failed to load")), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.dataset.topazWrapper = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("wrapper failed to load"));
    document.head.appendChild(s);
  });
}

/**
 * Resolve the `Topaz` global, loading the extension-provided wrapper on first
 * use. Resolves `null` (never throws) when the extension is absent. A failed
 * attempt is not cached so a "Re-check" after installing the extension works
 * without a page reload.
 */
export function loadTopaz(): Promise<TopazApi | null> {
  if (window.Topaz) return Promise.resolve(window.Topaz);
  if (load_promise) return load_promise;
  load_promise = (async () => {
    try {
      if (!isTopazSupportedPlatform()) return null;
      const url = await waitForWrapperUrl();
      if (!url) return null;
      await injectScript(url);
      return window.Topaz ?? null;
    } catch {
      return null;
    } finally {
      // Only keep a successful load memoised.
      if (!window.Topaz) load_promise = null;
    }
  })();
  return load_promise;
}

// ---------------------------------------------------------------------------
// detection
// ---------------------------------------------------------------------------

function describe(code: number): { state: TopazState; message: string } {
  switch (code) {
    case TOPAZ_DEVICE_STATUS.SIGNATURE_PAD:
      return { state: "ready", message: "Topaz signature pad connected." };
    case TOPAZ_DEVICE_STATUS.GEMVIEW:
      return { state: "ready", message: "Topaz GemView tablet display connected." };
    case TOPAZ_DEVICE_STATUS.NO_DEVICE:
      return {
        state: "no_device",
        message: "Topaz software is installed but no signature pad was detected. Check the USB cable.",
      };
    case TOPAZ_DEVICE_STATUS.NOT_INSTALLED:
      return {
        state: "not_installed",
        message: "SigPlusExtLite is not installed on this computer.",
      };
    case TOPAZ_DEVICE_STATUS.NO_DRIVERS:
      return { state: "no_drivers", message: "Topaz SigPlus drivers are not installed." };
    case TOPAZ_DEVICE_STATUS.OLD_SIGPLUS:
      return {
        state: "old_sigplus",
        message: "An older SigPlus version is installed — update SigPlusExtLite.",
      };
    default:
      return { state: "error", message: "Topaz reported an error while detecting the device." };
  }
}

/** Probe the workstation. Never throws; the UI decides what to do with `state`. */
export async function detectTopaz(): Promise<TopazAvailability> {
  const base: TopazAvailability = {
    state: "no_extension",
    status_code: null,
    message: "",
    extension_version: null,
    nmh_version: null,
    device_model: null,
    device_serial: null,
    device_model_label: null,
    checked_at: new Date().toISOString(),
  };

  if (!isTopazSupportedPlatform()) {
    return {
      ...base,
      state: "unsupported",
      message: "Topaz pads need a Windows PC with Chrome, Edge or Firefox. Use on-screen signing here.",
    };
  }

  const api = await loadTopaz();
  if (!api) {
    return {
      ...base,
      message: "The Topaz SigPlusExtLite browser extension is not installed in this browser.",
    };
  }

  let code: number;
  try {
    code = await withTimeout(api.Global.GetDeviceStatus(), "GetDeviceStatus");
  } catch (e) {
    return { ...base, state: "error", message: (e as Error).message };
  }

  const d = describe(code);
  const out: TopazAvailability = { ...base, ...d, status_code: code };
  if (d.state === "error") {
    try {
      const err = await withTimeout(api.Global.GetLastError(), "GetLastError", 3000);
      if (err) out.message = `${out.message} ${err}`;
    } catch {
      /* keep generic message */
    }
  }

  // Versions are informational — never let them fail detection.
  await tryCall("GetSigPlusExtLiteVersion", async () => {
    out.extension_version = (await api.Global.GetSigPlusExtLiteVersion()) || null;
  });
  await tryCall("GetSigPlusExtLiteNMHVersion", async () => {
    out.nmh_version = (await api.Global.GetSigPlusExtLiteNMHVersion()) || null;
  });

  if (out.state === "ready") {
    const sign = api.Canvas.Sign;
    await tryCall("GetTabletModelNumber", async () => {
      const m = await sign.GetTabletModelNumber();
      out.device_model = m >= 0 ? m : null;
    });
    await tryCall("GetTabletSerialNumber", async () => {
      const s = await sign.GetTabletSerialNumber();
      out.device_serial = s >= 0 ? s : null;
    });
    out.device_model_label = topazModelLabel(out.device_model, out.device_serial);
  }
  return out;
}

// ---------------------------------------------------------------------------
// capture session
// ---------------------------------------------------------------------------

export interface TopazCaptureOptions {
  /** Pixel size of the JPEG the host renders; defaults to the canvas size. */
  image_width?: number;
  image_height?: number;
  pen_width?: number;
}

let active_sign: TopazCanvasSignApi | null = null;

/**
 * Start live capture into `canvas`. The pad is cleared first so a previous
 * patient's strokes can never leak into this signature.
 */
export async function startTopazCapture(
  canvas: HTMLCanvasElement,
  opts: TopazCaptureOptions = {},
): Promise<void> {
  const api = await loadTopaz();
  if (!api) throw new Error("Topaz is not available in this browser.");
  const sign = api.Canvas.Sign;

  // Stop anything a previous (possibly crashed) session left running.
  if (active_sign) {
    await tryCall("StopSign(prev)", () => active_sign!.StopSign());
    active_sign = null;
  }

  await tryCall("ClearSign", () => sign.ClearSign());
  // Clear-text, lossless SigString. Encryption is deliberately NOT enabled on
  // the client: a key shipped in browser JS protects nothing (see gap SIG-4).
  await tryCall("SetSigStringFormat", () => sign.SetSigStringFormat(0, "", 1));
  await tryCall("SetImageWidth", () => sign.SetImageWidth(opts.image_width ?? canvas.width));
  await tryCall("SetImageHeight", () => sign.SetImageHeight(opts.image_height ?? canvas.height));
  await tryCall("SetImagePenWidth", () => sign.SetImagePenWidth(opts.pen_width ?? 2));
  await tryCall("SetDisplayPenWidth", () => sign.SetDisplayPenWidth(opts.pen_width ?? 2));
  // 5 = justify + zoom, centred: the signature fills the box regardless of pad size.
  await tryCall("SetJustifyMode", () => sign.SetJustifyMode(5));

  await withTimeout(sign.StartSign(canvas), "StartSign");
  active_sign = sign;
}

/** Points currently on the pad (0 = untouched). Safe to poll while capturing. */
export async function topazPointCount(): Promise<number> {
  if (!active_sign) return 0;
  try {
    return await withTimeout(active_sign.GetTotalPoints(), "GetTotalPoints", 3000);
  } catch {
    return 0;
  }
}

/**
 * Stop capture and read the result. Returns `null` when nothing was signed.
 * The pad is left cleared and disabled either way.
 */
export async function finishTopazCapture(): Promise<TopazCaptureResult | null> {
  const sign = active_sign;
  if (!sign) return null;
  try {
    const point_count = await withTimeout(sign.GetTotalPoints(), "GetTotalPoints");
    if (!point_count || point_count <= 0) return null;

    let stroke_count = 0;
    await tryCall("GetNumberOfStrokes", async () => {
      stroke_count = await sign.GetNumberOfStrokes();
    });

    const image_b64 = await withTimeout(sign.GetSignatureImage(), "GetSignatureImage");
    const sig_string = await withTimeout(sign.GetSigString(), "GetSigString");

    let device_model: number | null = null;
    let device_serial: number | null = null;
    await tryCall("GetTabletModelNumber", async () => {
      const m = await sign.GetTabletModelNumber();
      device_model = m >= 0 ? m : null;
    });
    await tryCall("GetTabletSerialNumber", async () => {
      const s = await sign.GetTabletSerialNumber();
      device_serial = s >= 0 ? s : null;
    });

    if (!image_b64) return null;
    return {
      image_data_url: image_b64.startsWith("data:") ? image_b64 : `data:image/jpeg;base64,${image_b64}`,
      sig_string: sig_string ?? "",
      point_count,
      stroke_count,
      device_model,
      device_serial,
      device_model_label: topazModelLabel(device_model, device_serial),
    };
  } finally {
    await cancelTopazCapture();
  }
}

/** Abort the session: stop capture, wipe the pad, release the tablet. */
export async function cancelTopazCapture(): Promise<void> {
  const sign = active_sign;
  active_sign = null;
  if (!sign) return;
  await tryCall("StopSign", () => sign.StopSign());
  await tryCall("ClearSign", () => sign.ClearSign());
  await tryCall("SetTabletState(0)", () => sign.SetTabletState(0));
}

/** Wipe the pad and canvas mid-session (the CLEAR button) without stopping capture. */
export async function clearTopazCapture(): Promise<void> {
  if (!active_sign) return;
  await tryCall("ClearSign", () => active_sign!.ClearSign());
}

// SignatureCapture — the ONE signature pad for the whole app.
//
// Two capture methods behind one control:
//   • Topaz pad   — live strokes stream from the USB pad into the canvas via
//                   SigPlusExtLite; the result carries the SigString + device.
//   • On screen   — mouse / stylus / touch drawing on the same canvas.
// Topaz is offered only when the workstation probe says a pad is connected;
// otherwise the control silently behaves exactly like the old canvas pad, so
// no workflow is ever blocked by missing hardware or software.
//
// The component is deliberately dumb about persistence: it hands back a
// `SignatureResult` through `onChange` and the owning screen decides which
// endpoint receives it (patient-signatures, consents, user signature, …).

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlertTriangle,
  Check,
  Eraser,
  Loader2,
  MousePointer2,
  PenLine,
  RefreshCw,
  Usb,
} from "lucide-react";
import { DEVICE_SOURCE, type SignatureResult } from "./signatureModel";
import {
  cancelTopazCapture,
  clearTopazCapture,
  finishTopazCapture,
  startTopazCapture,
  topazPointCount,
} from "./topaz/topazClient";
import { useTopazStatus } from "./useTopazStatus";

export type CaptureMode = "topaz" | "screen";

export interface SignatureCaptureHandle {
  /** Finalise whatever is on the pad (Topaz or screen). Resolves the result or null. */
  finish: () => Promise<SignatureResult | null>;
  /** Wipe the pad and drop any staged value. */
  clear: () => Promise<void>;
  /** True while the pad is open and nothing has been accepted yet. */
  isOpen: () => boolean;
}

export interface SignatureCaptureProps {
  /** Staged (accepted but not yet saved) signature. */
  value: SignatureResult | null;
  onChange: (result: SignatureResult | null) => void;
  /** Signature already on file, shown when nothing is staged. */
  stored_image?: string | null;
  stored_at?: string | null;
  disabled?: boolean;
  /** Open the pad immediately instead of behind a SIGN button (dialogs). */
  always_open?: boolean;
  /** CSS height of the pad / preview box. */
  height?: number;
  /** Backing-store resolution of the canvas (also the Topaz image size). */
  canvas_width?: number;
  canvas_height?: number;
  /** Denser layout for side-by-side panels. */
  compact?: boolean;
  /** Extra line under the buttons (e.g. "Captured — press Save to store it."). */
  hint?: string | null;
  /** Called when the pad is opened/closed so parents can lock other controls. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const INK = "#11315c";

/**
 * Crop a drawn signature to its ink (plus a margin) so a small scrawl in one
 * corner of the pad still fills the signature line it is shown on — the same
 * "justify and zoom" Topaz applies to pad images. Returns null when nothing
 * was drawn.
 */
function exportTrimmedInk(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let min_x = width, min_y = height, max_x = -1, max_y = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 8) {
        if (x < min_x) min_x = x;
        if (x > max_x) max_x = x;
        if (y < min_y) min_y = y;
        if (y > max_y) max_y = y;
      }
    }
  }
  if (max_x < 0) return null;
  const pad = Math.round(Math.max(width, height) * 0.03);
  const sx = Math.max(0, min_x - pad);
  const sy = Math.max(0, min_y - pad);
  const sw = Math.min(width, max_x + pad) - sx;
  const sh = Math.min(height, max_y + pad) - sy;
  // Keep a signature-line aspect ratio (3:1) so previews line up consistently.
  const out_w = Math.max(sw, sh * 3);
  const out_h = Math.max(sh, Math.round(out_w / 3));
  const off = document.createElement("canvas");
  off.width = out_w;
  off.height = out_h;
  const o = off.getContext("2d");
  if (!o) return null;
  o.drawImage(canvas, sx, sy, sw, sh, Math.round((out_w - sw) / 2), Math.round((out_h - sh) / 2), sw, sh);
  return off.toDataURL("image/png");
}
const POLL_MS = 500;

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SignatureCapture = forwardRef<SignatureCaptureHandle, SignatureCaptureProps>(
  function SignatureCapture(
    {
      value,
      onChange,
      stored_image = null,
      stored_at = null,
      disabled = false,
      always_open = false,
      height = 130,
      canvas_width = 900,
      canvas_height = 300,
      compact = false,
      hint = null,
      onOpenChange,
      className = "",
    },
    ref,
  ) {
    const topaz = useTopazStatus();
    const [mode, setMode] = useState<CaptureMode>("screen");
    const mode_chosen = useRef(false);
    const [pad_open, setPadOpen] = useState(always_open);
    const [capturing, setCapturing] = useState(false); // Topaz session live
    const [busy, setBusy] = useState(false);
    const [pad_points, setPadPoints] = useState(0);
    const [error, setError] = useState<string | null>(null);
    // always_open + Topaz: after ACCEPT the session is closed, so show the
    // rendered image instead of an idle canvas until CLEAR restarts it.
    const [show_preview, setShowPreview] = useState(false);
    const [session_nonce, setSessionNonce] = useState(0);

    const canvas_ref = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const dirty = useRef(false);

    // Prefer the pad as soon as we know it is there — unless the user picked.
    useEffect(() => {
      if (mode_chosen.current) return;
      setMode(topaz.ready ? "topaz" : "screen");
    }, [topaz.ready]);

    useEffect(() => {
      onOpenChange?.(pad_open);
    }, [pad_open, onOpenChange]);

    // ---- canvas helpers ----------------------------------------------------
    const wipeCanvas = useCallback(() => {
      const c = canvas_ref.current;
      c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      dirty.current = false;
    }, []);

    // ---- Topaz session -----------------------------------------------------
    const stopTopaz = useCallback(async () => {
      setCapturing(false);
      setPadPoints(0);
      await cancelTopazCapture();
    }, []);

    const startTopaz = useCallback(async () => {
      const c = canvas_ref.current;
      if (!c) return;
      setError(null);
      setBusy(true);
      try {
        wipeCanvas();
        await startTopazCapture(c, { pen_width: 2 });
        setCapturing(true);
      } catch (e) {
        // Pad vanished between the probe and the click → degrade to screen.
        setError((e as Error).message || "Could not start the Topaz pad.");
        setCapturing(false);
        setMode("screen");
        void topaz.recheck();
      } finally {
        setBusy(false);
      }
    }, [topaz, wipeCanvas]);

    // Open/close + mode switches drive the session.
    useEffect(() => {
      if (pad_open && mode === "topaz" && !disabled && !show_preview) {
        void startTopaz();
        return () => {
          void stopTopaz();
        };
      }
      return undefined;
      // startTopaz/stopTopaz are stable for a given topaz status
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pad_open, mode, disabled, show_preview, session_nonce]);

    // Poll the pad so DONE lights up once the patient has actually signed.
    useEffect(() => {
      if (!capturing) return;
      let alive = true;
      const t = window.setInterval(async () => {
        const n = await topazPointCount();
        if (alive) setPadPoints(n);
      }, POLL_MS);
      return () => {
        alive = false;
        window.clearInterval(t);
      };
    }, [capturing]);

    // Never leave the tablet armed when the screen unmounts.
    useEffect(() => () => void cancelTopazCapture(), []);

    // ---- screen drawing ----------------------------------------------------
    const point = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const c = canvas_ref.current!;
      const r = c.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * c.width,
        y: ((e.clientY - r.top) / r.height) * c.height,
      };
    };
    const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (mode !== "screen" || disabled) return;
      const ctx = canvas_ref.current?.getContext("2d");
      if (!ctx) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      dirty.current = true;
      const { x, y } = point(e);
      // Stroke in CSS pixels: the backing store is denser than the box it is
      // drawn in, so a fixed device width would come out hairline-thin.
      const scale = e.currentTarget.width / Math.max(1, e.currentTarget.getBoundingClientRect().width);
      ctx.lineWidth = 2.2 * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current) return;
      const ctx = canvas_ref.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = point(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const onUp = () => {
      drawing.current = false;
    };

    // ---- actions -----------------------------------------------------------
    const open = () => {
      setError(null);
      setPadOpen(true);
    };

    const clear = useCallback(async () => {
      setError(null);
      wipeCanvas();
      if (capturing) await clearTopazCapture();
      setPadPoints(0);
      onChange(null);
      if (show_preview) {
        setShowPreview(false);
        setSessionNonce((n) => n + 1);
      }
    }, [capturing, onChange, show_preview, wipeCanvas]);

    const finish = useCallback(async (): Promise<SignatureResult | null> => {
      setError(null);
      const captured_at = new Date().toISOString();

      if (mode === "topaz" && capturing) {
        setBusy(true);
        try {
          const r = await finishTopazCapture();
          setCapturing(false);
          setPadPoints(0);
          if (!r) {
            setError("Nothing was signed on the pad yet.");
            // Re-arm so the patient can sign now.
            void startTopaz();
            return null;
          }
          const result: SignatureResult = {
            signature_data: r.image_data_url,
            device_source: DEVICE_SOURCE.TOPAZ,
            sig_string: r.sig_string || null,
            point_count: r.point_count,
            stroke_count: r.stroke_count,
            device_model: r.device_model_label ?? (r.device_model != null ? String(r.device_model) : null),
            device_serial: r.device_serial != null ? String(r.device_serial) : null,
            captured_at,
          };
          onChange(result);
          if (always_open) setShowPreview(true);
          else setPadOpen(false);
          return result;
        } catch (e) {
          setError((e as Error).message || "Could not read the signature from the pad.");
          return null;
        } finally {
          setBusy(false);
        }
      }

      // Screen mode. An untouched pad must not stage a blank image that later
      // reads as a real signature.
      if (!dirty.current) {
        if (!always_open) setPadOpen(false);
        return value;
      }
      const data = canvas_ref.current ? exportTrimmedInk(canvas_ref.current) : null;
      if (!data) return null;
      const result: SignatureResult = {
        signature_data: data,
        device_source: DEVICE_SOURCE.WEB_PAD,
        sig_string: null,
        point_count: null,
        stroke_count: null,
        device_model: null,
        device_serial: null,
        captured_at,
      };
      onChange(result);
      if (!always_open) setPadOpen(false);
      return result;
    }, [always_open, capturing, mode, onChange, startTopaz, value]);

    useImperativeHandle(
      ref,
      () => ({
        finish,
        clear,
        isOpen: () => pad_open,
      }),
      [finish, clear, pad_open],
    );

    const chooseMode = (m: CaptureMode) => {
      mode_chosen.current = true;
      setError(null);
      wipeCanvas();
      setShowPreview(false);
      setMode(m);
    };

    // ---- render ------------------------------------------------------------
    // Legacy-imported rows hold a raw Topaz SigString (hex) in signature_data,
    // which an <img> cannot render — say so instead of showing a broken image.
    const stored_is_image = !!stored_image && /^(data:|https?:|\/)/.test(stored_image);
    const shown = value?.signature_data ?? (stored_is_image ? stored_image : null);
    const legacy_sig_on_file = !value && !!stored_image && !stored_is_image;
    const signed_on_pad = mode === "topaz" && capturing && pad_points > 0;
    const can_done = pad_open && !busy && !disabled && (mode === "screen" || signed_on_pad);
    const status = topaz.status;

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {/* method + status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="radiogroup"
            aria-label="Signature method"
            className="inline-flex rounded border border-[#CBD5E1] overflow-hidden text-[11px] font-semibold"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "topaz"}
              disabled={disabled || !topaz.ready}
              title={topaz.ready ? "Sign on the Topaz pad" : status?.message ?? "Checking for a Topaz pad…"}
              onClick={() => chooseMode("topaz")}
              className={`flex items-center gap-1 px-2.5 py-1 ${
                mode === "topaz" ? "bg-[#1D4ED8] text-white" : "bg-white text-[#334155] hover:bg-[#F1F5F9]"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Usb className="w-3.5 h-3.5" /> Topaz pad
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "screen"}
              disabled={disabled}
              onClick={() => chooseMode("screen")}
              className={`flex items-center gap-1 px-2.5 py-1 border-l border-[#CBD5E1] ${
                mode === "screen" ? "bg-[#1D4ED8] text-white" : "bg-white text-[#334155] hover:bg-[#F1F5F9]"
              } disabled:opacity-40`}
            >
              <MousePointer2 className="w-3.5 h-3.5" /> On screen
            </button>
          </div>

          <TopazChip
            checking={topaz.checking}
            ready={topaz.ready}
            label={
              topaz.ready
                ? `Pad ready${status?.device_model_label ? ` · ${status.device_model_label}` : ""}`
                : status?.state === "no_extension" || status?.state === "unsupported"
                  ? "No Topaz pad"
                  : status?.state === "no_device"
                    ? "Pad not detected"
                    : (status?.message ?? "Checking pad…")
            }
            title={status?.message}
            onRecheck={() => void topaz.recheck()}
            compact={compact}
          />
        </div>

        {/* pad / preview */}
        <div
          className={`relative w-full rounded bg-white overflow-hidden ${
            pad_open
              ? "border-2 border-dashed border-[#3A6EA5]"
              : "border border-[#CBD5E1] flex items-center justify-center"
          }`}
          style={{ height }}
        >
          {pad_open && !show_preview ? (
            <>
              <canvas
                ref={canvas_ref}
                width={canvas_width}
                height={canvas_height}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
                className={`w-full h-full touch-none ${
                  mode === "screen" ? "cursor-crosshair" : "cursor-default"
                }`}
              />
              {mode === "topaz" && (
                <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
                  <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8] inline-flex items-center gap-1">
                    {busy ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Connecting to pad…
                      </>
                    ) : signed_on_pad ? (
                      <>
                        <Check className="w-3 h-3" /> Signature received — press DONE
                      </>
                    ) : capturing ? (
                      <>
                        <PenLine className="w-3 h-3" /> Please sign on the Topaz pad
                      </>
                    ) : (
                      "Pad idle"
                    )}
                  </span>
                </div>
              )}
            </>
          ) : shown ? (
            <img src={shown} alt="Signature" className="max-h-full max-w-full object-contain" />
          ) : legacy_sig_on_file ? (
            <span className="text-xs text-[#64748B] text-center px-2">
              Topaz signature on file (legacy data — image not available)
            </span>
          ) : (
            <span className="text-xs text-[#94A3B8]">Not signed</span>
          )}
        </div>

        {/* buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!always_open && (
            <PadButton onClick={open} disabled={pad_open || disabled}>
              <PenLine className="w-3.5 h-3.5" /> SIGN
            </PadButton>
          )}
          <PadButton onClick={() => void clear()} disabled={disabled || busy}>
            <Eraser className="w-3.5 h-3.5" /> CLEAR
          </PadButton>
          <PadButton onClick={() => void finish()} disabled={!can_done} primary>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}{" "}
            {always_open ? "ACCEPT" : "DONE"}
          </PadButton>
        </div>

        {(error || value || stored_at) && (
          <span className="text-[11px] min-h-4 leading-4">
            {error ? (
              <span className="text-[#B91C1C] inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {error}
              </span>
            ) : value ? (
              <span className="text-[#166534]">
                {hint ?? "Captured"}
                {value.device_source === DEVICE_SOURCE.TOPAZ
                  ? ` · Topaz${value.device_model ? ` ${value.device_model}` : ""}`
                  : " · on screen"}
              </span>
            ) : (
              <span className="text-[#64748B]">Signed {fmtWhen(stored_at)}</span>
            )}
          </span>
        )}
      </div>
    );
  },
);

export default SignatureCapture;

// ---------------------------------------------------------------------------

function TopazChip({
  checking,
  ready,
  label,
  title,
  onRecheck,
  compact,
}: {
  checking: boolean;
  ready: boolean;
  label: string;
  title?: string;
  onRecheck: () => void;
  compact: boolean;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        ready
          ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
          : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
      }`}
    >
      {checking ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-[#16A34A]" : "bg-[#94A3B8]"}`} />
      )}
      {!compact || !ready ? label : "Pad ready"}
      <button
        type="button"
        onClick={onRecheck}
        aria-label="Re-check the Topaz pad"
        title="Re-check the Topaz pad"
        className="ml-0.5 text-[#64748B] hover:text-[#1D4ED8]"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </span>
  );
}

function PadButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-3 py-1 rounded border text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? "border-[#1D4ED8] bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
          : "border-[#CBD5E1] bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
      }`}
    >
      {children}
    </button>
  );
}

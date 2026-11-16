/**
 * Global UI scale.
 *
 * The app renders compact by default: `html { zoom: var(--app-zoom) }` in
 * globals.css (0.75 — the look of browser zoom 75%, while users can still zoom
 * in/out on top of it). Under CSS `zoom`, the browser reports geometry in
 * *viewport* pixels (`getBoundingClientRect`, `clientX/Y`, `innerWidth/Height`)
 * but styles inside the zoomed root are laid out in *layout* pixels, which are
 * multiplied by the zoom. Any code that feeds measured coordinates back into
 * `style.top/left/height` must convert through these helpers, or it lands at
 * 75% of the intended position.
 *
 * Ratio math (`(clientX - rect.left) / rect.width`) needs no conversion —
 * both sides are in viewport pixels.
 */

/** Current root zoom factor (1 when unsupported / not set). */
export function uiZoom(): number {
  if (typeof document === "undefined") return 1;
  const z = parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(z) && z > 0 ? z : 1;
}

/** Convert a viewport-pixel value (clientX, rect.top, …) to layout pixels. */
export function toLayoutPx(viewportPx: number): number {
  return viewportPx / uiZoom();
}

/** Viewport width in layout pixels (use instead of `window.innerWidth` for positioning). */
export function viewportWidth(): number {
  return toLayoutPx(window.innerWidth);
}

/** Viewport height in layout pixels (use instead of `window.innerHeight` for positioning). */
export function viewportHeight(): number {
  return toLayoutPx(window.innerHeight);
}

/** `getBoundingClientRect()` expressed in layout pixels. */
export function layoutRect(el: Element | null | undefined): DOMRect | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  const z = uiZoom();
  return z === 1 ? r : new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z);
}

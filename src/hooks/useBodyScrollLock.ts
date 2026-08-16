import { useEffect } from "react";

/**
 * Freeze the page behind an open overlay (KAN-104).
 *
 * A `fixed inset-0` overlay covers the page but does not stop it scrolling: the
 * wheel, touchpad, and arrow keys still move the document underneath, so the
 * Ledger slid around behind the Balance Statistics popup while the modal stayed
 * put. Locking `body` is the fix.
 *
 * Two details the ad-hoc copies of this effect scattered around the app get
 * wrong, and the reason this lives in one place:
 *
 *  - **Reference counting.** Each copy saves and restores `body.style.overflow`
 *    on its own. When one modal opens another, the inner one restores the value
 *    it captured — `"hidden"` — or the outer one unlocks the page while it is
 *    still showing. A shared counter only touches the DOM on the first lock and
 *    the last release.
 *  - **Scrollbar compensation.** Hiding the overflow removes the scrollbar, and
 *    the page jumps sideways by its width. Padding `body` by the width that was
 *    just removed keeps the layout still.
 *
 * Only `overflow` is set, and only while an overlay is open — the app must never
 * carry a permanent `overflow-x: hidden` on `body`, which breaks `position:
 * sticky` for every header in the app.
 */

let lockCount = 0;
let restoreOverflow = "";
let restorePaddingRight = "";

function lock(): void {
  if (lockCount++ > 0) return;

  const { body, documentElement } = document;
  restoreOverflow = body.style.overflow;
  restorePaddingRight = body.style.paddingRight;

  // Measure before hiding the scrollbar, otherwise the gap reads as 0.
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbarWidth}px`;
  }
}

function release(): void {
  if (lockCount === 0) return;
  if (--lockCount > 0) return;

  document.body.style.overflow = restoreOverflow;
  document.body.style.paddingRight = restorePaddingRight;
}

/**
 * Lock background scrolling while `isOpen` is true. Safe to call from several
 * overlays at once; the page unlocks when the last one closes.
 */
export function useBodyScrollLock(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;
    lock();
    return release;
  }, [isOpen]);
}

export default useBodyScrollLock;

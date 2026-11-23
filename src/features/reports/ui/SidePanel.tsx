// Module side panel (UX-15, 07 §8.5): docked beside the content below the nav (z 40), or as an overlay
// with a scrim and body scroll lock on narrow containers. Escape closes it; focus moves into the panel.
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Docked panels sit beside the content; overlay panels cover it with a scrim (07 §9.8, below 1280 px). */
  mode?: "docked" | "overlay";
  width?: number;
  children: ReactNode;
}

export function SidePanel({ open, onOpenChange, title, mode = "overlay", width = 560, children }: SidePanelProps) {
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  useBodyScrollLock(open && mode === "overlay");

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <>
      {mode === "overlay" && (
        <div
          className="fixed inset-0 top-[var(--app-nav-height)] bg-slate-900/30"
          style={{ zIndex: "var(--rpt-z-panel)" }}
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}
      <aside
        ref={ref}
        tabIndex={-1}
        role={mode === "overlay" ? "dialog" : "complementary"}
        aria-modal={mode === "overlay" ? true : undefined}
        aria-labelledby={titleId}
        className="rpt-side-panel fixed bottom-0 right-0 top-[var(--app-nav-height)] flex max-w-full flex-col border-l border-slate-200 bg-white shadow-xl outline-none"
        style={{ width, zIndex: "var(--rpt-z-panel)" }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-800">
            {title}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            onClick={() => onOpenChange(false)}
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </>
  );
}

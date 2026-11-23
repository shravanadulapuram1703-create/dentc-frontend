// Module popover and tooltip (UX-15, 07 §8.5). Content carries `rpt-layer`, which turns on the popper
// counter-zoom of styles/reports.css (spike S-1 check 5): without it the panel lands at 0.75 × the anchor.
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export interface RptPopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  label?: string;
  children: ReactNode;
}

export function RptPopover({ open, onOpenChange, trigger, side = "bottom", align = "start", label, children }: RptPopoverProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={4}
          collisionPadding={8}
          aria-label={label}
          className="rpt-layer rounded-md border border-slate-200 bg-white p-2 text-sm shadow-lg"
          style={{ zIndex: "var(--rpt-z-popover)" }}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface RptTooltipProps {
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}

/** Needs a Tooltip.Provider above it (RptTooltipProvider at the module root). */
export function RptTooltip({ content, side = "top", children }: RptTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={4}
          collisionPadding={8}
          className="rpt-layer max-w-xs rounded bg-slate-800 px-2 py-1 text-xs text-white shadow"
          style={{ zIndex: "var(--rpt-z-tooltip)" }}
        >
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function RptTooltipProvider({ children }: { children: ReactNode }) {
  return <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>;
}

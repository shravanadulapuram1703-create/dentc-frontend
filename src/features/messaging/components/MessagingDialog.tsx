import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/components/ui/utils";

/**
 * Dialog shell for the messaging module.
 *
 * The shared `ui/dialog` primitive stacks at `z-50`, which renders *behind* the
 * messaging panel (`z-[10000]`) — the dialog would appear clipped by the panel.
 * This shell composes the same Radix primitives at a stacking level above the
 * panel, and lays the body out as a bounded flex column so a long list scrolls
 * internally instead of pushing the header/footer off-screen.
 *
 * Children supply their own sections; use `shrink-0` for fixed header/footer
 * rows and `flex-1 min-h-0 overflow-y-auto` for the scrollable region.
 */
export default function MessagingDialog({
  open,
  onClose,
  title,
  icon,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[10060] bg-black/50",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          // Centering via inline transform: Tailwind v4's `translate` utilities
          // proved unreliable for this module's overlays.
          style={{ transform: "translate(-50%, -50%)" }}
          className={cn(
            "fixed left-1/2 top-1/2 z-[10061]",
            "flex flex-col overflow-hidden",
            "w-[calc(100vw-2rem)] sm:w-full sm:max-w-md max-h-[85vh]",
            "rounded-xl border border-[#E2E8F0] bg-white shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            className,
          )}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E2E8F0] shrink-0">
            {icon}
            <DialogPrimitive.Title className="flex-1 text-base font-bold text-[#1E293B]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Module dialog (UX-15, 07 §8.5): Radix Dialog on the module layer tokens. Not src/components/ui/dialog.tsx,
// which is fixed at z-50 (below the nav would be wrong for a modal here).
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

const SIZES = { sm: "max-w-[420px]", md: "max-w-[640px]", lg: "max-w-[900px]", full: "max-w-[calc(100vw-2rem)]" } as const;

export interface RptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  footer?: ReactNode;
  children: ReactNode;
}

export function RptDialog({ open, onOpenChange, title, description, size = "md", footer, children }: RptDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40" style={{ zIndex: "var(--rpt-z-dialog)" }} />
        <Dialog.Content
          className={`rpt-dialog rpt-layer fixed left-1/2 top-1/2 flex max-h-[calc(var(--vh,1vh)*90)] w-full -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-white shadow-xl ${SIZES[size]}`}
          style={{ zIndex: "var(--rpt-z-dialog)" }}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-800">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-0.5 text-xs text-slate-500">{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

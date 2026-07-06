// Modal chrome for the Report an Issue form. Handles the backdrop, Escape-to-
// close, scroll lock, and building the auto-context once when it opens. The form
// itself lives in ReportIssueForm.
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Bug, X } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { buildTicketContext } from "../lib/environmentContext";
import ReportIssueForm from "./ReportIssueForm";
import type { TicketFormValues, TicketSubmitResult } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: Partial<TicketFormValues>;
  onSubmitted?: (result: TicketSubmitResult) => void;
}

export default function ReportIssueDialog({ open, onClose, prefill, onSubmitted }: Props) {
  const { user, currentOffice, organizations } = useAuth();

  // Resolve the active office's display name from the auth context (no fetch).
  const officeName = useMemo(() => {
    for (const org of organizations) {
      const match = org.offices?.find((o) => o.id === currentOffice);
      if (match) return match.name || match.displayName;
    }
    return currentOffice || null;
  }, [organizations, currentOffice]);

  // Capture context once per open so the timestamp/URL reflect the moment the
  // user started reporting (and the page they were on behind the modal).
  const context = useMemo(
    () =>
      buildTicketContext({
        user_name: user?.name,
        user_id: user?.id,
        user_email: user?.email,
        user_role: user?.role,
        office: officeName,
      }),
    // Rebuild each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Bug className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Report an Issue</h2>
              <p className="text-xs text-white/70">
                We'll capture your context automatically — just tell us what went wrong.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ReportIssueForm
          context={context}
          prefill={prefill}
          onSubmitted={onSubmitted}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}

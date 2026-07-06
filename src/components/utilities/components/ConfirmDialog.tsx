// Confirmation dialog shown before any data-modifying utility runs. Summarizes
// the parameters the operation will use so the user commits deliberately.
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  paramSummary?: { label: string; value: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Run",
  destructive,
  paramSummary,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5" />
            <h2 id="confirm-title" className="text-base font-bold">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onCancel} className="text-white/80 hover:text-white" aria-label="Cancel">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[#475569]">{message}</p>

          {paramSummary && paramSummary.length > 0 && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] divide-y divide-[#E2E8F0]">
              {paramSummary.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-4 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#64748B]">{p.label}</span>
                  <span className="text-sm text-[#1F3A5F] truncate">{p.value}</span>
                </div>
              ))}
            </div>
          )}

          {destructive && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <p className="text-xs text-[#92400E]">
                This operation modifies data. It cannot be undone from here — make sure the parameters above are correct.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 bg-[#F7F9FC] border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-sm font-bold text-[#475569] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-bold text-white ${
              destructive ? "bg-[#D97706] hover:bg-[#B45309]" : "bg-[#3A6EA5] hover:bg-[#2f5a8c]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

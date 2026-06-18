import { type ReactNode } from "react";
import { Loader2, Save, X } from "lucide-react";

// Lightweight centered modal shared by the Medical Setup screens for add/edit forms.

export default function EditorModal({
  title,
  onClose,
  onSave,
  saving,
  saveLabel = "Save",
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl border-2 border-[#E2E8F0] w-full max-w-lg">
        <div className="flex items-center justify-between bg-[#F7F9FC] border-b-2 border-[#E2E8F0] px-5 py-3">
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#1F3A5F]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="flex justify-end gap-2 border-t-2 border-[#E2E8F0] px-5 py-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

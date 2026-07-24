import { Copy, Forward, Trash2, X } from "lucide-react";

/** Action bar shown in place of the header while selecting messages in bulk. */
export default function MultiSelectBar({
  count,
  onForward,
  onCopy,
  onDelete,
  onCancel,
}: {
  count: number;
  onForward: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E2E8F0] bg-[#1F3A5F] text-white">
      <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10" title="Cancel">
        <X className="w-5 h-5" />
      </button>
      <span className="flex-1 text-sm font-semibold">{count} selected</span>
      <button onClick={onCopy} disabled={!count} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40" title="Copy">
        <Copy className="w-5 h-5" />
      </button>
      <button onClick={onForward} disabled={!count} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40" title="Forward">
        <Forward className="w-5 h-5" />
      </button>
      <button onClick={onDelete} disabled={!count} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40" title="Delete for me">
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

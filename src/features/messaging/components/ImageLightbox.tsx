import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { attachmentSrc } from "../messagingService";
import type { Attachment } from "../messagingModel";

/** Full-screen image preview overlay with download + Esc/backdrop close. */
export default function ImageLightbox({
  attachment,
  onClose,
}: {
  attachment: Attachment | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!attachment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [attachment, onClose]);

  if (!attachment) return null;
  const src = attachmentSrc(attachment);

  return (
    <div
      className="fixed inset-0 z-[10050] bg-black/80 flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={src}
          download={attachment.name}
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <img
        src={src}
        alt={attachment.name}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
      />
    </div>
  );
}

import { Download, FileText } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { attachmentSrc } from "../messagingService";
import { formatBytes } from "../lib/time";
import type { Attachment } from "../messagingModel";

/** Renders a message's attachments: images as a thumb grid, files as chips. */
export default function AttachmentView({
  attachments,
  onOpenImage,
  outgoing,
}: {
  attachments: Attachment[];
  onOpenImage: (a: Attachment) => void;
  outgoing: boolean;
}) {
  if (!attachments.length) return null;
  const images = attachments.filter((a) => a.kind === "image");
  const files = attachments.filter((a) => a.kind !== "image");

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1.5",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {images.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpenImage(a)}
              className="block overflow-hidden rounded-lg border border-black/5 focus:outline-none"
            >
              <img
                src={attachmentSrc(a)}
                alt={a.name}
                className="w-full max-h-60 object-cover hover:opacity-95 transition-opacity"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {files.map((a) => (
        <a
          key={a.id}
          href={attachmentSrc(a)}
          download={a.name}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors max-w-xs",
            outgoing
              ? "bg-white/15 border-white/20 hover:bg-white/25 text-white"
              : "bg-[#F7F9FC] border-[#E2E8F0] hover:bg-[#EFF3F9] text-[#1E293B]",
          )}
        >
          <FileText className={cn("w-5 h-5 flex-shrink-0", outgoing ? "text-white" : "text-[#3A6EA5]")} />
          <span className="flex-1 min-w-0">
            <span className="block truncate text-sm font-medium">{a.name}</span>
            <span className={cn("block text-xs", outgoing ? "text-white/70" : "text-[#64748B]")}>
              {formatBytes(a.size)}
            </span>
          </span>
          <Download className={cn("w-4 h-4 flex-shrink-0", outgoing ? "text-white/80" : "text-[#64748B]")} />
        </a>
      ))}
    </div>
  );
}

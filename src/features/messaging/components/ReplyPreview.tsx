import { CornerUpLeft, X } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { ReplyRef } from "../messagingModel";

/** The reply banner shown above the composer while replying. */
export function ReplyBanner({
  reply,
  onCancel,
}: {
  reply: ReplyRef;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-[#EAF1F8] border-l-4 border-[#3A6EA5] rounded-md">
      <CornerUpLeft className="w-4 h-4 text-[#3A6EA5] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#1F3A5F]">Replying to {reply.sender_name}</p>
        <p className="text-xs text-[#64748B] truncate">{reply.preview || "Attachment"}</p>
      </div>
      <button onClick={onCancel} className="p-1 hover:bg-white/60 rounded" title="Cancel reply">
        <X className="w-3.5 h-3.5 text-[#64748B]" />
      </button>
    </div>
  );
}

/** The quoted-message block rendered inside a bubble that is a reply. */
export function QuotedReply({
  reply,
  outgoing,
}: {
  reply: ReplyRef;
  outgoing: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-1.5 pl-2 border-l-2 rounded-sm py-0.5",
        outgoing ? "border-white/60" : "border-[#3A6EA5]",
      )}
    >
      <p className={cn("text-xs font-semibold", outgoing ? "text-white/90" : "text-[#1F3A5F]")}>
        {reply.sender_name}
      </p>
      <p className={cn("text-xs truncate", outgoing ? "text-white/70" : "text-[#64748B]")}>
        {reply.preview || "Attachment"}
      </p>
    </div>
  );
}

import { cn } from "@/components/ui/utils";
import type { Reaction } from "../messagingModel";

/** Row of reaction pills under a message; highlights ones you've added. */
export default function ReactionBar({
  reactions,
  meId,
  onToggle,
  align = "start",
}: {
  reactions: Reaction[];
  meId: string;
  onToggle: (emoji: string) => void;
  align?: "start" | "end";
}) {
  if (!reactions.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", align === "end" ? "justify-end" : "justify-start")}>
      {reactions.map((r) => {
        const mine = r.user_ids.includes(meId);
        return (
          <button
            key={r.emoji}
            onClick={() => onToggle(r.emoji)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
              mine
                ? "bg-[#EAF1F8] border-[#3A6EA5] text-[#1F3A5F]"
                : "bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]",
            )}
            title={mine ? "You reacted" : `${r.user_ids.length} reaction${r.user_ids.length > 1 ? "s" : ""}`}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            <span className="font-semibold tabular-nums">{r.user_ids.length}</span>
          </button>
        );
      })}
    </div>
  );
}

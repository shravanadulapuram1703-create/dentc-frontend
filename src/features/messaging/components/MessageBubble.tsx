import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Check,
  Copy,
  CornerUpLeft,
  Forward,
  MoreVertical,
  Pencil,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import type { ChatUser, DirectMessage } from "../messagingModel";
import { formatClock } from "../lib/time";
import DeliveryTicks from "./DeliveryTicks";
import ReactionBar from "./ReactionBar";
import EmojiPicker from "./EmojiPicker";
import AttachmentView from "./AttachmentView";
import UserAvatar from "./UserAvatar";
import { QuotedReply } from "./ReplyPreview";
import { QUICK_REACTIONS } from "../lib/emojiData";

export interface MessageBubbleProps {
  message: DirectMessage;
  meId: string;
  peer: ChatUser;
  showAvatarSpace: boolean;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onReply: (m: DirectMessage) => void;
  onForward: (m: DirectMessage) => void;
  onReact: (id: string, emoji: string) => void;
  onEdit: (m: DirectMessage) => void;
  onDelete: (m: DirectMessage, forEveryone: boolean) => void;
  onOpenImage: (a: DirectMessage["attachments"][number]) => void;
}

const MD = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className="mb-1 last:mb-0 break-words" {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc list-inside mb-1 space-y-0.5" {...props} />,
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal list-inside mb-1 space-y-0.5" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className="font-bold" {...props} />,
  em: (props: React.HTMLAttributes<HTMLElement>) => <em className="italic" {...props} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  code: ({ inline, ...props }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) =>
    inline ? (
      <code className="px-1 py-0.5 rounded bg-black/10 text-[0.85em] font-mono" {...props} />
    ) : (
      <code className="block p-2 rounded bg-black/10 text-[0.85em] font-mono overflow-x-auto my-1" {...props} />
    ),
};

export default function MessageBubble({
  message,
  meId,
  peer,
  showAvatarSpace,
  selecting,
  selected,
  onToggleSelect,
  onReply,
  onForward,
  onReact,
  onEdit,
  onDelete,
  onOpenImage,
}: MessageBubbleProps) {
  const outgoing = message.sender_id === meId;
  const deleted = message.deleted_for_everyone;
  const [menuOpen, setMenuOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const canEdit = outgoing && !deleted && message.body.trim().length > 0;

  return (
    <div
      className={cn(
        "group flex items-end gap-2 px-1",
        outgoing ? "flex-row-reverse" : "flex-row",
        selecting && "cursor-pointer",
      )}
      onClick={selecting ? () => onToggleSelect(message.id) : undefined}
    >
      {/* selection checkbox */}
      {selecting && (
        <span
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
            selected ? "bg-[#3A6EA5] border-[#3A6EA5]" : "border-[#CBD5E1] bg-white",
          )}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </span>
      )}

      {/* avatar gutter (incoming only; avatar sits at the bottom of a group) */}
      {!outgoing && (
        <div className="w-8 flex-shrink-0 self-end">
          {showAvatarSpace ? <UserAvatar user={peer} size="sm" /> : null}
        </div>
      )}

      <div className={cn("max-w-[78%] min-w-0 flex flex-col", outgoing ? "items-end" : "items-start")}>
        {/* hover action toolbar */}
        {!selecting && !deleted && (
          <div
            className={cn(
              "flex items-center gap-0.5 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
              outgoing ? "flex-row-reverse" : "flex-row",
            )}
          >
            <EmojiPicker
              align={outgoing ? "end" : "start"}
              onPick={(e) => onReact(message.id, e)}
              trigger={
                <button className="p-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#3A6EA5] shadow-sm" title="React">
                  <SmilePlus className="w-3.5 h-3.5" />
                </button>
              }
            />
            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#3A6EA5] shadow-sm"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {/* quick reactions */}
            <div className="hidden sm:flex items-center gap-0.5">
              {QUICK_REACTIONS.slice(0, 4).map((e) => (
                <button
                  key={e}
                  onClick={() => onReact(message.id, e)}
                  className="w-7 h-7 rounded-full bg-white border border-[#E2E8F0] shadow-sm hover:bg-[#F1F5F9] text-sm leading-none"
                >
                  {e}
                </button>
              ))}
            </div>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#3A6EA5] shadow-sm" title="More">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={outgoing ? "end" : "start"} className="w-44">
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="w-4 h-4 mr-2" /> Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onForward(message)}>
                  <Forward className="w-4 h-4 mr-2" /> Forward
                </DropdownMenuItem>
                {message.body.trim() && (
                  <DropdownMenuItem onClick={copy}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onToggleSelect(message.id)}>
                  <Check className="w-4 h-4 mr-2" /> Select
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(message)}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {outgoing && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message, true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete for everyone
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(message, false)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete for me
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* the bubble */}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 shadow-sm text-sm",
            outgoing
              ? "bg-[#3A6EA5] text-white rounded-br-sm"
              : "bg-white text-[#1E293B] border border-[#E2E8F0] rounded-bl-sm",
            selected && "ring-2 ring-[#3A6EA5] ring-offset-1",
          )}
        >
          {message.forwarded_from && !deleted && (
            <p className={cn("flex items-center gap-1 text-[11px] italic mb-1", outgoing ? "text-white/70" : "text-[#94A3B8]")}>
              <CornerUpLeft className="w-3 h-3" /> Forwarded from {message.forwarded_from}
            </p>
          )}

          {message.reply_to && !deleted && (
            <QuotedReply reply={message.reply_to} outgoing={outgoing} />
          )}

          {deleted ? (
            <p className={cn("italic text-sm", outgoing ? "text-white/80" : "text-[#94A3B8]")}>
              This message was deleted
            </p>
          ) : (
            <>
              {message.attachments.length > 0 && (
                <div className={cn(message.body ? "mb-1.5" : "")}>
                  <AttachmentView
                    attachments={message.attachments}
                    onOpenImage={onOpenImage}
                    outgoing={outgoing}
                  />
                </div>
              )}
              {message.body && (
                <div className={cn("leading-relaxed", outgoing ? "[&_a]:text-white" : "[&_a]:text-[#3A6EA5]")}>
                  <ReactMarkdown components={MD as never}>{message.body}</ReactMarkdown>
                </div>
              )}
            </>
          )}

          {/* meta row */}
          <div
            className={cn(
              "flex items-center gap-1 mt-0.5 text-[11px]",
              outgoing ? "justify-end text-white/70" : "justify-end text-[#94A3B8]",
            )}
          >
            {message.simulated && (
              <span
                className={cn("mr-auto italic", outgoing ? "text-white/60" : "text-[#94A3B8]")}
                title="Simulated reply — no messaging backend exists yet"
              >
                demo
              </span>
            )}
            {message.edited_at && !deleted && <span>edited</span>}
            <span>{formatClock(message.created_at)}</span>
            {outgoing && !deleted && <DeliveryTicks status={message.status} />}
          </div>
        </div>

        {/* reactions */}
        {!deleted && (
          <ReactionBar
            reactions={message.reactions}
            meId={meId}
            onToggle={(e) => onReact(message.id, e)}
            align={outgoing ? "end" : "start"}
          />
        )}
      </div>
    </div>
  );
}

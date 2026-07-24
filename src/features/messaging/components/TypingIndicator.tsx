import UserAvatar from "./UserAvatar";
import type { ChatUser } from "../messagingModel";

/** Animated three-dot "peer is typing…" bubble. */
export default function TypingIndicator({ peer }: { peer: ChatUser }) {
  return (
    <div className="flex items-end gap-2">
      <UserAvatar user={peer} size="sm" />
      <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm">
        <span className="flex items-center gap-1">
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-[#94A3B8] animate-bounce"
      style={{ animationDelay: delay, animationDuration: "1s" }}
    />
  );
}

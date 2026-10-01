import { MessageSquare } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useChat } from "@/contexts/ChatContext";

/**
 * Header launcher for the messaging panel. Lives in the GlobalNav top bar next
 * to the AppointNow bell (it used to be a floating bottom-right FAB, which sat
 * on top of page footers and action buttons). Shows a live unread badge and a
 * pressed state while the slide-in panel is open.
 */
export default function ChatLauncher() {
  const { isOpen, togglePanel, unreadTotal } = useChat();

  return (
    <button
      type="button"
      onClick={togglePanel}
      aria-label={isOpen ? "Close messages" : "Open messages"}
      aria-pressed={isOpen}
      title="Messages"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all backdrop-blur-sm",
        isOpen
          ? "bg-white text-[#1F3A5F] border-white shadow-inner"
          : "bg-white/10 hover:bg-white/20 border-white/30 text-white",
      )}
    >
      <MessageSquare className="w-5 h-5" strokeWidth={2} />
      {unreadTotal > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[11px] font-bold text-white shadow">
          {unreadTotal > 99 ? "99+" : unreadTotal}
        </span>
      )}
    </button>
  );
}

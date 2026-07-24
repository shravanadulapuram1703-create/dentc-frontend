import { MessageSquare } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useChat } from "@/contexts/ChatContext";

/**
 * Floating launcher for the messaging panel (replaces the old AI chat button).
 * Shows a live unread badge and hides itself while the panel is open.
 */
export default function ChatLauncher() {
  const { isOpen, togglePanel, unreadTotal } = useChat();

  return (
    <button
      onClick={togglePanel}
      aria-label="Open messages"
      title="Messages"
      className={cn(
        "fixed bottom-6 right-6 z-[9998] w-14 h-14 sm:w-16 sm:h-16 rounded-full",
        "bg-gradient-to-br from-[#3A6EA5] to-[#1F3A5F] shadow-lg hover:shadow-xl",
        "flex items-center justify-center group transition-all duration-300 ease-in-out",
        isOpen ? "scale-90 opacity-0 pointer-events-none" : "scale-100 opacity-100 hover:scale-110",
      )}
    >
      <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" strokeWidth={2.3} />
      {unreadTotal > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 bg-[#EF4444] text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-white">
          {unreadTotal > 99 ? "99+" : unreadTotal}
        </span>
      )}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full bg-[#3A6EA5] animate-ping opacity-20" />
      )}
    </button>
  );
}

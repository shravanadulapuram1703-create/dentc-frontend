import { Loader2, MessagesSquare } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useChat } from "@/contexts/ChatContext";
import ConversationList from "./ConversationList";
import ConversationView from "./ConversationView";

/**
 * The slide-in messaging panel: a two-pane (conversation list + thread) surface
 * that overlays the app from the right, mirroring the old AI chat footprint but
 * widened for real DMs. Collapses to a single pane below `lg`.
 */
export default function ChatPanel() {
  const {
    isOpen,
    isExpanded,
    toggleExpanded,
    closePanel,
    activeConversationId,
    setActiveConversation,
    ready,
  } = useChat();

  return (
    <>
      {/* mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/30 lg:hidden"
          onClick={closePanel}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 z-[10000] flex bg-white shadow-2xl border-l border-[#E2E8F0]",
          "w-full sm:w-[420px]",
          isExpanded ? "lg:w-[960px]" : "lg:w-[720px]",
          !isOpen && "pointer-events-none",
        )}
        style={{ right: isOpen ? 0 : -1200, transition: "right 300ms ease-in-out" }}
        aria-hidden={!isOpen}
      >
        {isOpen && (
          <>
            {/* left rail */}
            <div
              className={cn(
                "flex-col w-full lg:w-[320px] flex-shrink-0 border-r border-[#E2E8F0]",
                activeConversationId ? "hidden lg:flex" : "flex",
              )}
            >
              <ConversationList
                activeConversationId={activeConversationId}
                onSelect={setActiveConversation}
                onClose={closePanel}
              />
            </div>

            {/* thread pane */}
            <div
              className={cn(
                "flex-1 flex-col min-w-0",
                activeConversationId ? "flex" : "hidden lg:flex",
              )}
            >
              {!ready ? (
                <div className="flex-1 flex items-center justify-center bg-[#F7F9FC]">
                  <Loader2 className="w-6 h-6 text-[#3A6EA5] animate-spin" />
                </div>
              ) : activeConversationId ? (
                <ConversationView
                  conversationId={activeConversationId}
                  onBack={() => setActiveConversation(null)}
                  onClose={closePanel}
                  onToggleExpand={toggleExpanded}
                  isExpanded={isExpanded}
                  onDeleted={() => setActiveConversation(null)}
                />
              ) : (
                <EmptyThread />
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function EmptyThread() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F9FC] px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#EAF1F8] flex items-center justify-center mb-4">
        <MessagesSquare className="w-8 h-8 text-[#3A6EA5]" />
      </div>
      <h3 className="text-lg font-bold text-[#1E293B]">Your messages</h3>
      <p className="text-sm text-[#64748B] mt-1 max-w-xs">
        Select a conversation on the left, or start a new message to chat with anyone in your organization.
      </p>
    </div>
  );
}

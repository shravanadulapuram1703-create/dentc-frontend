import { Loader2, MessagesSquare } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useChat } from "@/contexts/ChatContext";
import ConversationList from "./components/ConversationList";
import ConversationView from "./components/ConversationView";

interface MessagesPageProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

/**
 * Full-page messaging experience at /messages — the roomy two-pane layout for
 * desktop, sharing the same transport/state as the floating panel. Collapses to
 * a single pane on tablet/mobile.
 */
export default function MessagesPage({
  onLogout,
  currentOffice,
  setCurrentOffice,
}: MessagesPageProps) {
  const { activeConversationId, setActiveConversation, ready } = useChat();

  return (
    <AppShell onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
      <div className="h-[calc(100dvh-var(--app-nav-height,64px))] bg-[#F7F9FC]">
        <div className="h-full max-w-[1600px] mx-auto flex bg-white lg:border-x border-[#E2E8F0]">
          {/* left rail */}
          <div
            className={`flex-col w-full md:w-[340px] flex-shrink-0 border-r border-[#E2E8F0] ${
              activeConversationId ? "hidden md:flex" : "flex"
            }`}
          >
            <ConversationList activeConversationId={activeConversationId} onSelect={setActiveConversation} />
          </div>

          {/* thread pane */}
          <div className={`flex-1 flex-col min-w-0 ${activeConversationId ? "flex" : "hidden md:flex"}`}>
            {!ready ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#3A6EA5] animate-spin" />
              </div>
            ) : activeConversationId ? (
              <ConversationView
                conversationId={activeConversationId}
                onBack={() => setActiveConversation(null)}
                onDeleted={() => setActiveConversation(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#EAF1F8] flex items-center justify-center mb-4">
                  <MessagesSquare className="w-8 h-8 text-[#3A6EA5]" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B]">Select a conversation</h3>
                <p className="text-sm text-[#64748B] mt-1 max-w-sm">
                  Choose a conversation from the list, or start a new message to chat with a colleague.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

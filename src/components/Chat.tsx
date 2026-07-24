import { useAuth } from "../contexts/AuthContext";
import ChatLauncher from "../features/messaging/components/ChatLauncher";
import ChatPanel from "../features/messaging/components/ChatPanel";

/**
 * App-wide Direct Messaging surface: the floating launcher + slide-in panel.
 * Replaces the former AI chat assistant. Only mounts for authenticated users
 * (the ChatProvider that feeds it wraps the router in App.tsx).
 */
export default function Chat() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return (
    <>
      <ChatLauncher />
      <ChatPanel />
    </>
  );
}

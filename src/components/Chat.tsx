import { useAuth } from "../contexts/AuthContext";
import ChatPanel from "../features/messaging/components/ChatPanel";

/**
 * App-wide Direct Messaging surface: the slide-in panel. The launcher button
 * lives in the GlobalNav top bar (see ChatLauncher). Only mounts for
 * authenticated users (the ChatProvider that feeds it wraps the router in App.tsx).
 */
export default function Chat() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <ChatPanel />;
}

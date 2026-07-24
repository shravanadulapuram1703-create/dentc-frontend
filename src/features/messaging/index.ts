// Public surface of the Direct Messaging feature.

export { default as MessagesPage } from "./MessagesPage";
export { default as ChatLauncher } from "./components/ChatLauncher";
export { default as ChatPanel } from "./components/ChatPanel";
export { default as ConversationView } from "./components/ConversationView";
export { default as ConversationList } from "./components/ConversationList";

export { useConversations } from "./hooks/useConversations";
export { useConversation } from "./hooks/useConversation";
export { usePresence, usePresenceMap } from "./hooks/usePresence";
export { useUserDirectory } from "./hooks/useUserDirectory";

export {
  getMessagingTransport,
  fetchDirectory,
  fileToAttachment,
  USE_REAL_BACKEND,
} from "./messagingService";

export type {
  ChatUser,
  Conversation,
  DirectMessage,
  Attachment,
  Reaction,
  DeliveryStatus,
  PresenceStatus,
  ReplyRef,
} from "./messagingModel";

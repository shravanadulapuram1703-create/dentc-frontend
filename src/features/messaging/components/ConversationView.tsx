import { useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/contexts/ChatContext";
import {
  messagePreview,
  type Attachment,
  type ChatUser,
  type DirectMessage,
  type ReplyRef,
} from "../messagingModel";
import { useConversation } from "../hooks/useConversation";
import ConversationHeader from "./ConversationHeader";
import MultiSelectBar from "./MultiSelectBar";
import MessageThread from "./MessageThread";
import MessageComposer, { type ComposerHandle } from "./MessageComposer";
import ForwardDialog from "./ForwardDialog";
import ImageLightbox from "./ImageLightbox";

interface ConversationViewProps {
  conversationId: string;
  onBack?: () => void;
  onClose?: () => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  onDeleted?: () => void;
}

/**
 * A full conversation experience — header, message thread, composer, multi-select
 * bulk actions, forward, drag-and-drop upload, and image lightbox. Shared by the
 * slide-in panel and the full-page /messages route.
 */
export default function ConversationView({
  conversationId,
  onBack,
  onClose,
  onToggleExpand,
  isExpanded,
  onDeleted,
}: ConversationViewProps) {
  const { me, conversations, transport, prefs } = useChat();
  const conversation = conversations.find((c) => c.id === conversationId);
  const convo = useConversation(conversationId);
  const composerRef = useRef<ComposerHandle>(null);

  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [editing, setEditing] = useState<DirectMessage | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [pendingForward, setPendingForward] = useState<DirectMessage[]>([]);
  const [dragging, setDragging] = useState(false);

  const senderName = (m: DirectMessage): string =>
    me && m.sender_id === me.id ? me.name : conversation?.peer.name ?? "Unknown";

  const buildReplyRef = (m: DirectMessage): ReplyRef => ({
    message_id: m.id,
    sender_id: m.sender_id,
    sender_name: senderName(m),
    preview: messagePreview(m),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startSelect = (seedId?: string) => {
    setSelecting(true);
    setSelectedIds(seedId ? new Set([seedId]) : new Set());
  };
  const cancelSelect = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const selectedMessages = useMemo(
    () => convo.messages.filter((m) => selectedIds.has(m.id)),
    [convo.messages, selectedIds],
  );

  const bulkCopy = async () => {
    const text = selectedMessages.map((m) => m.body).filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${selectedMessages.length} message${selectedMessages.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Copy failed");
    }
    cancelSelect();
  };

  const bulkDelete = async () => {
    for (const m of selectedMessages) await convo.remove(m.id, false);
    toast.success("Deleted");
    cancelSelect();
  };

  const openForward = (messages: DirectMessage[]) => {
    setPendingForward(messages);
    setForwardOpen(true);
  };

  const doForward = async (peer: ChatUser) => {
    const target = await transport.getOrCreateConversation(peer);
    for (const m of pendingForward) {
      await transport.sendMessage({
        conversation_id: target.id,
        body: m.body,
        attachments: m.attachments,
        forwarded_from: senderName(m),
      });
    }
    toast.success(`Forwarded to ${peer.name}`);
    setForwardOpen(false);
    setPendingForward([]);
    cancelSelect();
  };

  const attachmentsEnabled = transport.supportsAttachments;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!attachmentsEnabled) return;
    if (e.dataTransfer.files?.length) composerRef.current?.addFiles(e.dataTransfer.files);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F9FC]">
        <Loader2 className="w-6 h-6 text-[#3A6EA5] animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full min-h-0 relative"
      onDragOver={(e) => {
        if (!attachmentsEnabled) return;
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {selecting ? (
        <MultiSelectBar
          count={selectedIds.size}
          onForward={() => openForward(selectedMessages)}
          onCopy={bulkCopy}
          onDelete={bulkDelete}
          onCancel={cancelSelect}
        />
      ) : (
        <ConversationHeader
          conversation={conversation}
          onBack={onBack}
          onClose={onClose}
          onToggleExpand={onToggleExpand}
          isExpanded={isExpanded}
          onStartSelect={() => startSelect()}
          onDeleted={() => onDeleted?.()}
        />
      )}

      <MessageThread
        messages={convo.messages}
        meId={me?.id ?? ""}
        peer={conversation.peer}
        loading={convo.loading}
        loadingOlder={convo.loadingOlder}
        hasMore={convo.hasMore}
        peerTyping={convo.peerTyping}
        loadOlder={convo.loadOlder}
        selecting={selecting}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onReply={(m) => {
          setEditing(null);
          setReplyTo(buildReplyRef(m));
          composerRef.current?.focus();
        }}
        onForward={(m) => openForward([m])}
        onReact={convo.react}
        onEdit={(m) => {
          setReplyTo(null);
          setEditing(m);
        }}
        onDelete={(m, forEveryone) => convo.remove(m.id, forEveryone)}
        onOpenImage={setLightbox}
      />

      <MessageComposer
        ref={composerRef}
        disabled={conversation.blocked}
        disabledReason={`You blocked ${conversation.peer.name}. Unblock from the menu to message them.`}
        attachmentsEnabled={attachmentsEnabled}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSend={(body, attachments) =>
          convo.send(body, { attachments, replyTo, forwardedFrom: null }).then(() => setReplyTo(null))
        }
        onSaveEdit={(id, body) => convo.edit(id, body)}
        onTyping={convo.notifyTyping}
        enterToSend={prefs.enter_to_send}
        initialDraft={conversation.draft ?? ""}
        onDraftChange={(text) => transport.saveDraft(conversation.id, text)}
      />

      {/* drag-and-drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-20 bg-[#3A6EA5]/10 border-2 border-dashed border-[#3A6EA5] rounded-lg flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-[#3A6EA5]">
            <Upload className="w-8 h-8" />
            <p className="text-sm font-semibold">Drop files to attach</p>
          </div>
        </div>
      )}

      <ForwardDialog
        open={forwardOpen}
        count={pendingForward.length}
        onClose={() => {
          setForwardOpen(false);
          setPendingForward([]);
        }}
        onPick={doForward}
      />
      <ImageLightbox attachment={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

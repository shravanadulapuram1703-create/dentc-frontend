import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Bold,
  Italic,
  List,
  Paperclip,
  Pencil,
  Send,
  Smile,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import type { Attachment, DirectMessage, ReplyRef } from "../messagingModel";
import { fileToAttachment, attachmentSrc } from "../messagingService";
import { formatBytes } from "../lib/time";
import EmojiPicker from "./EmojiPicker";
import { ReplyBanner } from "./ReplyPreview";

export interface ComposerHandle {
  addFiles: (files: FileList | File[]) => void;
  focus: () => void;
}

interface MessageComposerProps {
  disabled?: boolean;
  disabledReason?: string;
  /** When false the attach button is hidden (backend can't store files yet). */
  attachmentsEnabled?: boolean;
  replyTo: ReplyRef | null;
  onCancelReply: () => void;
  editing: DirectMessage | null;
  onCancelEdit: () => void;
  onSend: (body: string, attachments: Attachment[]) => void | Promise<void>;
  onSaveEdit: (id: string, body: string) => void | Promise<void>;
  onTyping: () => void;
  enterToSend: boolean;
  initialDraft?: string;
  onDraftChange?: (text: string) => void;
}

const MessageComposer = forwardRef<ComposerHandle, MessageComposerProps>(
  function MessageComposer(
    {
      disabled,
      disabledReason,
      attachmentsEnabled = true,
      replyTo,
      onCancelReply,
      editing,
      onCancelEdit,
      onSend,
      onSaveEdit,
      onTyping,
      enterToSend,
      initialDraft = "",
      onDraftChange,
    },
    ref,
  ) {
    const [text, setText] = useState(initialDraft);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [busy, setBusy] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Prefill when entering edit mode; clear when leaving it.
    useEffect(() => {
      if (editing) {
        setText(editing.body);
        setAttachments([]);
        textareaRef.current?.focus();
      }
    }, [editing]);

    // Reset the draft text when the conversation changes.
    useEffect(() => {
      if (!editing) setText(initialDraft);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDraft]);

    const addFiles = async (files: FileList | File[]) => {
      if (!attachmentsEnabled) {
        toast.error("Attachments aren't available yet", {
          description: "File sharing is pending backend support (MSG-6).",
        });
        return;
      }
      const arr = Array.from(files);
      for (const f of arr) {
        const res = await fileToAttachment(f);
        if (res.ok && res.attachment) {
          setAttachments((prev) => [...prev, res.attachment!]);
        } else {
          toast.error(res.error || "Attachment failed");
        }
      }
    };

    useImperativeHandle(ref, () => ({
      addFiles,
      focus: () => textareaRef.current?.focus(),
    }));

    const autoGrow = () => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    };
    useEffect(autoGrow, [text]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      onDraftChange?.(e.target.value);
      onTyping();
    };

    const submit = async () => {
      const body = text.trim();
      if ((!body && attachments.length === 0) || busy) return;
      setBusy(true);
      try {
        if (editing) {
          await onSaveEdit(editing.id, body);
          onCancelEdit();
        } else {
          await onSend(body, attachments);
        }
        setText("");
        setAttachments([]);
        onDraftChange?.("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      } finally {
        setBusy(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const wantsSend = enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
      if (e.key === "Enter" && wantsSend) {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") {
        if (editing) onCancelEdit();
        else if (replyTo) onCancelReply();
      }
    };

    // Wrap the current selection with markdown markers.
    const wrapSelection = (before: string, after: string, linePrefix?: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = text.slice(start, end);
      let next: string;
      let caret: number;
      if (linePrefix) {
        const insert = selected
          ? selected
              .split("\n")
              .map((l) => `${linePrefix}${l}`)
              .join("\n")
          : `${linePrefix}`;
        next = text.slice(0, start) + insert + text.slice(end);
        caret = start + insert.length;
      } else {
        next = text.slice(0, start) + before + selected + after + text.slice(end);
        caret = start + before.length + selected.length + after.length;
      }
      setText(next);
      onDraftChange?.(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    };

    const insertEmoji = (emoji: string) => {
      const el = textareaRef.current;
      const pos = el?.selectionStart ?? text.length;
      const next = text.slice(0, pos) + emoji + text.slice(pos);
      setText(next);
      onDraftChange?.(next);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(pos + emoji.length, pos + emoji.length);
      });
    };

    if (disabled) {
      return (
        <div className="border-t border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3 text-center text-sm text-[#64748B]">
          {disabledReason || "You can't send messages in this conversation."}
        </div>
      );
    }

    return (
      <div className="border-t border-[#E2E8F0] bg-white px-3 py-2.5">
        {editing && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-[#FEF3C7]/60 border-l-4 border-[#F59E0B] rounded-md">
            <Pencil className="w-4 h-4 text-[#D97706]" />
            <span className="flex-1 text-xs font-semibold text-[#92400E]">Editing message</span>
            <button onClick={onCancelEdit} className="p-1 hover:bg-white/60 rounded" title="Cancel edit">
              <X className="w-3.5 h-3.5 text-[#92400E]" />
            </button>
          </div>
        )}

        {replyTo && !editing && (
          <div className="mb-2">
            <ReplyBanner reply={replyTo} onCancel={onCancelReply} />
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="relative group flex items-center gap-2 px-2 py-1.5 bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg"
              >
                {a.kind === "image" ? (
                  <img src={attachmentSrc(a)} alt={a.name} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <Paperclip className="w-5 h-5 text-[#3A6EA5]" />
                )}
                <div className="min-w-0 max-w-[140px]">
                  <p className="text-xs font-medium text-[#1E293B] truncate">{a.name}</p>
                  <p className="text-[11px] text-[#64748B]">{formatBytes(a.size)}</p>
                </div>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  className="p-1 rounded-full hover:bg-[#E2E8F0]"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* formatting toolbar */}
        <div className="flex items-center gap-0.5 mb-1.5">
          <ToolbarBtn title="Bold" onClick={() => wrapSelection("**", "**")}>
            <Bold className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Italic" onClick={() => wrapSelection("_", "_")}>
            <Italic className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn title="List" onClick={() => wrapSelection("", "", "- ")}>
            <List className="w-4 h-4" />
          </ToolbarBtn>
          <div className="w-px h-5 bg-[#E2E8F0] mx-1" />
          <EmojiPicker
            align="start"
            onPick={insertEmoji}
            trigger={
              <button className="p-1.5 rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#3A6EA5] transition-colors" title="Emoji">
                <Smile className="w-4 h-4" />
              </button>
            }
          />
          {attachmentsEnabled && (
            <>
              <ToolbarBtn title="Attach file" onClick={() => fileRef.current?.click()}>
                <Paperclip className="w-4 h-4" />
              </ToolbarBtn>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Type a message…"
            className="flex-1 resize-none px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 max-h-40"
          />
          <button
            onClick={submit}
            disabled={busy || (!text.trim() && attachments.length === 0)}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              "bg-[#3A6EA5] text-white hover:bg-[#2f5a8c] disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            title={editing ? "Save (Enter)" : "Send (Enter)"}
          >
            {editing ? <Pencil className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-[#94A3B8]">
          {enterToSend ? "Enter to send · Shift+Enter for newline" : "Ctrl+Enter to send"} ·
          Markdown supported
        </p>
      </div>
    );
  },
);

function ToolbarBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#3A6EA5] transition-colors"
    >
      {children}
    </button>
  );
}

export default MessageComposer;

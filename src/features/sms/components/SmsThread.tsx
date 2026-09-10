import { Fragment, useEffect, useRef } from "react";
import { MessageSquareDashed } from "lucide-react";
import type { SmsEntry } from "../smsModel";
import { fmtDayLabel, sameDay } from "../smsFormat";
import SmsBubble from "./SmsBubble";

interface SmsThreadProps {
  entries: SmsEntry[];
  loading: boolean;
  selectedKey: string | null;
  onSelect: (entry: SmsEntry) => void;
  onRetry: (entry: SmsEntry) => void;
  onDismiss: (entry: SmsEntry) => void;
  onMarkRead: (entry: SmsEntry) => void;
  emptyHint: string;
}

export default function SmsThread({
  entries,
  loading,
  selectedKey,
  onSelect,
  onRetry,
  onDismiss,
  onMarkRead,
  emptyHint,
}: SmsThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastKey = entries[entries.length - 1]?.key;
  const count = entries.length;

  // Stick to the bottom whenever a new entry lands (or the list first loads).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lastKey, count, loading]);

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={i % 2 ? "flex justify-end" : "flex justify-start"}>
            <div className="h-12 w-2/5 animate-pulse rounded-2xl bg-slate-200/70" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-slate-500">
        <MessageSquareDashed className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">No text messages yet</p>
        <p className="max-w-xs text-xs">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
      {entries.map((e, i) => {
        const prev = entries[i - 1];
        const showDay = !prev || !sameDay(prev.at, e.at);
        return (
          <Fragment key={e.key}>
            {showDay && (
              <div className="my-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-slate-500">
                  {fmtDayLabel(e.at)}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            )}
            <SmsBubble
              entry={e}
              selected={e.key === selectedKey}
              onSelect={onSelect}
              onRetry={onRetry}
              onDismiss={onDismiss}
              onMarkRead={onMarkRead}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
